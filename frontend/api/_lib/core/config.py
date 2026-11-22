"""Runtime configuration, read once from environment variables (see frontend/.env.example)."""

from __future__ import annotations

import hashlib
import os
from pathlib import Path
from dataclasses import dataclass
from functools import lru_cache


def _load_dotenv() -> None:
    """Read frontend/.env for local development (Next.js loads it for the web app; uvicorn does not)."""
    path = Path(__file__).resolve().parents[3] / ".env"
    if not path.is_file():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


_load_dotenv()


def _env(name: str, default: str = "") -> str:
    return os.environ.get(name, default).strip().strip('"')


@dataclass(frozen=True)
class Settings:
    database_url: str
    database_url_var: str
    session_secret: str
    session_secret_source: str
    google_client_id: str
    gemini_api_key: str
    gemini_model: str
    impossibl_api_key: str
    impossibl_api_url: str
    environment: str
    admin_emails: frozenset[str]
    public_url: str
    session_ttl_hours: int = 72
    mesh_token_ttl_minutes: int = 240

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @property
    def is_local(self) -> bool:
        """Local development: elevated roles are auto-verified so every console is explorable."""
        return self.environment == "development"


# Connection-string variables in the order they are tried. Vercel's Neon integration names them after the
# prefix chosen when the database is connected (DATABASE_URL by default, DB_URL for the prefix "DB", …).
DATABASE_URL_VARS = ("DATABASE_URL", "DB_URL", "POSTGRES_URL", "DB_POSTGRES_URL", "DATABASE_POSTGRES_URL",
                     "NEON_DATABASE_URL", "DATABASE_URL_UNPOOLED", "DB_URL_UNPOOLED")
DEV_SECRET = "volentify-local-development-secret-change-me"


def database_url_and_source() -> tuple[str, str]:
    for name in DATABASE_URL_VARS:
        value = _env(name)
        if value:
            return value, name
    return "", ""


def session_secret_and_source(environment: str, database_url: str) -> tuple[str, str]:
    """The key that signs sessions, mesh tokens and muster passes.

    NEXTAUTH_SECRET is preferred. Without it, a key is derived from the database connection string (itself a
    secret) so a deployment never breaks because the variable was removed; middleware.ts derives the same key.
    """
    explicit = _env("NEXTAUTH_SECRET") or _env("SESSION_SECRET")
    if explicit:
        return explicit, "NEXTAUTH_SECRET"
    if database_url:
        return hashlib.sha256(f"volentify-session-v1|{database_url}".encode()).hexdigest(), "derived"
    if environment == "development":
        return DEV_SECRET, "development"
    return "", "missing"


def _public_url(environment: str) -> str:
    """Site origin for OAuth redirects. A localhost NEXTAUTH_URL copied into a deployment is ignored."""
    url = _env("NEXTAUTH_URL").rstrip("/")
    if environment != "development" and any(h in url for h in ("localhost", "127.0.0.1", "[::1]")):
        url = ""
    if not url and _env("VERCEL_ENV") == "production" and _env("VERCEL_PROJECT_PRODUCTION_URL"):
        url = "https://" + _env("VERCEL_PROJECT_PRODUCTION_URL")
    return url


@lru_cache
def get_settings() -> Settings:
    environment = _env("VERCEL_ENV") or _env("VOLENTIFY_ENV", "development")
    database_url, database_url_var = database_url_and_source()
    secret, secret_source = session_secret_and_source(environment, database_url)
    return Settings(
        database_url=database_url,
        database_url_var=database_url_var,
        session_secret=secret,
        session_secret_source=secret_source,
        google_client_id=_env("GOOGLE_CLIENT_ID") or _env("NEXT_PUBLIC_GOOGLE_CLIENT_ID"),
        gemini_api_key=_env("GEMINI_API_KEY"),
        gemini_model=_env("GEMINI_MODEL", "gemini-3.5-flash"),  # measured fastest reliable Flash, Nov 2026
        impossibl_api_key=_env("IMPOSSIBL_API_KEY"),
        impossibl_api_url=_env("IMPOSSIBL_API_URL", "https://api.impossibl.com/v1/triage"),
        environment=environment,
        admin_emails=frozenset(e.strip().lower() for e in _env("VOLENTIFY_ADMIN_EMAILS").split(",") if e.strip()),
        public_url=_public_url(environment),
    )
