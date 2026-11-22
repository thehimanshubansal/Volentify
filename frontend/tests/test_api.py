"""API acceptance tests (PRD §14). Run from frontend/: python -m pytest tests -q"""

import json
import sys
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.path.insert(0, str(Path(__file__).resolve().parent))

from api._lib.core import db  # noqa: E402
from api._lib.core.config import get_settings  # noqa: E402
from api._lib.engines import dispatch, surge, triage  # noqa: E402
from api._lib.routers import auth, entities, mesh  # noqa: E402
from api.index import app  # noqa: E402
import fixtures  # noqa: E402


@pytest.fixture(autouse=True)
def clean_state(monkeypatch):
    from api._lib.core.config import DATABASE_URL_VARS
    for name in DATABASE_URL_VARS:
        monkeypatch.delenv(name, raising=False)
    monkeypatch.setenv("VOLENTIFY_ENV", "test")
    monkeypatch.setenv("NEXTAUTH_SECRET", "test-secret-that-is-at-least-32-bytes-long")
    monkeypatch.setenv("VOLENTIFY_ADMIN_EMAILS", "chief@ndrf.gov.in")
    monkeypatch.setenv("VOLENTIFY_OFFLINE", "1")  # no outbound feed calls from tests
    get_settings.cache_clear()
    db.MEMORY.reset()
    db.MEMORY.load(fixtures.DATASET)  # fictional test dataset — the app itself ships none
    db._state["down_until"] = 0.0
    db._pg = None
    import api.index as api_index
    for limiter in (auth._login_limiter, entities._report_limiter, mesh._ingest_limiter, mesh._public_ingest_limiter,
                    api_index._general_limiter, api_index._heavy_limiter, entities._review_limiter,
                    mesh._broadcast_limiter, mesh._downlink_limiter):
        limiter._hits.clear()
    yield
    get_settings.cache_clear()


@pytest.fixture
def client():
    return TestClient(app)


def signup(client, email, role="VOLUNTEER", skills=("Boat Rescue",)):
    r = client.post("/api/auth/register", json={"name": "Test User", "email": email, "password": "s3cure-pass!"})
    assert r.status_code == 201, r.text
    assert r.json()["requiresOnboarding"] is True
    r = client.post("/api/auth/onboard", json={
        "phone": "+91 98765 43210", "role": role, "state_district": "Puri, Odisha", "lat": 19.81, "lng": 85.83,
        "skills": list(skills), "profile": {"blood_group": "O+"}})
    assert r.status_code == 200, r.text
    return r.json()["user"]


def command(client, email="chief@ndrf.gov.in", role="INCIDENT_ADMIN"):
    """A verified command account: sign up, have an administrator verify it, sign in again for fresh claims."""
    user = signup(client, email, role=role)
    db.MEMORY.update_user(user["id"], {"role": role, "is_verified": True})
    assert client.post("/api/auth/login", json={"email": email, "password": "s3cure-pass!"}).status_code == 200
    return user


def admin_session(client):
    """Sign the client in as a verified administrator directly (works in production mode, where cookies are Secure)."""
    from api._lib.core.security import SESSION_COOKIE, issue_session
    token = issue_session({"id": "usr_test_admin", "email": "admin@test.invalid", "name": "Admin", "role": "INCIDENT_ADMIN",
                           "onboarded": True, "is_verified": True})
    client.cookies.set(SESSION_COOKIE, token)


def mesh_event(**over):
    base = {"event_id": str(uuid.uuid4()), "origin_node_id": str(uuid.uuid4()), "disaster_id": "dis_remal_puri",
            "type": "PERSON_TRAPPED", "priority": "CRITICAL", "payload": {"count": 4},
            "lat": 19.81, "lng": 85.83, "observed_at": datetime.now(timezone.utc).isoformat(),
            "hop_count": 2, "ttl": 3}
    base.update(over)
    return base


# ─── health & entities ──────────────────────────────────────────────────────

def test_health_reports_fallback_without_database(client):
    body = client.get("/api/health").json()
    assert body["status"] == "ONLINE" and body["database"] == "FALLBACK"


def test_entity_lists_serve_fallback_dataset(client):
    for path in ("/api/disasters", "/api/tasks", "/api/alerts", "/api/volunteers", "/api/organizations"):
        r = client.get(path)
        assert r.status_code == 200 and len(r.json()) > 0, path
        assert r.headers["X-Data-Source"] == "memory"


def test_disaster_dossier_and_briefing(client):
    dossier = client.get("/api/disasters/CYC-2026-REMAL").json()
    assert dossier["disaster"]["id"] == "dis_remal_puri" and dossier["evidence"] and dossier["tasks"]
    brief = client.get("/api/disasters/dis_remal_puri/briefing").json()
    assert brief["conflicting_count"] >= 1 and brief["supporting_count"] >= 3
    assert len(brief["brief"].split()) <= 151


# ─── auth & onboarding ──────────────────────────────────────────────────────

def test_register_onboard_issues_muster_pass(client):
    user = signup(client, "asha@example.org")
    assert user["onboarded"] and user["phone"] == "9876543210"
    assert user["muster"]["code"].startswith("TAC-VOL-")
    me = client.get("/api/auth/me").json()
    assert me["requiresOnboarding"] is False
    assert client.get("/api/volunteers/me").json()["skills"] == ["Boat Rescue"]


def test_onboarding_rejects_invalid_phone(client):
    client.post("/api/auth/register", json={"name": "X Y", "email": "x@example.org", "password": "s3cure-pass!"})
    r = client.post("/api/auth/onboard", json={"phone": "12345", "role": "CITIZEN", "state_district": "Delhi"})
    assert r.status_code == 422 and "10-digit" in r.json()["detail"]


def test_login_wrong_password(client):
    signup(client, "b@example.org")
    assert client.post("/api/auth/login", json={"email": "b@example.org", "password": "nope-nope"}).status_code == 401
    assert client.post("/api/auth/login", json={"email": "b@example.org", "password": "s3cure-pass!"}).status_code == 200


def test_elevated_roles_need_verification(client):
    signup(client, "ngo@example.org", role="NGO_MEMBER")
    r = client.post("/api/tasks", json={"title": "Pack kits", "required_skill": "Manual Packing", "lat": 20.2,
                                        "lng": 86.6, "disaster_id": "dis_remal_puri"})
    assert r.status_code == 403 and "verification" in r.json()["detail"]


def test_rbac_blocks_citizen_broadcast(client):
    signup(client, "c@example.org", role="CITIZEN")
    r = client.post("/api/alerts", json={"title": "Test alert", "category": "Flood", "location": "Puri",
                                         "state": "Odisha", "description": "Testing broadcast", "advisory": "Stay safe now"})
    assert r.status_code == 403


