"""Authentication & role-adaptive onboarding (PRD §8)."""

from __future__ import annotations

import secrets
from typing import Optional
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import RedirectResponse

from ..core import audit, db
from ..core.config import get_settings
from ..core.security import (
    ELEVATED_ROLES, NONCE_COOKIE, ROLE_PASS, SESSION_COOKIE, RateLimiter, client_key, durable_hits, hash_password,
    issue_session,
    muster_code, muster_signature, require_roles, require_session, session_cookie_kwargs, verify_google_id_token,
    verify_password,
)
from ..data.regulators import RESERVED_DOMAIN
from ..schemas import (
    AuthResponse, GoogleAuthRequest, LoginRequest, OnboardRequest, PasswordChange, RegisterRequest, RoleUpdate, User,
)
from .common import new_id, now, tag

router = APIRouter(prefix="/api", tags=["auth"])
_login_limiter = RateLimiter(limit=10, window_s=60)

# Shared by every API instance (PostgreSQL), so spreading guesses across serverless instances doesn't help.
LOCKOUT_WINDOW_S = 15 * 60
MAX_FAILED_PER_ACCOUNT = 8      # wrong passwords for one account, then it is locked for the window
MAX_ATTEMPTS_PER_ADDRESS = 40   # sign-in attempts from one network address in the window
MAX_SIGNUPS_PER_ADDRESS = 10    # new accounts from one network address per hour


def _too_many(detail: str, retry_s: int) -> HTTPException:
    return HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, detail, headers={"Retry-After": str(retry_s)})
STATE_COOKIE = "volentify_oauth_state"


def to_user(row: dict) -> User:
    muster = None
    if row.get("muster_code") and row.get("muster_issued_at"):
        prefix_title = ROLE_PASS[row["role"]][1]
        muster = {"code": row["muster_code"], "title": prefix_title, "role": row["role"], "holder": row["name"],
                  "issued_at": row["muster_issued_at"],
                  "signature": muster_signature(row["id"], row["muster_code"], row["muster_issued_at"])}
    return User.model_validate({**row, "profile_data": row.get("profile_data") or {}, "muster": muster})


def is_regulator(row: Optional[dict]) -> bool:
    return bool(row and (row.get("profile_data") or {}).get("regulator"))


def needs_onboarding(row: dict) -> bool:
    if is_regulator(row):  # provisioned accounts: no wizard, and no way to pick a different role through it
        return False
    phone = row.get("phone") or ""
    return not row.get("onboarded") or len(phone) != 10


def _start_session(response: Response, row: dict) -> AuthResponse:
    response.set_cookie(SESSION_COOKIE, issue_session(row), **session_cookie_kwargs())
    return AuthResponse(user=to_user(row), requires_onboarding=needs_onboarding(row))


def _auto_verify(email: str, provider: str) -> bool:
    """VOLENTIFY_ADMIN_EMAILS elevates only Google sign-ins, whose email ownership Google has verified.

    Credential sign-up does not prove the address belongs to the person typing it, so an allowlisted address
    registered with a password stays an ordinary account until an administrator verifies it.
    """
    settings = get_settings()
    return provider == "google" and email.lower() in settings.admin_emails


def _reserved(email: str) -> bool:
    return email.lower().rsplit("@", 1)[-1] == RESERVED_DOMAIN


def _blank_user(name: str, email: str, provider: str, **extra) -> dict:
    ts = now()
    admin = _auto_verify(email, provider)
    return {"id": new_id("usr"), "name": name, "email": email.lower(), "phone": "", "password_hash": None,
            "role": "INCIDENT_ADMIN" if admin else "CITIZEN", "state_district": None, "lat": None, "lng": None,
            "provider": provider, "google_id": None, "avatar_url": None, "blood_group": None,
            "emergency_contact": None, "is_verified": admin, "onboarded": False, "org_id": None,
            "profile_data": {}, "muster_code": None, "muster_issued_at": None, "created_at": ts, "updated_at": ts,
            **extra}


# ─── Google OAuth 2.0 (OpenID Connect implicit id_token flow) ───────────────

def _request_origin(request: Request) -> str:
    host = request.headers.get("x-forwarded-host") or request.headers.get("host")
    proto = request.headers.get("x-forwarded-proto") or request.url.scheme
    return f"{proto}://{host}" if host else str(request.base_url).rstrip("/")


@router.get("/auth/google/start", include_in_schema=False)
def google_start(request: Request, next: str = "/dashboard"):
    settings = get_settings()
    if not settings.google_client_id:
        return RedirectResponse("/login?error=google_unconfigured", status_code=302)
    origin = settings.public_url or _request_origin(request)
    nonce, state = secrets.token_urlsafe(24), secrets.token_urlsafe(16)
    params = {"client_id": settings.google_client_id, "redirect_uri": f"{origin}/auth/callback",
              "response_type": "id_token", "scope": "openid email profile", "nonce": nonce,
              "state": f"{state}.{next if next.startswith('/') else '/dashboard'}", "prompt": "select_account"}
    resp = RedirectResponse("https://accounts.google.com/o/oauth2/v2/auth?" + urlencode(params), status_code=302)
    cookie = {"httponly": True, "secure": settings.is_production, "samesite": "lax", "max_age": 600, "path": "/"}
    resp.set_cookie(NONCE_COOKIE, nonce, **cookie)
    resp.set_cookie(STATE_COOKIE, state, **cookie)
    return resp


