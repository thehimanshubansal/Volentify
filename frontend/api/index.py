"""Volentify API — FastAPI application.

Local:      uvicorn api.index:app --reload --port 8000   (run from frontend/)
Production: Vercel Python serverless function; vercel.json rewrites /api/* here.
"""

import os
import re
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from urllib.parse import urlsplit  # noqa: E402

from fastapi import FastAPI, Request  # noqa: E402
from fastapi.exceptions import RequestValidationError  # noqa: E402
from fastapi.responses import JSONResponse  # noqa: E402

from api._lib.core import db  # noqa: E402
from api._lib.core.config import get_settings  # noqa: E402
from api._lib.core.security import RateLimiter, client_key, current_claims  # noqa: E402
from api._lib.engines import gemini, live, surge, triage  # noqa: E402
from api._lib.routers import auth, entities, intelligence, mesh, research  # noqa: E402

VERSION = "3.5.0"
_probe_limiter = RateLimiter(limit=20, window_s=3600)

app = FastAPI(title="Volentify Disaster Intelligence API", version=VERSION,
              docs_url="/api/docs", openapi_url="/api/openapi.json", redoc_url=None)

for module in (auth, entities, mesh, intelligence, research):
    app.include_router(module.router)


# ─── Request guard: scanners, scraping, cross-site requests, oversized bodies ─

# Vulnerability scanners and brute-forcers announce themselves; ordinary clients (browsers, phones, curl) don't match.
SCANNER_AGENTS = ("sqlmap", "nikto", "nmap", "masscan", "zgrab", "nuclei", "wpscan", "dirbuster", "gobuster", "ffuf",
                  "feroxbuster", "acunetix", "netsparker", "havij", "w3af", "hydra", "jorgee", "openvas", "nessus",
                  "arachni", "skipfish", "commix")
# Bulk scrapers and AI-training crawlers: also refused in robots.txt; this enforces it for the API.
SCRAPER_AGENTS = ("gptbot", "ccbot", "claudebot", "anthropic-ai", "bytespider", "amazonbot", "meta-externalagent",
                  "diffbot", "cohere-ai", "omgilibot", "imagesiftbot", "ahrefsbot", "semrushbot", "mj12bot", "dotbot",
                  "petalbot", "dataforseobot", "blexbot", "scrapy", "httrack")
# Endpoints that call third parties or do heavy work get a much smaller allowance per address.
HEAVY_PREFIXES = ("/api/resources", "/api/analytics/history", "/api/transparency", "/api/briefing", "/api/predict",
                  "/api/triage", "/api/events/ingest", "/api/match", "/api/infrastructure", "/api/research/export")
MAX_BODY_BYTES = 1_000_000  # the largest legitimate body is a 100-event mesh batch (≈ 400 KB)
_general_limiter = RateLimiter(limit=600, window_s=60)
_heavy_limiter = RateLimiter(limit=60, window_s=60)
STATE_CHANGING = {"POST", "PUT", "PATCH", "DELETE"}


def _deny(status_code: int, detail: str, retry: int | None = None) -> JSONResponse:
    return JSONResponse(status_code=status_code, content={"detail": detail},
                        headers={"Retry-After": str(retry)} if retry else None)


def _is_admin(request: Request) -> bool:
    claims = current_claims(request) or {}
    return claims.get("role") == "INCIDENT_ADMIN" and bool(claims.get("verified"))


def _same_site(request: Request, origin: str) -> bool:
    host = urlsplit(origin).netloc.lower()
    allowed = {h.lower() for h in (request.headers.get("x-forwarded-host"), request.headers.get("host")) if h}
    public = get_settings().public_url
    if public:
        allowed.add(urlsplit(public).netloc.lower())
    return host in allowed