def test_allowlisted_email_is_not_elevated_by_password_signup(client):
    """Credential sign-up doesn't prove email ownership, so VOLENTIFY_ADMIN_EMAILS only elevates Google sign-ins."""
    user = signup(client, "chief@ndrf.gov.in", role="INCIDENT_ADMIN")
    assert user["role"] == "INCIDENT_ADMIN" and user["is_verified"] is False
    r = client.post("/api/alerts", json={"title": "Evacuate now", "category": "Cyclone", "level": "CRITICAL",
                                         "location": "Puri", "state": "Odisha", "description": "Surge expected",
                                         "advisory": "Move to shelters"})
    assert r.status_code == 403


def test_verified_command_can_broadcast(client):
    command(client)
    r = client.post("/api/alerts", json={"title": "Evacuate now", "category": "Cyclone", "level": "CRITICAL",
                                         "location": "Puri", "state": "Odisha", "description": "Surge expected",
                                         "advisory": "Move to shelters"})
    assert r.status_code == 201 and r.json()["code"].startswith("ALT-")


# ─── mesh (AT-06 … AT-09) ───────────────────────────────────────────────────

def gateway(client):
    signup(client, f"gw-{uuid.uuid4().hex[:6]}@example.org")
    return {"Authorization": f"Bearer {client.post('/api/mesh/token').json()['token']}"}


def test_ingest_accepts_phones_without_token_but_rejects_bad_tokens(client):
    """Any phone that reaches the internet uploads; a token is optional, but a bad one is refused."""
    batch = {"gateway_node_id": str(uuid.uuid4()), "events": [mesh_event(disaster_id=None)]}
    r = client.post("/api/mesh/ingest", json=batch)
    assert r.status_code == 200 and r.json()["accepted_count"] == 1
    bad = client.post("/api/mesh/ingest", json=batch, headers={"Authorization": "Bearer nope"})
    assert bad.status_code == 401


def test_ingested_reports_become_incident_evidence(client):
    """A report without an incident is linked to the active incident it falls inside and joins its timeline."""
    ev = mesh_event(disaster_id=None, type="FLOOD", priority="HIGH", lat=19.85, lng=85.8,
                    payload={"notes": "Water entering houses near the embankment", "needs": ["boats"]})
    r = client.post("/api/mesh/ingest", json={"gateway_node_id": str(uuid.uuid4()), "events": [ev]})
    assert r.status_code == 200
    stored = next(e for e in client.get("/api/mesh/events").json() if e["event_id"] == ev["event_id"])
    assert stored["disaster_id"] == "dis_remal_puri"
    evidence = client.get("/api/disasters/dis_remal_puri").json()["evidence"]
    mesh = [e for e in evidence if e["source"] == "Volentify Mesh"]
    assert mesh and "Water entering houses" in mesh[0]["claim_text"] and mesh[0]["source_type"] == "CITIZEN"
    trapped = mesh_event(disaster_id=None, lat=19.85, lng=85.8, payload={"count": 4, "notes": "Ravi's family, 2nd floor"})
    client.post("/api/mesh/ingest", json={"gateway_node_id": str(uuid.uuid4()), "events": [trapped]})
    texts = [e["claim_text"] for e in client.get("/api/disasters/dis_remal_puri").json()["evidence"]]
    assert not any("Ravi" in t for t in texts) and any("1–5 people" in t for t in texts)


def test_ingest_is_idempotent(client):
    headers = gateway(client)
    batch = {"gateway_node_id": str(uuid.uuid4()), "events": [mesh_event(), mesh_event(priority="LOW")]}
    first = client.post("/api/mesh/ingest", json=batch, headers=headers).json()
    assert first["accepted_count"] == 2 and first["duplicate_count"] == 0 and first["persistence"] == "volatile"
    replay = client.post("/api/mesh/ingest", json=batch, headers=headers).json()
    assert replay["accepted_count"] == 0 and replay["duplicate_count"] == 2


@pytest.mark.parametrize("override", [
    {"payload": {"blob": "x" * 5000}}, {"ttl": 6}, {"lat": 19.8, "lng": None}, {"lat": 120.0},
    {"type": "ALIEN_INVASION"}, {"priority": "URGENT"},
])
def test_ingest_validation(client, override):
    headers = gateway(client)
    r = client.post("/api/mesh/ingest", json={"gateway_node_id": str(uuid.uuid4()),
                                              "events": [mesh_event(**override)]}, headers=headers)
    assert r.status_code == 422


def test_ingest_batch_limit(client):
    headers = gateway(client)
    r = client.post("/api/mesh/ingest", json={"gateway_node_id": str(uuid.uuid4()),
                                              "events": [mesh_event() for _ in range(101)]}, headers=headers)
    assert r.status_code == 422


def test_null_gps_is_accepted(client):
    headers = gateway(client)
    r = client.post("/api/mesh/ingest", json={"gateway_node_id": str(uuid.uuid4()),
                                              "events": [mesh_event(lat=None, lng=None)]}, headers=headers)
    assert r.status_code == 200 and r.json()["accepted_count"] == 1


def test_events_redacted_for_public(client):
    events = client.get("/api/mesh/events").json()
    trapped = next(e for e in events if e["type"] == "PERSON_TRAPPED")
    assert trapped["payload"].get("redacted") is True


def test_events_filters_and_nodes(client):
    crit = client.get("/api/mesh/events", params={"priority": "CRITICAL"}).json()
    assert crit and all(e["priority"] == "CRITICAL" for e in crit)
    nodes = client.get("/api/mesh/nodes").json()
    assert any(n["active"] for n in nodes) and any(not n["active"] for n in nodes)
    incidents = client.get("/api/mesh/incidents").json()
    assert incidents and len(incidents[0]["bbox"]) == 4


def test_admin_promotes_mesh_report(client):
    command(client)
    event_id = "d4a1b8c2-3e5f-4a7b-9c1d-2e4f6a8b0c2e"
    r = client.patch(f"/api/mesh/events/{event_id}", json={"action": "PROMOTE"})
    assert r.status_code == 200 and r.json()["review_status"] == "PROMOTED"
    task_id = r.json()["promoted_task_id"]
    assert any(t["id"] == task_id for t in client.get("/api/tasks").json())


def test_ingest_refuses_volatile_ack_when_database_down(client, monkeypatch):
    headers = gateway(client)
    monkeypatch.setenv("DATABASE_URL", "postgresql://u:p@127.0.0.1:1/none?pgbouncer=true")
    get_settings.cache_clear()
    db._pg = None
    r = client.post("/api/mesh/ingest", json={"gateway_node_id": str(uuid.uuid4()), "events": [mesh_event()]},
                    headers=headers)
    assert r.status_code == 503 and r.headers["Retry-After"] == "30"
    reads = client.get("/api/disasters")
    assert reads.status_code == 200 and reads.headers["X-Data-Source"] == "fallback"
    assert client.get("/api/health").json()["database"] == "DEGRADED"