@router.post("/auth/google", response_model=AuthResponse, response_model_by_alias=True)
def google_login(body: GoogleAuthRequest, request: Request, response: Response):
    _login_limiter.check(client_key(request))
    expected_state = request.cookies.get(STATE_COOKIE)
    if not body.state or not expected_state or not secrets.compare_digest(body.state.split(".")[0], expected_state):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Sign-in request expired — please try again")
    claims = verify_google_id_token(body.id_token, request.cookies.get(NONCE_COOKIE))
    google_id, email = claims["sub"], claims["email"].lower()

    def upsert(store):
        row = store.get_user_by_google(google_id) or store.get_user_by_email(email)
        if row:
            return store.update_user(row["id"], {"google_id": google_id, "avatar_url": claims.get("picture"),
                                                  "provider": "google"})
        return store.create_user(_blank_user(claims.get("name") or email.split("@")[0], email, "google",
                                             google_id=google_id, avatar_url=claims.get("picture")))

    row, source = db.write(upsert)
    tag(response, source)
    response.delete_cookie(NONCE_COOKIE, path="/")
    response.delete_cookie(STATE_COOKIE, path="/")
    return _start_session(response, row)


# ─── Credentials ────────────────────────────────────────────────────────────

@router.post("/auth/register", response_model=AuthResponse, response_model_by_alias=True,
             status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest, request: Request, response: Response):
    _login_limiter.check(client_key(request))
    if body.website:  # honeypot filled in: an automated sign-up
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Request rejected")
    if durable_hits(f"signup-ip:{client_key(request)}", 3600) > MAX_SIGNUPS_PER_ADDRESS:
        raise _too_many("Too many new accounts from this network — try again later", 3600)
    if _reserved(body.email):
        raise HTTPException(status.HTTP_403_FORBIDDEN, f"@{RESERVED_DOMAIN} addresses are reserved for platform staff")
    user = _blank_user(body.name.strip(), body.email, "credentials", password_hash=hash_password(body.password))
    try:
        row, source = db.write(lambda s: s.create_user(user))
    except ValueError:
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists")
    tag(response, source)
    return _start_session(response, row)