@app.middleware("http")
async def request_guard(request: Request, call_next):
    path = request.url.path
    agent = request.headers.get("user-agent", "").lower()
    if any(a in agent for a in SCANNER_AGENTS) or any(a in agent for a in SCRAPER_AGENTS):
        return _deny(403, "Automated access to this service is not permitted")
    length = request.headers.get("content-length", "")
    if length.isdigit() and int(length) > MAX_BODY_BYTES:
        return _deny(413, "Request body too large")
    if path.startswith(("/api/docs", "/api/openapi.json")) and get_settings().is_production and not _is_admin(request):
        # The interactive API map is a reconnaissance gift: administrators only on the live site.
        return _deny(404, "Not Found")
    ip = client_key(request)
    heavy = path.startswith(HEAVY_PREFIXES) or (path == "/api/health" and "deep" in request.url.query)
    if not _general_limiter.allow(ip) or (heavy and not _heavy_limiter.allow(ip)):
        return _deny(429, "Too many requests — retry shortly", 60)
    # Cross-site request forgery: a browser on another site cannot make state-changing calls with a visitor's
    # session. Phones and scripts send no Origin header and are unaffected; local development is exempt.
    origin = request.headers.get("origin")
    if request.method in STATE_CHANGING and origin and not get_settings().is_local and not _same_site(request, origin):
        return _deny(403, "Cross-site request refused")

    response = await call_next(request)
    headers = response.headers
    headers.setdefault("X-Content-Type-Options", "nosniff")
    headers.setdefault("X-Frame-Options", "DENY")
    headers.setdefault("Referrer-Policy", "no-referrer")
    headers.setdefault("X-Robots-Tag", "noindex, nofollow")
    headers.setdefault("Cross-Origin-Resource-Policy", "same-origin")
    if not path.startswith(("/api/docs", "/api/openapi.json")):  # Swagger UI loads its own scripts and styles
        headers.setdefault("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'")
    if get_settings().is_production:
        headers.setdefault("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload")
    private = path.startswith(("/api/auth", "/api/admin", "/api/volunteers/me", "/api/mesh/token")) or "mine=" in request.url.query
    if private or "set-cookie" in headers:
        headers["Cache-Control"] = "no-store"
    return response


@app.exception_handler(RequestValidationError)
async def validation_error(_: Request, exc: RequestValidationError):
    """Flatten pydantic errors into one readable sentence plus field details."""
    errors = exc.errors()
    first = errors[0] if errors else {}
    field = ".".join(str(p) for p in first.get("loc", [])[1:]) or "request"
    message = str(first.get("msg", "Invalid request")).removeprefix("Value error, ")
    return JSONResponse(status_code=422, content={"detail": f"{field}: {message}", "errors": [
        {"field": ".".join(str(p) for p in e.get("loc", [])[1:]), "message": e.get("msg")} for e in errors]})


@app.get("/api/health")
def health(request: Request, deep: bool = False, gemini_model: str | None = None):
    started = time.perf_counter()
    surge.predict({"lat": 19.81, "lng": 85.83, "wind_speed": 140.0, "rainfall_mm": 250.0})
    triage.deterministic("flood people trapped need boat")
    inference_ms = round((time.perf_counter() - started) * 1000, 3)
    database = db.database_status()
    body = {
        "status": "ONLINE",
        "system": "VOLENTIFY DISASTER INTELLIGENCE PLATFORM",
        "version": VERSION,
        "database": database,
        "ml_inference": "ONLINE",
        "inference_selftest_ms": inference_ms,
    }
    body["live_feeds"] = live.last_sync()
    claims = current_claims(request) or {}
    if not (claims.get("role") == "INCIDENT_ADMIN" and claims.get("verified")):
        # Configuration details help an attacker more than a visitor: administrators only.
        return body
    if database == "DEGRADED":
        body["database_error"] = db.last_error()
    settings = get_settings()
    # Which variables the deployment is actually using — names and sources only, never values.
    body["configuration"] = {
        "database_variable": settings.database_url_var or None,
        "session_key": settings.session_secret_source,
        "google_sign_in": bool(settings.google_client_id),
        "gemini": bool(settings.gemini_api_key),
        "public_url": settings.public_url or None,
    }
    if deep:
        if gemini_model:
            _probe_limiter.check("gemini-probe")
            if not re.fullmatch(r"[a-z0-9.\-]{3,60}", gemini_model):
                gemini_model = None
        body["gemini"] = gemini.probe(gemini_model)
    return body