# ─── engines ────────────────────────────────────────────────────────────────

def test_dispatch_protects_rare_specialists(client):
    result = client.post("/api/match/dispatch-batch").json()
    assert result["latency_ms"] < 50 and result["tasks_evaluated"] > 0
    by_task = {}
    for a in result["assignments"]:
        by_task.setdefault(a["task_code"], []).append(a)
    # Critical boat rescue goes to boat specialists, and specialists are never spent on kit packing
    # while generic responders are available.
    packing = by_task.get("TSK-003", [])
    # Signed-out visitors see first names and initials only.
    assert packing and all(a["volunteer_name"] in {"Anita P.", "Manoj N."} for a in packing[:2])
    order = [a["urgency"] for a in result["assignments"]]
    assert order == sorted(order, key=dispatch.URGENCY_RANK.get)
    assert any(b["task_code"] == "TSK-003" for b in result["bottlenecks"]) or len(packing) == 4


def test_specialist_tasks_never_get_untrained_responders():
    task = {"id": "t", "code": "T", "title": "Triage", "urgency": "CRITICAL", "required_skill": "Paramedic",
            "lat": 20.0, "lng": 85.0, "quantity_needed": 1, "status": "OPEN"}
    vols = [{"id": "v", "name": "Packer", "skills": ["Manual Packing"], "lat": 20.0, "lng": 85.0,
             "availability": "AVAILABLE"}]
    result = dispatch.dispatch_batch([task], vols)
    assert result["assignments"] == [] and result["bottlenecks"][0]["deficit"] == 1


def test_squander_penalty_applied():
    pool = dispatch.skill_pool([{"skills": ["Paramedic"]}, {"skills": ["Manual Packing"]}])
    task = {"urgency": "LOW", "required_skill": "Manual Packing", "lat": 0, "lng": 0}
    medic = dispatch.score(task, {"skills": ["Paramedic"], "lat": 0, "lng": 0}, pool, 0)
    packer = dispatch.score(task, {"skills": ["Manual Packing"], "lat": 0, "lng": 0}, pool, 0)
    assert medic.squander and not packer.squander and packer.score > medic.score * 50


def test_laya_hindi_flood():
    r = triage.triage("बाढ़ से लोग फंसे हैं, नाव चाहिए", "Assam", "hi")
    assert r["disaster_type"] == "Flood" and r["severity"] == "CRITICAL" and r["urgency_score"] == 5
    assert r["flags"]["trapped_civilians"] and "Boats" in r["needs"] and r["language"] == "hi"
    assert r["tier"] == "deterministic" and r["latency_ms"] < 35


def test_laya_english_and_counts():
    r = triage.triage("Building collapse in Kangra, 12 people trapped, two injured, need ambulance")
    assert r["disaster_type"] == "Collapse" and r["trapped_count"] == 12 and r["flags"]["medical_emergency"]


def test_laya_api_endpoint(client):
    r = client.post("/api/triage/laya", json={"text": "Heavy flood, villagers need drinking water and food"})
    body = r.json()
    assert r.status_code == 200 and body["flags"]["food_water_needed"] and body["severity"] == "HIGH"


def test_surge_model_thresholds(client):
    remal = client.post("/api/predict", json={"lat": 19.8135, "lng": 85.8312, "district": "Puri",
                                              "state": "Odisha", "wind_speed": 142.0, "rainfall_mm": 285.0}).json()
    assert remal["risk_level"] == "CRITICAL" and remal["predicted_surge_m"] > 2.5
    inland = surge.predict({"lat": 28.61, "lng": 77.21, "wind_speed": 18.0, "rainfall_mm": 0.0})
    assert inland["risk_level"] == "MODERATE" and inland["predicted_surge_m"] < 0.05
    assert inland["features"]["x6_coast_distance_km"] > 500


def test_event_dedup_clusters(client):
    now = datetime.now(timezone.utc)
    reports = [
        {"id": "r1", "text": "Heavy flooding in Guwahati, water above danger mark", "source": "NDMA",
         "timestamp": (now - timedelta(minutes=50)).isoformat()},
        {"id": "r2", "text": "Guwahati villages submerged after flood, SDRF deployed", "source": "News",
         "timestamp": (now - timedelta(minutes=10)).isoformat()},
        {"id": "r3", "text": "Cyclone approaching Puri coast at 145 km/h", "source": "IMD",
         "timestamp": now.isoformat()},
    ]
    events = client.post("/api/events/ingest", json=reports).json()
    assert len(events) == 2
    flood = next(e for e in events if e["disaster_type"] == "Flood")
    assert sorted(flood["report_ids"]) == ["r1", "r2"] and flood["location"] == "Guwahati"


def test_citizen_report_links_to_incident(client):
    r = client.post("/api/reports", json={"text": "Family of 5 trapped on roof, water rising fast",
                                          "location": "Paradip", "lat": 20.26, "lng": 86.67})
    body = r.json()
    assert r.status_code == 201 and body["linked_disaster_id"] == "dis_remal_puri" and body["stored"]
    assert body["triage"]["severity"] == "CRITICAL"


def test_validation_errors_are_readable(client):
    r = client.post("/api/predict", json={"lat": 999, "lng": 0, "wind_speed": 1, "rainfall_mm": 1})
    assert r.status_code == 422 and r.json()["detail"].startswith("lat:")
    json.dumps(r.json())


def test_database_url_aliases_and_derived_session_key(client, monkeypatch):
    """Vercel's Neon integration may name the variable DB_URL; sessions must survive a missing NEXTAUTH_SECRET."""
    monkeypatch.setenv("VOLENTIFY_ENV", "production")
    monkeypatch.delenv("NEXTAUTH_SECRET", raising=False)
    monkeypatch.setenv("DB_URL", "postgresql://u:p@127.0.0.1:1/neondb?sslmode=require")
    get_settings.cache_clear()
    settings = get_settings()
    assert settings.database_url_var == "DB_URL"
    assert settings.session_secret_source == "derived" and len(settings.session_secret) == 64
    assert "configuration" not in client.get("/api/health").json()  # hidden from the public
    admin_session(client)
    body = client.get("/api/health").json()
    assert body["configuration"]["database_variable"] == "DB_URL"
    assert body["configuration"]["session_key"] == "derived"
    assert "p@" not in str(body)


