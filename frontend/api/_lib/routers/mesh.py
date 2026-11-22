"""Volentify Mesh gateway ingest and read APIs (PRD §2–3, §10.2)."""

from __future__ import annotations

import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status

from ..core import audit, db
from ..core.security import (
    RateLimiter, client_key, current_claims, issue_mesh_token, require_mesh_token, require_roles,
)
from ..engines import live, rules
from ..engines.geo import bbox_around, haversine_km
from ..schemas import (
    MeshBroadcastRequest, MeshEvent, MeshEventType, MeshIncident, MeshIngestRequest, MeshIngestResponse, MeshNode,
    MeshPriority, MeshReviewRequest, MeshToken,
)
from .common import new_code, new_id, now, tag

router = APIRouter(prefix="/api/mesh", tags=["mesh"])
_ingest_limiter = RateLimiter(limit=60, window_s=60)
_public_ingest_limiter = RateLimiter(limit=20, window_s=60)
_broadcast_limiter = RateLimiter(limit=10, window_s=60)
_downlink_limiter = RateLimiter(limit=30, window_s=60)

# Stable identities for messages that originate on the server, so phones accept them (they require UUIDs).
NAMESPACE = uuid.UUID("0d3c4e9a-7b21-4f5e-8c6d-9a1b2c3d4e5f")
COMMAND_NODE = str(uuid.uuid5(NAMESPACE, "volentify-command"))
DOWNLINK_TTL = 3          # hops a server message may still travel through the offline mesh
DOWNLINK_WINDOW_H = 24    # how far back official messages are offered to a phone
DOWNLINK_NEARBY_H = 6     # how far back nearby field reports are offered


def optional_mesh_token(request: Request) -> Optional[dict]:
    """Phones upload as soon as they get any internet connection, with or without a gateway token.

    A token (issued from the web dashboard) identifies a verified gateway. Without one the upload is accepted as
    public field reports — rate-limited per network address and, like every mesh report, shown as unreviewed until
    command reviews it. A token that is present but invalid is still rejected, so the phone can refresh it.
    """
    if not request.headers.get("authorization"):
        return None
    return require_mesh_token(request)


def _evidence_text(ev) -> str:
    """Public-safe line for the incident timeline: no free text from sensitive (people/medical) reports."""
    label = ev.type.replace("_", " ").capitalize()
    payload = ev.payload if isinstance(ev.payload, dict) else {}
    parts = [f"Mesh field report — {label}, {ev.priority.lower()} priority"]
    if ev.type in SENSITIVE_TYPES:
        count = payload.get("count")
        if isinstance(count, int):
            parts.append(f"{'1–5' if count <= 5 else '6+'} people")
    else:
        text = payload.get("message") or payload.get("notes")
        if isinstance(text, str) and text.strip():
            parts.append(text.strip()[:200])
        needs = payload.get("needs")
        if isinstance(needs, list) and needs:
            parts.append("needs: " + ", ".join(str(n) for n in needs[:6]))
    if ev.hop_count:
        parts.append(f"relayed over {ev.hop_count} phone{'s' if ev.hop_count != 1 else ''}")
    return "; ".join(parts) + "."

# Sensitive event types are summarised for unverified readers (OD-02).
SENSITIVE_TYPES = {"PERSON_MISSING", "PERSON_TRAPPED", "MEDICAL_EMERGENCY", "PERSON_RESCUED"}
PROMOTE_SKILL = {
    "PERSON_TRAPPED": "Rescue & Search", "PERSON_MISSING": "Rescue & Search", "FLOOD": "Boat Rescue",
    "MEDICAL_EMERGENCY": "Paramedic", "FIRE": "Rescue & Search", "RESOURCE_REQUEST": "Food & Shelter Logistics",
    "VOLUNTEER_STATUS": "Food & Shelter Logistics", "DISASTER_STATUS": "Rescue & Search",
}