@router.post("/auth/login", response_model=AuthResponse, response_model_by_alias=True)
def login(body: LoginRequest, request: Request, response: Response):
    _login_limiter.check(client_key(request))
    email = body.email.strip().lower()
    if durable_hits(f"login-ip:{client_key(request)}", LOCKOUT_WINDOW_S) > MAX_ATTEMPTS_PER_ADDRESS:
        raise _too_many("Too many sign-in attempts from this network — try again in 15 minutes", LOCKOUT_WINDOW_S)
    if durable_hits(f"login-fail:{email}", LOCKOUT_WINDOW_S, increment=False) >= MAX_FAILED_PER_ACCOUNT:
        raise _too_many("Too many wrong passwords for this account — it is locked for 15 minutes", LOCKOUT_WINDOW_S)
    row, source = db.read(lambda s: s.get_user_by_email(email))
    if not row or not verify_password(body.password, row.get("password_hash")):
        failures = durable_hits(f"login-fail:{email}", LOCKOUT_WINDOW_S)
        if row and failures == MAX_FAILED_PER_ACCOUNT:
            audit.record("auth.lockout", {"sub": row["id"], "email": row["email"], "role": row["role"]},
                         target_type="user", target_id=row["id"], request=request,
                         detail={"failed_attempts": failures, "window_minutes": LOCKOUT_WINDOW_S // 60})
        if row and row.get("role") in ELEVATED_ROLES:
            audit.record("auth.login_failed", {"sub": row["id"], "email": row["email"], "role": row["role"]},
                         target_type="user", target_id=row["id"], request=request)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Email or password is incorrect")
    tag(response, source)
    if row.get("role") in ELEVATED_ROLES:
        audit.record("auth.login", {"sub": row["id"], "email": row["email"], "role": row["role"]},
                     target_type="user", target_id=row["id"], request=request)
    return _start_session(response, row)


@router.post("/auth/password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(body: PasswordChange, request: Request, claims: dict = Depends(require_session)):
    _login_limiter.check(client_key(request))
    if durable_hits(f"login-fail:{claims['email']}", LOCKOUT_WINDOW_S, increment=False) >= MAX_FAILED_PER_ACCOUNT:
        raise _too_many("Too many wrong passwords for this account — try again in 15 minutes", LOCKOUT_WINDOW_S)
    row, _ = db.read(lambda s: s.get_user(claims["sub"]))
    if not row or not verify_password(body.current_password, row.get("password_hash")):
        durable_hits(f"login-fail:{claims['email']}", LOCKOUT_WINDOW_S)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Your current password is incorrect")
    if body.new_password == body.current_password:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Choose a password you have not used here before")
    profile = {**(row.get("profile_data") or {}), "must_change_password": False}
    db.write(lambda s: s.update_user(row["id"], {"password_hash": hash_password(body.new_password),
                                                 "profile_data": profile}))
    audit.record("auth.password_change", claims, target_type="user", target_id=row["id"], request=request)


@router.post("/auth/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response):
    response.delete_cookie(SESSION_COOKIE, path="/")


@router.get("/auth/me", response_model=AuthResponse, response_model_by_alias=True)
def me(response: Response, claims: dict = Depends(require_session)):
    row, source = db.read(lambda s: s.get_user(claims["sub"]))
    if not row:
        response.delete_cookie(SESSION_COOKIE, path="/")
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Session expired")
    tag(response, source)
    return AuthResponse(user=to_user(row), requires_onboarding=needs_onboarding(row))


# ─── Onboarding wizard → digital muster pass ────────────────────────────────

@router.post("/auth/onboard", response_model=AuthResponse, response_model_by_alias=True)
def onboard(body: OnboardRequest, response: Response, claims: dict = Depends(require_session)):
    settings = get_settings()
    issued = now()

    def apply(store):
        row = store.get_user(claims["sub"])
        if not row:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Session expired")
        role = "INCIDENT_ADMIN" if is_regulator(row) else body.role
        elevated = role in ELEVATED_ROLES
        verified = (row["is_verified"] and role == row["role"]) or not elevated or settings.is_local \
            or _auto_verify(row["email"], row.get("provider") or "credentials")
        code = muster_code(row["id"], role)
        profile = {**body.profile, **{k: v for k, v in (row.get("profile_data") or {}).items()
                                      if k in {"regulator", "title", "must_change_password"}}}
        updated = store.update_user(row["id"], {
            "phone": body.phone, "role": role, "state_district": body.state_district,
            "lat": body.lat, "lng": body.lng, "blood_group": body.blood_group,
            "emergency_contact": body.emergency_contact, "profile_data": profile, "onboarded": True,
            "is_verified": verified, "muster_code": code, "muster_issued_at": issued,
        })
        if role == "VOLUNTEER":
            store.upsert_volunteer_profile(row["id"], {
                "skills": body.skills, "equipment": body.equipment,
                "lat": body.lat if body.lat is not None else 20.59,
                "lng": body.lng if body.lng is not None else 78.96,
                "location_name": body.state_district,
            })
        return updated

    row, source = db.write(apply)
    tag(response, source)
    return _start_session(response, row)


# ─── Administration ─────────────────────────────────────────────────────────

@router.get("/admin/users", response_model=list[User])
def list_users(response: Response, _: dict = Depends(require_roles("INCIDENT_ADMIN"))):
    rows, source = db.read(lambda s: s.list_users())
    tag(response, source)
    return [to_user(r) for r in rows]


@router.patch("/admin/users/{user_id}", response_model=User)
def update_user(user_id: str, body: RoleUpdate, request: Request, response: Response,
                claims: dict = Depends(require_roles("INCIDENT_ADMIN"))):
    if user_id == claims["sub"] and body.role != "INCIDENT_ADMIN":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "You cannot remove your own administrator role")
    fields: dict[str, Optional[object]] = {"role": body.role}
    if body.is_verified is not None:
        fields["is_verified"] = body.is_verified

    def update(store):
        target = store.get_user(user_id)
        if not target:
            return None, None
        if is_regulator(target) and not is_regulator(store.get_user(claims["sub"])):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Only platform regulators can change a regulator account")
        return target, store.update_user(user_id, fields)

    (before, row), source = db.write(update)
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    tag(response, source)
    audit.record("admin.user_update", claims, target_type="user", target_id=user_id, request=request,
                 detail={"role": [before["role"], row["role"]], "verified": [before["is_verified"], row["is_verified"]]})
    return to_user(row)


@router.get("/admin/audit")
def audit_log(response: Response, limit: int = 200, action: Optional[str] = None, actor: Optional[str] = None,
              _: dict = Depends(require_roles("INCIDENT_ADMIN"))):
    """Audit trail for regulation and monitoring, newest first."""
    limit = max(1, min(limit, 1000))
    rows, source = db.read(lambda s: s.list_audit(limit, action, actor))
    tag(response, source)
    return rows


@router.get("/admin/audit/verify")
def audit_verify(response: Response, _: dict = Depends(require_roles("INCIDENT_ADMIN"))):
    """Re-compute the hash chain over the most recent 5,000 entries; reports the first altered or missing entry."""
    rows, source = db.read(lambda s: s.list_audit(5000))
    tag(response, source)
    return audit.verify_chain(list(reversed(rows)))