def test_missing_secret_breaks_only_sign_in(client, monkeypatch):
    monkeypatch.setenv("VOLENTIFY_ENV", "production")
    monkeypatch.delenv("NEXTAUTH_SECRET", raising=False)
    get_settings.cache_clear()
    assert client.get("/api/health").status_code == 200
    assert client.get("/api/disasters").status_code == 200
    r = client.post("/api/auth/register", json={"name": "A B", "email": "a@b.co", "password": "longpassword1"})
    assert r.status_code == 503


def test_research_archive_records_forecasts_and_snapshots(client, monkeypatch):
    from api._lib.core import research
    from api._lib.engines import intel
    from api._lib.routers import research as research_router
    research._memory.clear()
    research_router._collect_limiter._hits.clear()

    async def fake_feed(limit=40):
        items = [{"title": "Heavy rain warning", "description": "Orange alert", "link": "x", "source": "IMD",
                  "severity": "HIGH", "published_at": "2026-11-01T00:00:00+00:00"}]
        research.record_many("cap_alert", "NDMA SACHET", [(research.fingerprint("a"), i) for i in items])
        return {"source": "NDMA SACHET CAP feed", "mode": "LIVE", "items": items}

    monkeypatch.setattr(intel, "sachet_bulletins", fake_feed)
    client.post("/api/predict", json={"lat": 19.8, "lng": 85.8, "wind_speed": 150, "rainfall_mm": 200})
    r = client.post("/api/research/collect")
    assert r.status_code == 200 and r.json()["cap_feed_mode"] == "LIVE"
    client.post("/api/research/collect")  # same alert again is not archived twice
    kinds = client.get("/api/research/summary").json()["kinds"]
    assert kinds["forecast"]["count"] == 1 and kinds["cap_alert"]["count"] == 1
    assert kinds["platform_snapshot"]["count"] == 2
    assert client.get("/api/research/export").status_code == 401


def test_localhost_public_url_ignored_in_production(client, monkeypatch):
    monkeypatch.setenv("VOLENTIFY_ENV", "production")
    monkeypatch.setenv("NEXTAUTH_URL", "http://localhost:3000")
    monkeypatch.setenv("GOOGLE_CLIENT_ID", "abc.apps.googleusercontent.com")
    get_settings.cache_clear()
    r = client.get("/api/auth/google/start", headers={"x-forwarded-host": "volentify.vercel.app",
                                                      "x-forwarded-proto": "https"}, follow_redirects=False)
    assert r.status_code == 302
    assert "redirect_uri=https%3A%2F%2Fvolentify.vercel.app%2Fauth%2Fcallback" in r.headers["location"]


def test_gemini_switches_from_retired_model(monkeypatch):
    import httpx
    from api._lib.engines import gemini
    monkeypatch.setenv("GEMINI_API_KEY", "AIzaTest")
    monkeypatch.setenv("GEMINI_MODEL", "gemini-2.5-flash")
    get_settings.cache_clear()
    gemini._state.update(model=None, last_error=None)
    calls = []

    def fake_post(url, **kw):
        calls.append(url)
        if "gemini-2.5-flash" in url:
            return httpx.Response(404, json={"error": {"message": "no longer available"}})
        return httpx.Response(200, json={"candidates": [{"content": {"parts": [{"text": "ready"}]}}]})

    def fake_get(url, **kw):
        return httpx.Response(200, request=httpx.Request("GET", url), json={"models": [
            {"name": "models/gemini-3.8-flash", "supportedGenerationMethods": ["generateContent"]},
            {"name": "models/gemini-3.8-flash-lite", "supportedGenerationMethods": ["generateContent"]},
            {"name": "models/gemini-3.1-flash", "supportedGenerationMethods": ["generateContent"]},
            {"name": "models/gemini-4.0-flash-preview", "supportedGenerationMethods": ["generateContent"]},
            {"name": "models/text-embedding-9", "supportedGenerationMethods": ["embedContent"]}]})

    monkeypatch.setattr(gemini.httpx, "post", fake_post)
    monkeypatch.setattr(gemini.httpx, "get", fake_get)
    assert gemini.generate_text("hi") == "ready"
    assert gemini._state["model"] == "gemini-3.8-flash"
    assert gemini.probe()["ok"] and gemini.probe()["model"] == "gemini-3.8-flash"
    gemini._state.update(model=None)


# ─── real data only (no built-in demo dataset) ──────────────────────────────

def test_app_ships_no_sample_data(client):
    db.MEMORY.reset()
    for path in ("/api/disasters", "/api/tasks", "/api/alerts", "/api/volunteers", "/api/organizations",
                 "/api/mesh/events", "/api/mesh/nodes"):
        r = client.get(path)
        assert r.status_code == 200 and r.json() == [], path
    res = client.get("/api/resources").json()
    assert res["hospitals"] == [] and res["shelters"] == [] and res["hotlines"]
    feed = client.get("/api/bhuvan/bulletins").json()
    assert feed["items"] == [] and feed["mode"] == "OFFLINE"


GDACS_SAMPLE = {"type": "FeatureCollection", "features": [
    {"geometry": {"type": "Point", "coordinates": [81.8, 13.5]}, "properties": {
        "eventtype": "TC", "eventid": 1001346, "episodeid": 5, "eventname": "MURASU-26", "name": "Tropical Cyclone MURASU-26",
        "alertlevel": "Green", "episodealertlevel": "Green", "iscurrent": "true", "country": "India",
        "fromdate": "2026-11-01T00:00:00", "todate": "2026-11-02T00:00:00", "datemodified": "2026-11-02T01:00:00",
        "affectedcountries": [{"iso2": "IN", "iso3": "IND", "countryname": "India"}],
        "severitydata": {"severity": 111.1104, "severitytext": "Tropical Storm (maximum wind speed of 111 km/h)",
                         "severityunit": "km/h"},
        "url": {"report": "https://www.gdacs.org/report.aspx?eventid=1001346&episodeid=5&eventtype=TC"}}},
    {"geometry": {"type": "Point", "coordinates": [141.7, 22.3]}, "properties": {
        "eventtype": "TC", "eventid": 1001343, "eventname": "IN-FA-26", "alertlevel": "Green", "iscurrent": "true",
        "country": "Marshall Islands", "fromdate": "2026-10-25T06:00:00", "todate": "2026-11-02T00:00:00",
        "affectedcountries": [], "severitydata": {"severity": 240.7, "severityunit": "km/h"}, "url": {}}},
]}
USGS_SAMPLE = {"type": "FeatureCollection", "features": [
    {"id": "us7000tty7", "geometry": {"type": "Point", "coordinates": [91.6593, 13.3785, 10]}, "properties": {
        "mag": 5.1, "place": "218 km NNW of Bamboo Flat, India", "time": 1793263782448, "updated": 1793321469188,
        "url": "https://earthquake.usgs.gov/earthquakes/eventpage/us7000tty7", "felt": 1, "alert": None,
        "status": "reviewed", "tsunami": 0, "magType": "mb", "type": "earthquake"}}]}