def skill_for_event(ev_type: str, payload: dict) -> str:
    needs = payload.get("needs") or []
    if isinstance(needs, str):
        needs = [needs]
    needs_lower = " ".join(str(n).lower() for n in needs)
    if "boat" in needs_lower:
        return "Boat Rescue"
    if "paramedic" in needs_lower or "ambulance" in needs_lower:
        return "Paramedic"
    if "medic" in needs_lower or "first aid" in needs_lower or "insulin" in needs_lower or "blood" in needs_lower:
        return "Medical & First Aid"
    if "food" in needs_lower or "water" in needs_lower or "ration" in needs_lower or "shelter" in needs_lower:
        return "Food & Shelter Logistics"
    if "drone" in needs_lower:
        return "Drone Operation"
    return PROMOTE_SKILL.get(ev_type, "Rescue & Search")
PRIORITY_TO_URGENCY = {"CRITICAL": "CRITICAL", "HIGH": "HIGH", "MEDIUM": "MODERATE", "LOW": "LOW"}


def _crew_size(count: object) -> int:
    """Roughly one responder per four people reported, capped for a single mission."""
    return max(1, min(20, count // 4)) if isinstance(count, int) else 1


@router.post("/token", response_model=MeshToken)
def gateway_token(node_uuid: Optional[str] = None, claims: dict = Depends(require_roles("VOLUNTEER",
                  "INCIDENT_ADMIN", "NGO_MEMBER"))):
    """Short-lived bearer token for a gateway phone, issued at volunteer check-in (OD-01)."""
    token, expires = issue_mesh_token(claims["sub"], node_uuid)
    return MeshToken(token=token, expires_at=expires)


@router.post("/ingest", response_model=MeshIngestResponse)
def ingest(body: MeshIngestRequest, request: Request, response: Response,
           token: Optional[dict] = Depends(optional_mesh_token)):
    if token:
        _ingest_limiter.check(f"{client_key(request)}:{token.get('sub')}")
    else:
        _public_ingest_limiter.check(f"public:{client_key(request)}")
    received = now()

    def persist(store):
        store.upsert_node(body.gateway_node_id, {"last_lat": body.gateway_lat, "last_lng": body.gateway_lng,
                                                 "battery_level": body.gateway_battery})
        accepted, duplicates, blocked_ids = [], [], []
        disasters = store.list_disasters(include_closed=True)
        known = {d["id"] for d in disasters}
        active = [d for d in disasters if d.get("status") == "ACTIVE"]
        blocked = store.blocked_among(list({ev.origin_node_id for ev in body.events}))
        for ev in body.events:
            if ev.origin_node_id in blocked:
                # Quarantined phone: acknowledge (so relays stop retrying) but never store or show it.
                blocked_ids.append(ev.event_id)
                continue
            if ev.origin_node_id == COMMAND_NODE:
                # A phone relaying back a command alert it got from the downlink: the server already has it.
                duplicates.append(ev.event_id)
                continue
            # Rules enforced again on the server: no identity numbers in free text, no server-only payload keys
            # (a phone cannot claim to be incident command), CRITICAL only for life-safety report types.
            ev = ev.model_copy(update={"payload": rules.clean_payload(ev.payload),
                                       "priority": rules.cap_priority(ev.type, ev.priority)})
            store.upsert_node(ev.origin_node_id, {"last_lat": ev.lat, "last_lng": ev.lng})
            disaster_id = ev.disaster_id if ev.disaster_id in known else None
            if disaster_id is None and ev.lat is not None and ev.lng is not None and active:
                # Field reports become incident data: link to the nearest active incident they fall inside.
                nearest = min(active, key=lambda d: haversine_km(ev.lat, ev.lng, d["lat"], d["lng"]))
                if haversine_km(ev.lat, ev.lng, nearest["lat"], nearest["lng"]) <= nearest["radius_km"] * 1.5:
                    disaster_id = nearest["id"]
            row = {"id": new_id("me"), "event_id": ev.event_id, "origin_node_id": ev.origin_node_id,
                   "disaster_id": disaster_id, "type": ev.type, "priority": ev.priority, "payload": ev.payload,
                   "lat": ev.lat, "lng": ev.lng, "observed_at": ev.observed_at, "hop_count": ev.hop_count,
                   "ttl": ev.ttl, "received_at": received, "review_status": "UNREVIEWED",
                   "promoted_task_id": None}
            if store.insert_mesh_event(row):
                accepted.append(ev.event_id)
                if disaster_id:
                    store.add_evidence({
                        "id": f"ev_mesh_{ev.event_id.replace('-', '')[:24]}", "disaster_id": disaster_id,
                        "author_id": None, "source": "Volentify Mesh",
                        "source_type": "CITIZEN", "claim_text": _evidence_text(ev), "relation": "SUPPORTING",
                        "confidence": 0.6 if token else 0.5, "language": "en", "created_at": ev.observed_at,
                    })
            else:
                duplicates.append(ev.event_id)
        return accepted, duplicates, blocked_ids

    try:
        (accepted, duplicates, blocked_ids), source = db.write(persist, durable=True)
    except db.DurabilityUnavailable:
        # Gateways must keep events in their outbox and retry with backoff (AT-08).
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Persistence unavailable — retry later",
                            headers={"Retry-After": "30"})
    tag(response, source)
    return MeshIngestResponse(accepted_count=len(accepted), duplicate_count=len(duplicates),
                              gateway_ack_id=f"ack_{secrets.token_hex(4)}", accepted_ids=accepted,
                              duplicate_ids=duplicates + blocked_ids, blocked_count=len(blocked_ids),
                              persistence="durable" if source == "database" else "volatile")


def _redact(ev: dict) -> dict:
    if ev["type"] in SENSITIVE_TYPES:
        count = ev["payload"].get("count") if isinstance(ev["payload"], dict) else None
        return {**ev, "payload": {"redacted": True, **({"count_band": "1-5" if count <= 5 else "6+"}
                                                     if isinstance(count, int) else {})}}
    return ev


@router.get("/events", response_model=list[MeshEvent])
def list_events(request: Request, response: Response, disaster_id: Optional[str] = None,
                priority: Optional[MeshPriority] = None, type: Optional[MeshEventType] = None,
                max_age_minutes: Optional[int] = Query(None, ge=1, le=60 * 24 * 30),
                limit: int = Query(50, ge=1, le=500)):
    since = now() - timedelta(minutes=max_age_minutes) if max_age_minutes else None
    rows, source = db.read(lambda s: s.list_mesh_events(
        disaster_id, priority.value if priority else None, type.value if type else None, since, limit))
    claims = current_claims(request) or {}
    trusted = claims.get("role") in {"INCIDENT_ADMIN", "NGO_MEMBER"} and claims.get("verified")
    tag(response, source)
    return rows if trusted else [_redact(r) for r in rows if r["review_status"] != "REJECTED"]


@router.get("/nodes", response_model=list[MeshNode])
def list_nodes(response: Response):
    rows, source = db.read(lambda s: s.list_mesh_nodes())
    tag(response, source)
    return [{**n, "active": db.node_is_active(n["last_seen_at"])} for n in rows]


@router.get("/incidents", response_model=list[MeshIncident])
def list_incidents(response: Response):
    """Active incident bounding boxes for offline caching on phones."""
    live.ensure_fresh()
    rows, source = db.read(lambda s: s.list_disasters())
    tag(response, source)
    return [{"disaster_id": d["id"], "code": d["code"], "title": d["title"], "category": d["category"],
             "severity": d["severity"], "center": (d["lat"], d["lng"]),
             "bbox": bbox_around(d["lat"], d["lng"], d["radius_km"]), "radius_km": d["radius_km"]}
            for d in rows if d["status"] == "ACTIVE"]


@router.patch("/events/{event_id}", response_model=MeshEvent)
def review_event(event_id: str, body: MeshReviewRequest, request: Request, response: Response,
                 claims: dict = Depends(require_roles("INCIDENT_ADMIN", "NGO_MEMBER", "VOLUNTEER"))):
    """FR-16: mark a field report reviewed, promote it to a mission, or reject it as false (command only).

    Rejecting hides the report from public views; with `block_node` the originating phone is quarantined and its
    future uploads are dropped (deliberate false alarms are an offence under DM Act 2005 s.54).
    """
    if body.action == "REJECT" and claims["role"] not in {"INCIDENT_ADMIN", "NGO_MEMBER"}:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only verified command can reject reports")

    def review(store):
        ev = store.get_mesh_event(event_id)
        if not ev:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Mesh event not found")
        if body.action == "REVIEWED":
            return store.update_mesh_event(event_id, {"review_status": "REVIEWED"})
        if body.action == "REJECT":
            if body.block_node:
                if ev["origin_node_id"] in {COMMAND_NODE}:
                    raise HTTPException(status.HTTP_400_BAD_REQUEST, "Server messages cannot be quarantined")
                store.block_node(ev["origin_node_id"], (body.reason or "False or abusive reports")[:200], claims["sub"])
            return store.update_mesh_event(event_id, {"review_status": "REJECTED"})
        if ev["review_status"] == "PROMOTED":
            return ev
        disaster_id = getattr(body, "disaster_id", None) or ev.get("disaster_id")
        disaster = store.get_disaster(disaster_id) if disaster_id else None
        if not disaster:
            active = store.list_disasters(include_closed=False)
            if active:
                disaster = active[0]
                disaster_id = disaster["id"]
            else:
                raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "No active disaster incident available to link the mission to")
        ts = now()
        label = ev["type"].replace("_", " ").title()
        payload = ev["payload"] if isinstance(ev["payload"], dict) else {}
        notes = payload.get("notes") or payload.get("message") or ""
        needs = payload.get("needs") or []
        if isinstance(needs, str):
            needs = [needs]
        
        skill = skill_for_event(ev["type"], payload)
        crew = _crew_size(payload.get("count"))
        
        if notes:
            task_title = f"{label}: {str(notes)[:45]}"
        elif needs:
            task_title = f"{label}: Needs {', '.join(str(n) for n in needs)[:35]}"
        else:
            task_title = f"{label} (Mesh report)"
            
        desc = f"Promoted from mesh report ({ev['event_id']})."
        if notes:
            desc += f" Notes: {notes}."
        if needs:
            desc += f" Reported needs: {', '.join(str(n) for n in needs)}."
            
        task = store.create_task({
            "id": new_id("tsk"), "code": new_code("TSK"), "title": task_title,
            "description": desc,
            "urgency": PRIORITY_TO_URGENCY.get(ev["priority"], "HIGH"),
            "required_skill": skill,
            "lat": ev["lat"] if ev["lat"] is not None else disaster["lat"],
            "lng": ev["lng"] if ev["lng"] is not None else disaster["lng"],
            "location_name": disaster.get("location") or "Incident Site", "quantity_needed": crew,
            "status": "OPEN", "disaster_id": disaster_id, "created_by_id": claims["sub"], "assigned_to_id": None,
            "created_at": ts, "updated_at": ts,
        })
        return store.update_mesh_event(event_id, {"review_status": "PROMOTED", "promoted_task_id": task["id"], "disaster_id": disaster_id})

    row, source = db.write(review)
    tag(response, source)
    audit.record(f"mesh.{body.action.lower()}", claims, target_type="mesh_event", target_id=event_id, request=request,
                 detail={"type": row["type"], "priority": row["priority"], "block_node": body.block_node,
                         **({"node": row["origin_node_id"]} if body.block_node else {}),
                         **({"task_id": row.get("promoted_task_id")} if body.action == "PROMOTE" else {})})
    return row