EONET_SAMPLE = {"events": [
    {"id": "EONET_25729", "title": "Tropical Cyclone Murasu", "categories": [{"id": "severeStorms"}],
     "sources": [{"id": "JTWC", "url": "https://www.metoc.navy.mil/jtwc/products/io0226.tcw"}],
     "geometry": [{"magnitudeValue": 35.0, "magnitudeUnit": "kts", "date": "2026-10-31T18:00:00Z", "type": "Point",
                   "coordinates": [84.3, 12.6]},
                  {"magnitudeValue": 60.0, "magnitudeUnit": "kts", "date": "2026-11-01T18:00:00Z", "type": "Point",
                   "coordinates": [82.0, 13.4]}]},
    {"id": "EONET_9999", "title": "Wildfire in Uttarakhand", "categories": [{"id": "wildfires"}], "sources": [],
     "geometry": [{"date": "2026-11-01T06:00:00Z", "type": "Point", "coordinates": [79.0, 30.0]}]},
]}


def test_live_feed_parsers_keep_regional_recent_events():
    from api._lib.engines import live
    now = datetime(2026, 11, 2, 3, 0, tzinfo=timezone.utc)
    gdacs = live.parse_gdacs(GDACS_SAMPLE, now)
    assert [g["title"] for g in gdacs] == ["Cyclone Murasu"]  # the Pacific typhoon is outside the region
    murasu = gdacs[0]
    assert murasu["severity"] == "HIGH" and murasu["wind_speed_kmh"] == 111.1 and murasu["source"] == "GDACS"
    assert murasu["code"] == "GDACS-TC-1001346" and murasu["source_url"].startswith("https://www.gdacs.org/")
    quake = live.parse_usgs(USGS_SAMPLE, now)[0]
    assert quake["category"] == "Earthquake" and quake["severity"] == "MODERATE" and quake["state"] == "India"
    assert quake["created_at"].year == 2026
    eonet = live.parse_eonet(EONET_SAMPLE, now)
    assert {e["category"] for e in eonet} == {"Cyclone", "Wildfire"}
    merged = live.merge(gdacs + [quake] + eonet)  # EONET's copy of Murasu is dropped in favour of GDACS
    assert sorted(i["source"] for i in merged) == ["GDACS", "NASA EONET", "USGS"]
    assert all(i["category"] != "Cyclone" or i["source"] == "GDACS" for i in merged)


def test_live_sync_upserts_then_closes_dropped_incidents(client, monkeypatch):
    from api._lib.engines import live
    db.MEMORY.reset()
    now = datetime.now(timezone.utc)
    incidents = live.merge(live.parse_gdacs(GDACS_SAMPLE, now) + live.parse_usgs(USGS_SAMPLE, now))
    feeds = {"rows": incidents}
    monkeypatch.setattr(live, "offline", lambda: False)
    monkeypatch.setattr(live, "fetch_all", lambda now=None: (feeds["rows"], {s: "ok" for s in live.SOURCES}))
    assert live.ensure_fresh(force=True)["refreshed"]
    rows = client.get("/api/disasters").json()
    assert {r["source"] for r in rows} == {"GDACS", "USGS"}
    dossier = client.get(f"/api/disasters/{rows[0]['id']}").json()
    assert dossier["evidence"] and dossier["evidence"][0]["source_type"] == "OFFICIAL"
    feeds["rows"] = [i for i in incidents if i["source"] == "GDACS"]  # USGS no longer lists the quake
    live.ensure_fresh(force=True)
    assert {r["source"] for r in client.get("/api/disasters").json()} == {"GDACS"}
    closed = client.get("/api/disasters", params={"include_closed": True}).json()
    assert any(r["status"] == "CLOSED" and r["source"] == "USGS" for r in closed)


def test_cap_message_parsing_prefers_english():
    from api._lib.engines import intel
    xml = b"""<?xml version="1.0"?><alert xmlns="urn:oasis:names:tc:emergency:cap:1.2">
      <identifier>IN-1</identifier><sender>Andhra-Pradesh-SDMA</sender>
      <info><language>TL</language><event>Cyclone</event><severity>Severe</severity><headline>x</headline></info>
      <info><language>en-IN</language><event>Cyclone</event><severity>Severe</severity>
        <expires>2026-11-03T07:20:00+05:30</expires><headline>Heavy rain due to Severe Cyclone Murasu</headline>
        <instruction>Please follow SDMA guidelines.</instruction><area><areaDesc>heavy_rainfall_2026-11-02</areaDesc></area>
      </info></alert>"""
    cap = intel.parse_cap(xml)
    assert cap["headline"].startswith("Heavy rain") and cap["severity"] == "HIGH" and cap["event"] == "Cyclone"
    assert cap["expires_at"].utcoffset().total_seconds() == 19800 and cap["area"] == "heavy rainfall 2026-11-02"