# ─── Quarantine list (command) ──────────────────────────────────────────────

@router.get("/blocked")
def blocked_nodes(response: Response, _: dict = Depends(require_roles("INCIDENT_ADMIN", "NGO_MEMBER"))):
    rows, source = db.read(lambda s: s.list_blocked_nodes())
    tag(response, source)
    return rows


@router.delete("/blocked/{node_uuid}", status_code=status.HTTP_204_NO_CONTENT)
def unblock_node(node_uuid: str, request: Request, claims: dict = Depends(require_roles("INCIDENT_ADMIN"))):
    removed, _ = db.write(lambda s: s.unblock_node(node_uuid))
    if not removed:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "That phone is not quarantined")
    audit.record("mesh.unblock", claims, target_type="mesh_node", target_id=node_uuid, request=request)


# ─── Web → mesh: authenticated broadcasts and the phone downlink ────────────

def _web_node(user_id: str) -> str:
    return str(uuid.uuid5(NAMESPACE, f"web-user:{user_id}"))


@router.post("/broadcast", response_model=MeshEvent, status_code=status.HTTP_201_CREATED)
def broadcast(body: MeshBroadcastRequest, request: Request, response: Response,
              claims: dict = Depends(require_roles("VOLUNTEER", "NGO_MEMBER", "INCIDENT_ADMIN"))):
    """Send a short message from the website into the field mesh.

    The sender's name and role are set by the server — never taken from the request — and only verified incident
    administrators' messages are marked official. Phones pick these up through /api/mesh/downlink the next time
    any of them is online, then relay them up to three hops into the offline mesh.
    """
    _broadcast_limiter.check(claims["sub"])
    official = claims["role"] == "INCIDENT_ADMIN" and bool(claims.get("verified"))
    if body.priority == "CRITICAL" and not official:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only incident command can send urgent broadcasts")
    text, _ = rules.scrub_pii(body.message.strip())
    node = _web_node(claims["sub"])
    ts = now()
    row = {"id": new_id("me"), "event_id": str(uuid.uuid4()), "origin_node_id": node, "disaster_id": None,
           "type": "DISASTER_STATUS", "priority": body.priority,
           "payload": {"message": text, "from": claims.get("name") or "Volentify member", "role": claims["role"],
                       "official": official},
           "lat": None, "lng": None, "observed_at": ts, "hop_count": 0, "ttl": DOWNLINK_TTL, "received_at": ts,
           "review_status": "REVIEWED" if official else "UNREVIEWED", "promoted_task_id": None}

    def persist(store):
        if body.disaster_id:
            d = store.get_disaster(body.disaster_id)
            row["disaster_id"] = d["id"] if d else None
            if d:
                row["lat"], row["lng"] = d["lat"], d["lng"]
        store.upsert_node(node, {})
        store.insert_mesh_event(row)
        return store.get_mesh_event(row["event_id"])

    try:
        saved, source = db.write(persist, durable=True)
    except db.DurabilityUnavailable:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Database unavailable — message not sent",
                            headers={"Retry-After": "30"})
    tag(response, source)
    audit.record("mesh.broadcast", claims, target_type="mesh_event", target_id=row["event_id"], request=request,
                 detail={"priority": body.priority, "official": official})
    return saved


ALERT_PRIORITY = {"CRITICAL": "CRITICAL", "HIGH": "HIGH", "MODERATE": "MEDIUM", "LOW": "LOW"}


def _alert_event(alert: dict, disasters: dict[str, dict]) -> dict:
    """An incident commander's alert as a mesh message the phones can relay (stable UUID per alert)."""
    d = disasters.get(alert.get("disaster_id") or "")
    text = f"{alert['title']} — {alert['advisory']}"[: rules.MAX_MESSAGE_CHARS]
    created = alert["created_at"]
    return {"event_id": str(uuid.uuid5(NAMESPACE, f"alert:{alert['id']}")), "origin_node_id": COMMAND_NODE,
            "disaster_id": alert.get("disaster_id"), "type": "DISASTER_STATUS",
            "priority": ALERT_PRIORITY.get(alert["level"], "HIGH"),
            "payload": {"message": text, "from": "Volentify incident command", "official": True,
                        "alert_code": alert["code"], "level": alert["level"], "area": f"{alert['location']}, {alert['state']}"},
            "lat": d["lat"] if d else None, "lng": d["lng"] if d else None,
            "observed_at": created.isoformat() if isinstance(created, datetime) else created,
            "hop_count": 0, "ttl": DOWNLINK_TTL}


def _wire(ev: dict) -> dict:
    observed = ev["observed_at"]
    return {"event_id": ev["event_id"], "origin_node_id": ev["origin_node_id"], "disaster_id": ev.get("disaster_id"),
            "type": ev["type"], "priority": ev["priority"], "payload": ev["payload"], "lat": ev.get("lat"),
            "lng": ev.get("lng"), "observed_at": observed.isoformat() if isinstance(observed, datetime) else observed,
            "hop_count": ev.get("hop_count", 0), "ttl": min(DOWNLINK_TTL, int(ev.get("ttl") or 0))}