def test_health_explains_degraded_database(client, monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql://u:secretpw@127.0.0.1:1/none?sslmode=disable")
    get_settings.cache_clear()
    db._pg = None
    admin_session(client)
    body = client.get("/api/health").json()
    assert body["database"] == "DEGRADED" and body["database_error"].startswith("OperationalError")
    assert "secretpw" not in str(body) and "127.0.0.1" not in str(body)


def test_first_request_on_fresh_serverless_vm_pulls_feeds(monkeypatch):
    """Regression: a new VM's monotonic clock starts near zero, which used to look like 'synced moments ago'."""
    from api._lib.engines import live
    db.MEMORY.reset()
    live._state.update(synced_at=None, last=None)
    monkeypatch.setattr(live, "offline", lambda: False)
    monkeypatch.setattr(live.time, "monotonic", lambda: 5.0)
    rows = live.parse_gdacs(GDACS_SAMPLE, datetime.now(timezone.utc))
    monkeypatch.setattr(live, "fetch_all", lambda now=None: (rows, {s: "ok" for s in live.SOURCES}))
    assert live.ensure_fresh()["refreshed"] is True
    assert live.ensure_fresh()["reason"] == "fresh"


# ─── November 2026: regulators, rules, missions, profiles, accountability ───

from api._lib.core import audit as audit_mod  # noqa: E402
from api._lib.core.security import hash_password  # noqa: E402
from api._lib.data.regulators import REGULATORS  # noqa: E402
from api._lib.engines import rules  # noqa: E402


def regulator_login(client, index=0, password="regulator-test-pass"):
    reg = REGULATORS[index]
    db.MEMORY.update_user(reg["id"], {"password_hash": hash_password(password)})
    r = client.post("/api/auth/login", json={"email": reg["email"], "password": password})
    assert r.status_code == 200, r.text
    return r.json()


def test_regulator_accounts_are_provisioned_and_protected(client):
    emails = {r["email"] for r in REGULATORS}
    assert emails == {"gurpreet@volentify.com", "gyanvir@volentify.com", "himanshu@volentify.com",
                      "rajveer@volentify.com"}
    schema = (Path(__file__).resolve().parents[1] / "api/_lib/data/schema.sql").read_text()
    assert all(r["password_hash"] in schema and r["email"] in schema for r in REGULATORS)
    # The reserved domain can't be registered by anyone else.
    r = client.post("/api/auth/register", json={"name": "Imposter", "email": "boss@volentify.com", "password": "s3cure-pass!"})
    assert r.status_code == 403
    auth_body = regulator_login(client)
    assert auth_body["user"]["role"] == "INCIDENT_ADMIN" and auth_body["user"]["is_verified"]
    assert auth_body["requiresOnboarding"] is False
    assert client.get("/api/admin/users").status_code == 200
    # Onboarding cannot turn a regulator into something else.
    r = client.post("/api/auth/onboard", json={"phone": "9876543210", "role": "CITIZEN", "state_district": "Delhi"})
    assert r.json()["user"]["role"] == "INCIDENT_ADMIN"


def test_only_regulators_change_regulators(client):
    command(client)
    target = REGULATORS[1]["id"]
    r = client.patch(f"/api/admin/users/{target}", json={"role": "CITIZEN"})
    assert r.status_code == 403
    regulator_login(client, 0)
    assert client.patch(f"/api/admin/users/{target}", json={"role": "INCIDENT_ADMIN", "is_verified": True}).status_code == 200


def test_reonboarding_cannot_self_promote_to_verified_command(client):
    signup(client, "citizen@example.org", role="CITIZEN")
    r = client.post("/api/auth/onboard", json={"phone": "9876543210", "role": "INCIDENT_ADMIN", "state_district": "Puri"})
    assert r.json()["user"]["role"] == "INCIDENT_ADMIN" and r.json()["user"]["is_verified"] is False
    assert client.post("/api/alerts", json={"title": "Fake alarm", "category": "Flood", "location": "Puri",
                                            "state": "Odisha", "description": "Nothing real", "advisory": "Panic now"}).status_code == 403


def test_password_change(client):
    signup(client, "pw@example.org")
    assert client.post("/api/auth/password", json={"current_password": "wrong", "new_password": "another-pass-123"}).status_code == 401
    assert client.post("/api/auth/password", json={"current_password": "s3cure-pass!", "new_password": "another-pass-123"}).status_code == 204
    assert client.post("/api/auth/login", json={"email": "pw@example.org", "password": "another-pass-123"}).status_code == 200


def test_audit_trail_records_and_detects_tampering(client):
    regulator_login(client)
    client.post("/api/alerts", json={"title": "Evacuate now", "category": "Cyclone", "level": "CRITICAL",
                                     "location": "Puri", "state": "Odisha", "description": "Surge expected",
                                     "advisory": "Move to shelters"})
    rows = client.get("/api/admin/audit").json()
    actions = [r["action"] for r in rows]
    assert "auth.login" in actions and "alert.broadcast" in actions
    assert client.get("/api/admin/audit/verify").json()["ok"] is True
    db.MEMORY.audit[0]["detail"] = {"forged": True}
    assert client.get("/api/admin/audit/verify").json()["ok"] is False


def test_mission_lifecycle_start_location_completion_and_profile(client):
    user = signup(client, "vol@example.org", skills=("Boat Rescue",))
    open_task = next(t for t in client.get("/api/tasks?status=OPEN").json() if t["required_skill"] == "Boat Rescue")
    assert client.patch(f"/api/tasks/{open_task['id']}", json={"status": "IN_PROGRESS"}).status_code == 403
    r = client.post(f"/api/tasks/{open_task['id']}/accept")
    assert r.status_code == 200 and r.json()["accepted_at"]
    r = client.patch(f"/api/tasks/{open_task['id']}", json={"status": "IN_PROGRESS", "lat": 19.9, "lng": 85.9,
                                                            "location_name": "Puri bus stand"})
    assert r.status_code == 200 and r.json()["started_at"] and r.json()["start_lat"] == 19.9
    me = client.get("/api/volunteers/me").json()
    assert me["availability"] == "BUSY" and me["lat"] == 19.9 and me["location_name"] == "Puri bus stand"
    r = client.patch(f"/api/tasks/{open_task['id']}", json={"status": "COMPLETED", "people_helped": 6,
                                                            "outcome_note": "Moved family, call 9876543210"})
    assert r.status_code == 200 and r.json()["people_helped"] == 6 and "9876543210" not in r.json()["outcome_note"]
    me = client.get("/api/volunteers/me").json()
    assert me["availability"] == "AVAILABLE" and me["missions_done"] == 1
    profile = client.get("/api/volunteers/me/profile").json()
    assert profile["is_self"] and profile["stats"]["missions_completed"] == 1 and profile["stats"]["people_helped"] == 6
    assert profile["history"][0]["code"] == open_task["code"] and profile["badge"] == "Field responder"
    public = client.get(f"/api/volunteers/{me['id']}/profile", cookies={}).json()
    assert "email" not in json.dumps(public) or user["email"] not in json.dumps(public)


def test_volunteer_cannot_hoard_missions(client):
    signup(client, "hoarder@example.org", skills=("Manual Packing",))
    open_ids = [t["id"] for t in client.get("/api/tasks?status=OPEN").json()]
    accepted = [client.post(f"/api/tasks/{tid}/accept").status_code for tid in open_ids[:4]]
    assert accepted[:3] == [200, 200, 200] and accepted[3] == 409


def test_unstarted_missions_return_to_pool(client, monkeypatch):
    from api._lib.routers import entities as ent
    signup(client, "ghost@example.org", skills=("Manual Packing",))
    task_id = client.get("/api/tasks?status=OPEN").json()[0]["id"]
    client.post(f"/api/tasks/{task_id}/accept")
    db.MEMORY.tasks[task_id]["accepted_at"] = datetime.now(timezone.utc) - timedelta(minutes=rules.MISSION_START_MINUTES + 5)
    ent._watchdog["at"] = None
    assert client.get(f"/api/tasks/{task_id}").json()["status"] == "ASSIGNED"
    client.get("/api/tasks")
    assert client.get(f"/api/tasks/{task_id}").json()["status"] == "OPEN"
    assert any(a["action"] == "task.auto_release" for a in db.MEMORY.audit)


def test_recommendations_rank_qualified_nearby_work(client):
    signup(client, "boat@example.org", skills=("Boat Rescue",))
    recs = client.get("/api/volunteers/me/recommendations").json()
    assert recs["located"] and recs["tasks"]
    top = recs["tasks"][0]
    assert top["recommended"] and top["qualified"]
    paramedic = [r for r in recs["tasks"] if r["skill"] == "Paramedic"]
    assert all(not r["recommended"] for r in paramedic)  # specialist work is never recommended to the untrained
    assert all("event_id" in r for r in recs["reports"])


def test_reviews(client):
    vol = signup(client, "reviewed@example.org")
    vol_id = client.get("/api/volunteers/me").json()["id"]
    assert client.post(f"/api/volunteers/{vol_id}/reviews", json={"rating": 5}).status_code == 400  # self-review
    client.post("/api/auth/logout")
    signup(client, "reviewer@example.org", role="CITIZEN")
    r = client.post(f"/api/volunteers/{vol_id}/reviews", json={"rating": 4, "comment": "Calm and quick. Aadhaar 2345 6789 0123"})
    assert r.status_code == 201 and "2345" not in r.json()["comment"] and r.json()["author_name"] == "Test User"
    client.post(f"/api/volunteers/{vol_id}/reviews", json={"rating": 2, "comment": "Changed my mind"})
    profile = client.get(f"/api/volunteers/{vol_id}/profile").json()
    assert profile["stats"]["reviews"] == 1 and profile["stats"]["average_rating"] == 2 and profile["can_review"]
    assert vol["email"] not in json.dumps(profile)


def test_automated_advisories_cover_indian_incidents_only(client):
    alerts = client.get("/api/alerts").json()
    auto = [a for a in alerts if a["kind"] == "AUTO"]
    assert auto and all("not an official warning" in a["description"] for a in auto)
    assert all(a["disaster_id"] for a in auto)
    db.MEMORY.reset()
    assert client.get("/api/alerts").json() == []


def test_ingest_enforces_rules_and_quarantine(client):
    spoof = mesh_event(type="RESOURCE_REQUEST", priority="CRITICAL",
                       payload={"notes": "Need rice, call +91 98765 43210", "official": True, "from": "Volentify Command"})
    r = client.post("/api/mesh/ingest", json={"gateway_node_id": str(uuid.uuid4()), "events": [spoof]})
    assert r.status_code == 200
    stored = db.MEMORY.get_mesh_event(spoof["event_id"])
    assert stored["priority"] == "HIGH" and "official" not in stored["payload"]
    assert stored["payload"]["from"] == "Field team"  # "Command" alone is fine, but see below
    assert "98765" not in stored["payload"]["notes"]
    command(client)
    r = client.patch(f"/api/mesh/events/{spoof['event_id']}", json={"action": "REJECT", "block_node": True})
    assert r.status_code == 200 and r.json()["review_status"] == "REJECTED"
    again = mesh_event(origin_node_id=spoof["origin_node_id"])
    r = client.post("/api/mesh/ingest", json={"gateway_node_id": str(uuid.uuid4()), "events": [again]}).json()
    assert r["accepted_count"] == 0 and r["blocked_count"] == 1
    client.post("/api/auth/logout")
    assert all(e["event_id"] != spoof["event_id"] for e in client.get("/api/mesh/events?limit=500").json())


def test_volunteers_cannot_reject_reports(client):
    signup(client, "v2@example.org")
    event_id = "d4a1b8c2-3e5f-4a7b-9c1d-2e4f6a8b0c2e"
    assert client.patch(f"/api/mesh/events/{event_id}", json={"action": "REJECT"}).status_code == 403


def test_web_broadcast_and_phone_downlink(client):
    assert client.post("/api/mesh/broadcast", json={"message": "Hello field"}).status_code == 401
    signup(client, "radio@example.org")
    r = client.post("/api/mesh/broadcast", json={"message": "Boat team at the school", "priority": "CRITICAL"})
    assert r.status_code == 403  # urgent broadcasts are command-only
    r = client.post("/api/mesh/broadcast", json={"message": "Boat team at the school"})
    assert r.status_code == 201 and r.json()["payload"]["official"] is False and r.json()["payload"]["role"] == "VOLUNTEER"
    client.post("/api/auth/logout")
    command(client)
    client.post("/api/alerts", json={"title": "Evacuate Puri coast", "category": "Cyclone", "level": "CRITICAL",
                                     "location": "Puri", "state": "Odisha", "description": "Surge expected",
                                     "advisory": "Move to cyclone shelters now", "disaster_id": "dis_remal_puri"})
    client.post("/api/auth/logout")
    nearby = mesh_event(type="FLOOD", priority="HIGH", payload={"notes": "Road under water"}, lat=19.82, lng=85.84)
    client.post("/api/mesh/ingest", json={"gateway_node_id": str(uuid.uuid4()), "events": [nearby]})
    body = client.get("/api/mesh/downlink?lat=19.8&lng=85.8").json()
    official = [e for e in body["events"] if e["payload"].get("official") is True]
    assert official and official[0]["payload"]["from"] == "Volentify incident command"
    assert any(e["payload"].get("message") == "Boat team at the school" for e in body["events"])
    assert any(e["event_id"] == nearby["event_id"] for e in body["events"])
    assert all(e["ttl"] <= 3 and len(e["event_id"]) == 36 and len(e["origin_node_id"]) == 36 for e in body["events"])
    trapped = [e for e in body["events"] if e["type"] == "PERSON_TRAPPED"]
    assert all(e["payload"].get("redacted") for e in trapped)
    far = client.get("/api/mesh/downlink?lat=28.6&lng=77.2").json()
    assert all(e["event_id"] != nearby["event_id"] for e in far["events"])
    assert body["incidents"] and body["server_time"]


def test_citizen_report_outside_incidents_still_reaches_responders(client):
    r = client.post("/api/reports", json={"text": "Tree fallen on the road, two people injured, Aadhaar 2345 6789 0123",
                                          "location": "Koramangala, Bengaluru", "lat": 12.93, "lng": 77.62})
    body = r.json()
    assert r.status_code == 201 and body["stored"] and body["linked_disaster_id"] is None
    assert "Aadhaar number" in body["removed"]
    events = [e for e in db.MEMORY.mesh_events.values() if (e["payload"] or {}).get("source") == "web"]
    assert events and "2345" not in events[0]["payload"]["notes"] and events[0]["review_status"] == "UNREVIEWED"


def test_transparency_and_history(client):
    signup(client, "t@example.org", skills=("Boat Rescue",))
    report = client.get("/api/transparency").json()
    assert report["missions"]["total"] >= 1 and report["incidents"]["active"] >= 1
    assert report["governance"]["report_retention_days"] == rules.RETENTION_DAYS
    assert len(report["months"]) == 12 and len(report["mesh"]["monthly"]) == 12
    assert "email" not in json.dumps(report)
    db.MEMORY.disasters["dis_remal_puri"]["status"] = "CLOSED"
    hist = client.get("/api/analytics/history").json()
    assert any(i["id"] == "dis_remal_puri" and i["status"] == "CLOSED" for i in hist["items"])


def test_public_volunteer_positions_are_coarse(client):
    rows = client.get("/api/volunteers").json()
    assert rows and all(round(v["lat"], 2) == v["lat"] for v in rows)


def test_pii_scrubber():
    clean, removed = rules.scrub_pii("Ram 9876543210, Aadhaar 2345-6789-0123, PAN ABCDE1234F, card 4111 1111 1111 1111")
    assert "9876543210" not in clean and "2345" not in clean and "ABCDE1234F" not in clean and "4111" not in clean
    assert set(removed) == {"phone number", "Aadhaar number", "PAN", "card or account number"}
    assert rules.scrub_pii("12 people on the roof at 19.81, 85.83")[1] == []
    assert rules.cap_priority("RESOURCE_REQUEST", "CRITICAL") == "HIGH"
    assert rules.cap_priority("PERSON_TRAPPED", "CRITICAL") == "CRITICAL"


def test_data_minimisation(client):
    old = mesh_event(type="FLOOD", priority="HIGH", disaster_id=None, payload={"notes": "Water at door", "needs": ["boat"]},
                     lat=12.9312, lng=77.6245,
                     observed_at=(datetime.now(timezone.utc) - timedelta(days=rules.RETENTION_DAYS + 2)).isoformat())
    client.post("/api/mesh/ingest", json={"gateway_node_id": str(uuid.uuid4()), "events": [old]})
    n = db.MEMORY.minimise_mesh_events(datetime.now(timezone.utc) - timedelta(days=rules.RETENTION_DAYS))
    ev = db.MEMORY.get_mesh_event(old["event_id"])
    assert n >= 1 and ev["payload"] == {"minimised": True, "needs": ["boat"]} and round(ev["lat"], 2) == ev["lat"]


def test_relayed_command_alerts_are_not_reingested(client):
    echo = mesh_event(origin_node_id=mesh.COMMAND_NODE, type="DISASTER_STATUS", priority="HIGH",
                      payload={"message": "Evacuate", "from": "Volentify incident command"})
    r = client.post("/api/mesh/ingest", json={"gateway_node_id": str(uuid.uuid4()), "events": [echo]}).json()
    assert r["accepted_count"] == 0 and r["duplicate_count"] == 1
    assert db.MEMORY.get_mesh_event(echo["event_id"]) is None


# ─── Abuse protection: scanners, scrapers, CSRF, lockout, honeypots, headers ─

def test_scanners_and_scrapers_are_refused(client):
    assert client.get("/api/disasters", headers={"User-Agent": "sqlmap/1.7"}).status_code == 403
    assert client.get("/api/volunteers", headers={"User-Agent": "Mozilla/5.0 (compatible; GPTBot/1.2)"}).status_code == 403
    assert client.get("/api/disasters", headers={"User-Agent": "okhttp/4.12.0"}).status_code == 200


def test_security_headers_on_api(client):
    r = client.get("/api/disasters")
    assert r.headers["X-Content-Type-Options"] == "nosniff" and r.headers["X-Frame-Options"] == "DENY"
    assert "noindex" in r.headers["X-Robots-Tag"] and "default-src 'none'" in r.headers["Content-Security-Policy"]
    assert "Content-Security-Policy" not in client.get("/api/docs").headers
    signup(client, "nostore@example.org")
    assert client.get("/api/auth/me").headers["Cache-Control"] == "no-store"


def test_cross_site_writes_are_refused(client, monkeypatch):
    signup(client, "csrf@example.org")
    evil = client.post("/api/mesh/broadcast", json={"message": "hello"}, headers={"Origin": "https://evil.example"})
    assert evil.status_code == 403
    same = client.post("/api/mesh/broadcast", json={"message": "hello there"}, headers={"Origin": "http://testserver"})
    assert same.status_code == 201
    # Phones send no Origin at all.
    assert client.post("/api/mesh/ingest", json={"gateway_node_id": str(uuid.uuid4()), "events": [mesh_event()]}).status_code == 200


def test_account_lockout_after_repeated_wrong_passwords(client):
    from api._lib.routers import auth as auth_router
    signup(client, "victim@example.org")
    client.post("/api/auth/logout")
    for i in range(auth_router.MAX_FAILED_PER_ACCOUNT):
        auth_router._login_limiter._hits.clear()
        assert client.post("/api/auth/login", json={"email": "victim@example.org", "password": f"guess-{i}"}).status_code == 401
    auth_router._login_limiter._hits.clear()
    r = client.post("/api/auth/login", json={"email": "victim@example.org", "password": "s3cure-pass!"})
    assert r.status_code == 429 and "locked" in r.json()["detail"]
    db.MEMORY.rates.clear()
    assert client.post("/api/auth/login", json={"email": "victim@example.org", "password": "s3cure-pass!"}).status_code == 200


def test_honeypots(client):
    r = client.post("/api/auth/register", json={"name": "Bot", "email": "bot@example.org", "password": "s3cure-pass!",
                                                "website": "http://spam.example"})
    assert r.status_code == 400 and db.MEMORY.get_user_by_email("bot@example.org") is None
    before = len(db.MEMORY.mesh_events)
    r = client.post("/api/reports", json={"text": "Cheap pills at our site", "location": "Delhi", "website": "spam"})
    assert r.status_code == 201 and len(db.MEMORY.mesh_events) == before


def test_signed_out_visitors_see_initials_only(client):
    public = client.get("/api/volunteers").json()
    assert public and all(v["name"].endswith(".") or " " not in v["name"] for v in public)
    signup(client, "member@example.org")
    full = client.get("/api/volunteers").json()
    assert any(" " in v["name"] and not v["name"].endswith(".") for v in full)


def test_oversized_bodies_are_refused(client):
    r = client.post("/api/reports", content=b"x" * 1_100_000, headers={"Content-Type": "application/json"})
    assert r.status_code == 413


def test_api_map_hidden_on_live_site(client, monkeypatch):
    assert client.get("/api/openapi.json").status_code == 200  # local and preview: open for developers
    monkeypatch.setenv("VOLENTIFY_ENV", "production")
    get_settings.cache_clear()
    assert client.get("/api/openapi.json").status_code == 404
    assert client.get("/api/docs").status_code == 404
    assert "Strict-Transport-Security" in client.get("/api/disasters").headers