def _uuid(value: str) -> bool:
    try:
        return len(value) == 36 and str(uuid.UUID(value)) == value.lower()
    except ValueError:
        return False


@router.get("/downlink")
def downlink(request: Request, response: Response, since: Optional[datetime] = None,
             lat: Optional[float] = Query(None, ge=-90, le=90), lng: Optional[float] = Query(None, ge=-180, le=180),
             radius_km: float = Query(75.0, gt=0, le=300), token: Optional[dict] = Depends(optional_mesh_token)):
    """What an online phone should carry back into the offline mesh.

    * every alert broadcast by verified incident command in the last 24 h (marked official),
    * messages sent from the website by signed-in volunteers, NGOs and command (official only for command),
    * field reports from other phones within `radius_km` of the phone in the last 6 h (people-related reports
      redacted exactly as on the public website).
    Events are capped at three further hops. `server_time` is the `since` to send next time.
    """
    _downlink_limiter.check(f"downlink:{client_key(request)}")
    server_time = now()
    if since is not None and since.tzinfo is None:
        since = since.replace(tzinfo=timezone.utc)
    official_since = max(since or server_time - timedelta(hours=DOWNLINK_WINDOW_H),
                         server_time - timedelta(hours=DOWNLINK_WINDOW_H))
    nearby_since = max(since or server_time - timedelta(hours=DOWNLINK_NEARBY_H),
                       server_time - timedelta(hours=DOWNLINK_NEARBY_H))

    def load(store):
        disasters = {d["id"]: d for d in store.list_disasters()}
        alerts = [a for a in store.list_alerts(50) if a["created_at"] >= official_since]
        recent = store.list_mesh_events(since=min(official_since, nearby_since), limit=400)
        blocked = store.blocked_among(list({e["origin_node_id"] for e in recent}))
        return disasters, alerts, recent, blocked

    (disasters, alerts, recent, blocked), source = db.read(load)
    tag(response, source)
    events = [_alert_event(a, disasters) for a in alerts]
    for e in recent:
        if e["origin_node_id"] in blocked or e["review_status"] == "REJECTED" or not _uuid(e["event_id"]) \
                or not _uuid(e["origin_node_id"]):
            continue
        payload = e["payload"] if isinstance(e["payload"], dict) else {}
        from_web = payload.get("official") is not None and e["observed_at"] >= official_since
        near = (lat is not None and lng is not None and e.get("lat") is not None and e["observed_at"] >= nearby_since
                and haversine_km(lat, lng, e["lat"], e["lng"]) <= radius_km)
        if from_web or near:
            events.append(_wire(_redact(e)))
    events.sort(key=lambda e: e["observed_at"], reverse=True)
    incidents = [{"disaster_id": d["id"], "code": d["code"], "title": d["title"], "category": d["category"],
                  "severity": d["severity"], "center": (d["lat"], d["lng"]),
                  "bbox": bbox_around(d["lat"], d["lng"], d["radius_km"]), "radius_km": d["radius_km"]}
                 for d in disasters.values() if d["status"] == "ACTIVE"]
    return {"server_time": server_time.isoformat(), "events": events[:100], "incidents": incidents}
