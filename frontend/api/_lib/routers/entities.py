"""Core entity endpoints (PRD §10.5): incidents, missions, alerts, volunteers, resources, citizen reports, and the
public accountability views (transparency figures and past disasters)."""

from __future__ import annotations

import hashlib
import time
import uuid
from datetime import timedelta
from statistics import median
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status

from ..core import audit, db
from ..core.security import RateLimiter, client_key, current_claims, public_name, require_roles, require_session
from ..data.reference import HOTLINES
from ..engines import advisories, briefing, dispatch, history, intel, live, rules, transparency, triage
from ..engines.geo import haversine_km
from ..schemas import (
    Alert, AlertCreate, AvailabilityUpdate, CitizenReport, CitizenReportResponse, Disaster, Evidence, LocationUpdate,
    Organization, Review, ReviewCreate, SituationBriefing, Task, TaskCreate, TaskStatusUpdate, Volunteer,
)
from .common import new_code, new_id, now, tag

router = APIRouter(prefix="/api", tags=["entities"])
_report_limiter = RateLimiter(limit=6, window_s=60)
_review_limiter = RateLimiter(limit=20, window_s=3600)

PLACEHOLDER_LOCATION = (20.59, 78.96)  # onboarding default (India's centroid) — not a real position
MAX_ACTIVE_MISSIONS = 3
RECOMMEND_RADIUS_KM = 150.0
NAMESPACE = uuid.UUID("6f0c8a52-5d6b-4c8e-9a51-1b7c2d3e4f50")


def _trusted(claims: Optional[dict]) -> bool:
    return bool(claims and claims.get("role") in {"INCIDENT_ADMIN", "NGO_MEMBER"} and claims.get("verified"))


# ─── Disasters ──────────────────────────────────────────────────────────────

@router.get("/disasters", response_model=list[Disaster])
def list_disasters(response: Response, include_closed: bool = False):
    """Incidents from the live hazard feeds (GDACS, USGS, NASA EONET), refreshed at most every 15 minutes."""
    live.ensure_fresh()
    rows, source = db.read(lambda s: s.list_disasters(include_closed))
    tag(response, source)
    return rows


@router.get("/disasters/{disaster_id}")
def disaster_dossier(disaster_id: str, response: Response):
    """Incident dossier: the disaster with its evidence timeline, missions and alerts."""
    def load(store):
        d = store.get_disaster(disaster_id)
        if not d:
            return None
        return {"disaster": d, "evidence": store.list_evidence(d["id"]),
                "tasks": store.list_tasks(disaster_id=d["id"]),
                "alerts": [a for a in store.list_alerts() if a.get("disaster_id") == d["id"]]}

    data, source = db.read(load)
    if not data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Incident not found")
    tag(response, source)
    alerts = data["alerts"] + advisories.for_incidents([data["disaster"]])
    return {"disaster": Disaster.model_validate(data["disaster"]),
            "evidence": [Evidence.model_validate(e) for e in data["evidence"]],
            "tasks": [Task.model_validate(t) for t in data["tasks"]],
            "alerts": [Alert.model_validate(a) for a in alerts]}


@router.get("/disasters/{disaster_id}/briefing", response_model=SituationBriefing)
def disaster_briefing(disaster_id: str, response: Response):
    def load(store):
        d = store.get_disaster(disaster_id)
        return (d, store.list_evidence(d["id"])) if d else (None, [])

    (d, evidence), source = db.read(load)
    if not d:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Incident not found")
    if not evidence:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "No evidence recorded for this incident yet")
    tag(response, source)
    items = [{"id": e["id"], "source": e["source"], "source_type": e["source_type"],
              "timestamp": e["created_at"], "claim_text": e["claim_text"]} for e in evidence]
    return briefing.generate(d["code"], d["title"], d["location"], items)


# ─── Tasks / missions ───────────────────────────────────────────────────────

_watchdog: dict[str, Optional[float]] = {"at": None}


def mission_watchdog() -> None:
    """Ghost-assignment guard: missions accepted but not started within the limit go back to the open pool.

    Runs at most once a minute per instance, piggy-backing on mission reads (there is no background scheduler on
    serverless). Every automatic release is written to the audit log.
    """
    last = _watchdog["at"]
    if last is not None and time.monotonic() - last < 60:
        return
    _watchdog["at"] = time.monotonic()
    cutoff = now() - timedelta(minutes=rules.MISSION_START_MINUTES)
    try:
        released, _ = db.write(lambda s: s.release_stale_assignments(cutoff))
    except Exception:  # noqa: BLE001 — never fail the read that triggered it
        return
    for r in released or []:
        audit.record("task.auto_release", None, target_type="task", target_id=r["id"],
                     detail={"code": r.get("code"), "released_from": r.get("released_from"),
                             "reason": f"not started within {rules.MISSION_START_MINUTES} minutes"})


@router.get("/tasks", response_model=list[Task])
def list_tasks(request: Request, response: Response, status_: Optional[str] = Query(None, alias="status"),
               disaster_id: Optional[str] = None, mine: bool = False):
    mission_watchdog()
    assigned = None
    if mine:
        claims = current_claims(request)
        if not claims:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Sign in to see your missions")
        assigned = claims["sub"]
    rows, source = db.read(lambda s: s.list_tasks(status=status_, disaster_id=disaster_id, assigned_to=assigned))
    tag(response, source)
    return rows


@router.get("/tasks/{task_id}", response_model=Task)
def get_task(task_id: str, response: Response):
    row, source = db.read(lambda s: s.get_task(task_id))
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Mission not found")
    tag(response, source)
    return row


@router.post("/tasks", response_model=Task, status_code=status.HTTP_201_CREATED)
def create_task(body: TaskCreate, request: Request, response: Response,
                claims: dict = Depends(require_roles("INCIDENT_ADMIN", "NGO_MEMBER"))):
    ts = now()
    task = {**body.model_dump(), "id": new_id("tsk"), "code": new_code("TSK"), "status": "OPEN",
            "created_by_id": claims["sub"], "assigned_to_id": None, "created_at": ts, "updated_at": ts}

    def create(store):
        if not store.get_disaster(body.disaster_id):
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Unknown incident")
        return store.create_task(task)

    row, source = db.write(create)
    tag(response, source)
    audit.record("task.create", claims, target_type="task", target_id=row["id"], request=request,
                 detail={"code": row["code"], "urgency": row["urgency"], "skill": row["required_skill"],
                         "disaster_id": row["disaster_id"]})
    return row


@router.post("/tasks/{task_id}/accept", response_model=Task)
def accept_task(task_id: str, request: Request, response: Response,
                claims: dict = Depends(require_roles("VOLUNTEER"))):
    def accept(store):
        task = store.get_task(task_id)
        if not task:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Mission not found")
        if task["status"] != "OPEN":
            raise HTTPException(status.HTTP_409_CONFLICT, "This mission has already been taken")
        vol = store.get_volunteer_by_user(claims["sub"])
        if vol and vol.get("availability") == "OFFLINE":
            raise HTTPException(status.HTTP_409_CONFLICT, "You are off duty — set yourself available first")
        active = [t for t in store.list_tasks(assigned_to=claims["sub"]) if t["status"] in db.ACTIVE_TASK_STATES]
        if len(active) >= MAX_ACTIVE_MISSIONS:
            raise HTTPException(status.HTTP_409_CONFLICT, f"You already hold {MAX_ACTIVE_MISSIONS} active missions — "
                                                          "finish or release one first")
        return store.update_task(task_id, {"status": "ASSIGNED", "assigned_to_id": claims["sub"],
                                           "accepted_at": now()})

    row, source = db.write(accept)
    tag(response, source)
    audit.record("task.accept", claims, target_type="task", target_id=task_id, request=request,
                 detail={"code": row["code"]})
    return row


@router.patch("/tasks/{task_id}", response_model=Task)
def update_task_status(task_id: str, body: TaskStatusUpdate, request: Request, response: Response,
                       claims: dict = Depends(require_session)):
    ts = now()

    def update(store):
        task = store.get_task(task_id)
        if not task:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Mission not found")
        is_owner = task["assigned_to_id"] == claims["sub"]
        is_command = _trusted(claims)
        if not (is_owner or is_command):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Only the assigned responder or command can update this")
        fields: dict = {"status": body.status}
        owner = task["assigned_to_id"]
        if body.status == "OPEN":
            fields.update(assigned_to_id=None, accepted_at=None, started_at=None, start_lat=None, start_lng=None)
        elif body.status == "ASSIGNED":
            if not owner:
                raise HTTPException(status.HTTP_409_CONFLICT, "Nobody has accepted this mission yet")
        elif body.status == "IN_PROGRESS":
            if task["status"] not in {"ASSIGNED", "IN_PROGRESS"} or not owner:
                raise HTTPException(status.HTTP_409_CONFLICT, "Accept the mission before starting it")
            fields["started_at"] = task.get("started_at") or ts
            if body.lat is not None:
                fields.update(start_lat=body.lat, start_lng=body.lng)
        elif body.status == "COMPLETED":
            if task["status"] not in {"ASSIGNED", "IN_PROGRESS"} or not owner:
                raise HTTPException(status.HTTP_409_CONFLICT, "Only an accepted mission can be completed")
            fields["completed_at"] = ts
            if body.people_helped is not None:
                fields["people_helped"] = body.people_helped
            if body.outcome_note:
                fields["outcome_note"], _ = rules.scrub_pii(body.outcome_note.strip())
        elif body.status == "CANCELLED" and not is_command:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Only incident command can cancel a mission")
        updated = store.update_task(task_id, fields)

        # Keep the responder's profile in step: where they set off from, busy while out, hours when done.
        if owner and body.status == "IN_PROGRESS":
            if body.lat is not None:
                store.set_volunteer_location(owner, body.lat, body.lng, body.location_name)
            vol = store.get_volunteer_by_user(owner)
            if vol and vol["availability"] != "BUSY":
                store.set_availability(vol["id"], "BUSY")
        if owner and body.status == "COMPLETED":
            started = task.get("started_at")
            hours = min(72.0, max(0.0, (ts - started).total_seconds() / 3600)) if started else 0.0
            store.record_mission_completion(owner, round(hours, 2))
            vol = store.get_volunteer_by_user(owner)
            others = [t for t in store.list_tasks(assigned_to=owner)
                      if t["id"] != task_id and t["status"] in db.ACTIVE_TASK_STATES]
            if vol and vol["availability"] == "BUSY" and not others:
                store.set_availability(vol["id"], "AVAILABLE")
        return updated

    row, source = db.write(update)
    tag(response, source)
    audit.record(f"task.{body.status.lower()}", claims, target_type="task", target_id=task_id, request=request,
                 detail={"code": row["code"], **({"people_helped": body.people_helped}
                                                 if body.people_helped is not None else {})})
    return row


# ─── Alerts ─────────────────────────────────────────────────────────────────

@router.get("/alerts", response_model=list[Alert])
def list_alerts(response: Response, limit: int = Query(100, ge=1, le=500), include_auto: bool = True):
    """Broadcasts by verified incident commanders, plus automated advisories for active incidents affecting India.

    Automated advisories carry kind="AUTO" and are never presented as official warnings.
    """
    if include_auto:
        live.ensure_fresh()

    def load(store):
        alerts = store.list_alerts(limit)
        return alerts + (advisories.for_incidents(store.list_disasters()) if include_auto else [])

    rows, source = db.read(load)
    tag(response, source)
    for r in rows:
        r.setdefault("created_at", None)
        if r["created_at"] is None:
            r["created_at"] = now()
    return rows


@router.post("/alerts", response_model=Alert, status_code=status.HTTP_201_CREATED)
def broadcast_alert(body: AlertCreate, request: Request, response: Response,
                    claims: dict = Depends(require_roles("INCIDENT_ADMIN"))):
    alert = {**body.model_dump(), "id": new_id("alt"), "code": new_code("ALT"), "sender_id": claims["sub"],
             "created_at": now()}
    row, source = db.write(lambda s: s.create_alert(alert))
    tag(response, source)
    audit.record("alert.broadcast", claims, target_type="alert", target_id=alert["id"], request=request,
                 detail={"code": alert["code"], "level": alert["level"], "category": alert["category"],
                         "state": alert["state"]})
    return row


# ─── Volunteers & organisations ─────────────────────────────────────────────

def _coarse(vol: dict, digits: int = 2) -> dict:
    """Public views get volunteer positions rounded (2 decimals ≈ 1 km); command sees them exactly."""
    return {**vol, "lat": round(vol["lat"], digits), "lng": round(vol["lng"], digits)}


@router.get("/volunteers", response_model=list[Volunteer])
def list_volunteers(request: Request, response: Response,
                    availability: Literal["AVAILABLE", "BUSY", "OFFLINE", "ALL"] = "ALL"):
    rows, source = db.read(lambda s: s.list_volunteers(None if availability == "ALL" else availability))
    tag(response, source)
    claims = current_claims(request)
    if _trusted(claims):
        return rows
    # Public: positions to ~1 km; signed-out visitors (and scrapers) see first name and initial only.
    return [_coarse(v) if claims else {**_coarse(v), "name": public_name(v["name"])} for v in rows]


@router.get("/volunteers/me", response_model=Volunteer)
def my_volunteer_profile(response: Response, claims: dict = Depends(require_session)):
    row, source = db.read(lambda s: s.get_volunteer_by_user(claims["sub"]))
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No volunteer profile — complete onboarding as a volunteer")
    tag(response, source)
    return row


@router.patch("/volunteers/me/location", response_model=Volunteer)
def update_my_location(body: LocationUpdate, response: Response, claims: dict = Depends(require_session)):
    def update(store):
        if not store.get_volunteer_by_user(claims["sub"]):
            raise HTTPException(status.HTTP_404_NOT_FOUND, "No volunteer profile — complete onboarding as a volunteer")
        store.set_volunteer_location(claims["sub"], body.lat, body.lng, body.location_name)
        return store.get_volunteer_by_user(claims["sub"])

    row, source = db.write(update)
    tag(response, source)
    return row


def _is_message(ev: dict) -> bool:
    payload = ev.get("payload") if isinstance(ev.get("payload"), dict) else {}
    return ev["type"] == "DISASTER_STATUS" and bool(payload.get("message"))


@router.get("/volunteers/me/recommendations")
def my_recommendations(response: Response, claims: dict = Depends(require_session)):
    """Open missions and unconverted field reports ranked for the signed-in volunteer.

    Uses the dispatch engine's own terms — urgency weight, skill similarity (exact / related / general) and distance
    decay — so a recommendation here agrees with the dispatch board. A report or mission is *recommended* when the
    volunteer is qualified for it (specialist work never goes to untrained hands) and it is within 150 km.
    """
    from .mesh import PRIORITY_TO_URGENCY, skill_for_event

    def load(store):
        vol = store.get_volunteer_by_user(claims["sub"])
        if not vol:
            return None
        return vol, store.list_tasks(status="OPEN"), store.list_mesh_events(limit=300)

    data, source = db.read(load)
    if not data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No volunteer profile — complete onboarding as a volunteer")
    vol, tasks, events = data
    tag(response, source)
    located = (round(vol["lat"], 2), round(vol["lng"], 2)) != PLACEHOLDER_LOCATION

    def rank(skill: str, urgency: str, lat: Optional[float], lng: Optional[float]) -> dict:
        sim = dispatch.similarity(skill, vol["skills"])
        qualified = dispatch.eligible(skill, sim)
        distance = haversine_km(vol["lat"], vol["lng"], lat, lng) if located and lat is not None else None
        decay = 1.0 / (1.0 + distance / dispatch.D0_KM) if distance is not None else 0.5
        tier = "exact" if sim == dispatch.SIM_EXACT else "related" if sim == dispatch.SIM_ADJACENT else "general"
        near = distance is None or distance <= RECOMMEND_RADIUS_KM
        reasons = [f"{urgency.title()} urgency", f"{tier} skill match ({skill})"]
        reasons.append(f"{distance:.1f} km away" if distance is not None else "distance unknown")
        if not qualified:
            reasons.append("needs a trained specialist")
        return {"score": round(dispatch.URGENCY_WEIGHT.get(urgency, 1.0) * sim * decay, 4),
                "distance_km": round(distance, 1) if distance is not None else None, "skill": skill,
                "skill_match": tier, "qualified": qualified, "recommended": qualified and near,
                "reason": " · ".join(reasons)}

    task_recs = [{"task_id": t["id"], **rank(t["required_skill"], t["urgency"], t["lat"], t["lng"])} for t in tasks]
    report_recs = []
    for e in events:
        if _is_message(e) or e["review_status"] in {"PROMOTED", "REJECTED"}:
            continue
        payload = e["payload"] if isinstance(e["payload"], dict) else {}
        report_recs.append({"event_id": e["event_id"],
                            **rank(skill_for_event(e["type"], payload), PRIORITY_TO_URGENCY.get(e["priority"], "HIGH"),
                                   e.get("lat"), e.get("lng"))})
    order = lambda r: (not r["recommended"], -r["score"])  # noqa: E731
    return {"volunteer_id": vol["id"], "skills": vol["skills"], "located": located,
            "location_name": vol.get("location_name"), "radius_km": RECOMMEND_RADIUS_KM,
            "tasks": sorted(task_recs, key=order), "reports": sorted(report_recs, key=order)}


@router.post("/volunteer/availability", response_model=Volunteer)
def set_availability(body: AvailabilityUpdate, response: Response, claims: dict = Depends(require_session)):
    def update(store):
        own = store.get_volunteer_by_user(claims["sub"])
        if not _trusted(claims) and (not own or own["id"] != body.volunteer_id):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "You can only change your own availability")
        return store.set_availability(body.volunteer_id, body.availability)

    row, source = db.write(update)
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Volunteer not found")
    tag(response, source)
    return row


def _badge(completed: int) -> str:
    if completed >= 20:
        return "Veteran responder"
    if completed >= 5:
        return "Seasoned responder"
    if completed >= 1:
        return "Field responder"
    return "New responder"


def _profile(store, vol: dict, claims: Optional[dict]) -> dict:
    user_id = vol["user_id"]
    user = store.get_user(user_id) or {}
    is_self = bool(claims and claims.get("sub") == user_id)
    full = is_self or _trusted(claims)
    tasks = store.list_tasks(assigned_to=user_id)
    reviews = store.list_reviews(user_id)
    titles: dict[str, str] = {}
    for t in tasks[:40]:
        if t["disaster_id"] not in titles:
            d = store.get_disaster(t["disaster_id"])
            titles[t["disaster_id"]] = d["title"] if d else "Incident"

    completed = [t for t in tasks if t["status"] == "COMPLETED"]
    active = [t for t in tasks if t["status"] in db.ACTIVE_TASK_STATES]
    hours = sum(min(72.0, (t["completed_at"] - t["started_at"]).total_seconds() / 3600)
                for t in completed if t.get("completed_at") and t.get("started_at") and t["completed_at"] >= t["started_at"])
    starts = [(t["started_at"] - t["accepted_at"]).total_seconds() / 60 for t in tasks
              if t.get("started_at") and t.get("accepted_at") and t["started_at"] >= t["accepted_at"]]
    ratings = [r["rating"] for r in reviews]
    viewer_review = next((r for r in reviews if claims and r["author_id"] == claims.get("sub")), None)

    def mission(t: dict) -> dict:
        item = {k: t.get(k) for k in ("id", "code", "title", "urgency", "status", "required_skill", "location_name",
                                      "disaster_id", "created_at", "accepted_at", "started_at", "completed_at",
                                      "people_helped")}
        item["disaster_title"] = titles.get(t["disaster_id"], "Incident")
        if full:
            item["outcome_note"] = t.get("outcome_note")
        return item

    profile_vol = vol if full else _coarse(vol, 1)
    return {
        "volunteer": Volunteer.model_validate(profile_vol).model_dump(),
        "is_self": is_self,
        "member_since": user.get("created_at"),
        "district": user.get("state_district") or vol.get("location_name"),
        "avatar_url": user.get("avatar_url"),
        "badge": _badge(len(completed)),
        "stats": {
            "missions_completed": len(completed), "missions_active": len(active),
            "hours": round(hours, 1), "people_helped": sum(int(t.get("people_helped") or 0) for t in completed),
            "median_minutes_to_start": round(median(starts), 1) if starts else None,
            "average_rating": round(sum(ratings) / len(ratings), 2) if ratings else None,
            "reviews": len(ratings),
            "rating_counts": {str(n): ratings.count(n) for n in range(1, 6)},
        },
        "history": [mission(t) for t in tasks[:60]],
        "reviews": [Review.model_validate(r).model_dump() for r in reviews],
        "can_review": bool(claims and not is_self and claims.get("onboarded")),
        "viewer_review": Review.model_validate(viewer_review).model_dump() if viewer_review else None,
        "reviewable_missions": [{"id": t["id"], "code": t["code"], "title": t["title"]} for t in completed[:20]],
    }


@router.get("/volunteers/{volunteer_id}/profile")
def volunteer_profile(volunteer_id: str, request: Request, response: Response):
    """Public responder profile: current status, mission history, impact and reviews by other members.

    Contact details are never included; the position is shown to about 10 km unless the viewer is the volunteer or
    verified command.
    """
    claims = current_claims(request)

    def load(store):
        if volunteer_id == "me":
            if not claims:
                raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Sign in to see your profile")
            vol = store.get_volunteer_by_user(claims["sub"])
        else:
            vol = store.get_volunteer(volunteer_id)
        return _profile(store, vol, claims) if vol else None

    data, source = db.read(load)
    if not data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Volunteer not found")
    tag(response, source)
    if not claims:  # signed-out visitors and scrapers: first names and initials only
        data["volunteer"]["name"] = public_name(data["volunteer"]["name"])
        for r in data["reviews"]:
            r["author_name"] = public_name(r["author_name"])
    response.headers["X-Robots-Tag"] = "noindex, nofollow"
    return data


@router.post("/volunteers/{volunteer_id}/reviews", response_model=Review, status_code=status.HTTP_201_CREATED)
def review_volunteer(volunteer_id: str, body: ReviewCreate, request: Request, response: Response,
                     claims: dict = Depends(require_session)):
    """One review per member per volunteer (sending again edits it). Phone and ID numbers are removed from comments."""
    if not claims.get("onboarded"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Complete your profile before reviewing others")
    _review_limiter.check(claims["sub"])
    comment, _ = rules.scrub_pii(body.comment.strip())

    def save(store):
        vol = store.get_volunteer(volunteer_id)
        if not vol:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Volunteer not found")
        if vol["user_id"] == claims["sub"]:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "You cannot review yourself")
        if body.task_id:
            task = store.get_task(body.task_id)
            if not task or task.get("assigned_to_id") != vol["user_id"]:
                raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "That mission was not carried out by this volunteer")
        ts = now()
        saved = store.upsert_review({"id": new_id("rev"), "volunteer_user_id": vol["user_id"],
                                     "author_id": claims["sub"], "task_id": body.task_id, "rating": body.rating,
                                     "comment": comment, "created_at": ts, "updated_at": ts})
        return next((r for r in store.list_reviews(vol["user_id"]) if r["id"] == saved["id"]), saved)

    row, source = db.write(save)
    tag(response, source)
    audit.record("review.upsert", claims, target_type="volunteer", target_id=volunteer_id, request=request,
                 detail={"rating": body.rating})
    return row


@router.get("/organizations", response_model=list[Organization])
def list_organizations(response: Response):
    rows, source = db.read(lambda s: s.list_organizations())
    tag(response, source)
    return rows


def _cache_get(key: str, max_age_s):
    try:
        return db.read(lambda s: s.cache_get(key, max_age_s))[0]
    except Exception:  # noqa: BLE001 — a cache miss is never an error
        return None


def _cache_put(key: str, value) -> None:
    try:
        db.write(lambda s: s.cache_put(key, value))
    except Exception:  # noqa: BLE001
        pass


# ─── Emergency resources ────────────────────────────────────────────────────

ATTRIBUTION = "Facility locations © OpenStreetMap contributors (ODbL)"


@router.get("/resources")
def emergency_resources(response: Response, disaster_id: Optional[str] = None):
    """National helplines, plus hospitals and relief shelters mapped in OpenStreetMap.

    Without `disaster_id`: around the (up to four) most severe active incidents on land. With it: around that
    incident, nearest first. Never waits more than ~11 s on OpenStreetMap; when it can't answer, `mode` is OFFLINE
    and `query` holds the Overpass query so the browser can try it directly.
    """
    incidents, source = db.read(lambda s: s.list_disasters())
    tag(response, source)
    if disaster_id:
        incident = next((d for d in incidents if d["id"] == disaster_id or d["code"] == disaster_id), None)
        if not incident:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Incident not found or no longer active")
        facilities = intel.facilities_for_incident(incident, _cache_get, _cache_put)
    else:
        facilities = intel.relief_facilities(incidents, _cache_get, _cache_put)
    return {"hotlines": HOTLINES, "hospitals": facilities["hospitals"], "shelters": facilities["shelters"],
            "mode": facilities["mode"], "fetched_at": facilities.get("fetched_at"), "query": facilities.get("query"),
            "attribution": ATTRIBUTION}


@router.get("/resources/nearby")
def resources_nearby(lat: float = Query(ge=-90, le=90), lng: float = Query(ge=-180, le=180),
                     radius_km: float = Query(15.0, gt=0, le=30)):
    """Hospitals and shelters around a point (the visitor's own location), nearest first."""
    facilities = intel.facilities_near(lat, lng, radius_km, _cache_get, _cache_put)
    return {"hotlines": HOTLINES, "hospitals": facilities["hospitals"], "shelters": facilities["shelters"],
            "mode": facilities["mode"], "fetched_at": facilities.get("fetched_at"), "query": facilities.get("query"),
            "attribution": ATTRIBUTION}


# ─── Citizen incident reports (web counterpart of mesh field reports) ───────

def _report_type(result: dict) -> str:
    flags = result.get("flags") or {}
    kind = str(result.get("disaster_type") or "").lower()
    if flags.get("trapped_civilians"):
        return "PERSON_TRAPPED"
    if flags.get("medical_emergency"):
        return "MEDICAL_EMERGENCY"
    if "fire" in kind:
        return "FIRE"
    if "flood" in kind or "cyclone" in kind:
        return "FLOOD"
    if flags.get("food_water_needed"):
        return "RESOURCE_REQUEST"
    return "DISASTER_STATUS"


@router.post("/reports", response_model=CitizenReportResponse, status_code=status.HTTP_201_CREATED)
def submit_report(body: CitizenReport, request: Request, response: Response):
    """A report from the website becomes a field report like any mesh report: unverified until command reviews it,
    visible on the map, the volunteer board and the review queue — whether or not it falls inside an incident."""
    _report_limiter.check(client_key(request))
    text, removed = rules.scrub_pii(body.text.strip())
    result = triage.triage(text, body.location)
    if body.website:  # honeypot filled in: answer like a success so the bot learns nothing, store nothing
        return {"reference": new_code("REP"), "triage": result, "linked_disaster_id": None, "stored": True, "removed": []}
    claims = current_claims(request)
    secret = hashlib.sha256(f"web-report|{claims['sub'] if claims else client_key(request)}".encode()).hexdigest()
    node = str(uuid.uuid5(NAMESPACE, f"web-report:{secret[:24]}"))
    event_type = _report_type(result)
    priority = rules.cap_priority(event_type, {"CRITICAL": "CRITICAL", "HIGH": "HIGH", "MODERATE": "MEDIUM"}
                                  .get(result["severity"], "LOW"))
    ts = now()

    def store_report(store):
        if store.blocked_among([node]):
            return None, None
        disaster = store.get_disaster(body.disaster_id) if body.disaster_id else None
        if disaster is None and body.lat is not None and body.lng is not None:
            nearest = min(store.list_disasters(), default=None,
                          key=lambda d: haversine_km(body.lat, body.lng, d["lat"], d["lng"]))
            if nearest and haversine_km(body.lat, body.lng, nearest["lat"], nearest["lng"]) <= nearest["radius_km"] * 2:
                disaster = nearest
        store.upsert_node(node, {"last_lat": body.lat, "last_lng": body.lng})
        payload = {"notes": text[:500], "location_text": body.location.strip()[:160], "source": "web",
                   **({"needs": result["needs"][:6]} if result.get("needs") else {}),
                   **({"count": result["trapped_count"]} if isinstance(result.get("trapped_count"), int) else {})}
        event_id = str(uuid.uuid4())
        store.insert_mesh_event({
            "id": new_id("me"), "event_id": event_id, "origin_node_id": node,
            "disaster_id": disaster["id"] if disaster else None, "type": event_type, "priority": priority,
            "payload": payload, "lat": body.lat, "lng": body.lng, "observed_at": ts, "hop_count": 0, "ttl": 0,
            "received_at": ts, "review_status": "UNREVIEWED", "promoted_task_id": None})
        if disaster:
            store.add_evidence({
                "id": new_id("ev"), "disaster_id": disaster["id"], "author_id": claims["sub"] if claims else None,
                "source": "Citizen report", "source_type": "CITIZEN",
                "claim_text": f"{text} ({body.location.strip()})", "relation": "SUPPORTING",
                "confidence": result["confidence"], "language": result["language"], "created_at": ts,
            })
        return event_id, disaster["id"] if disaster else None

    (event_id, linked), source = db.write(store_report)
    tag(response, source)
    return {"reference": f"REP-{(event_id or new_code('X'))[:6].upper()}", "triage": result,
            "linked_disaster_id": linked, "stored": event_id is not None and source != "fallback",
            "removed": removed}


# ─── Accountability: transparency figures and past disasters ────────────────

_transparency_cache: dict[str, tuple[float, dict]] = {}


@router.get("/transparency")
def transparency_report(response: Response):
    """Proactive disclosure (in the spirit of RTI Act 2005 s.4(1)(b)): aggregate figures only, no personal data."""
    hit = _transparency_cache.get("report")
    if hit and time.monotonic() - hit[0] < 60:
        response.headers["Cache-Control"] = "public, max-age=60"
        return hit[1]
    raw, source = db.read(lambda s: s.transparency_rows())
    tag(response, source)
    report = {**transparency.build(raw), "data_source": source}
    _transparency_cache["report"] = (time.monotonic(), report)
    response.headers["Cache-Control"] = "public, max-age=60"
    return report


@router.get("/analytics/history")
def disaster_history(response: Response, months: int = Query(12, ge=1, le=24)):
    """Past disasters in and around India: incidents Volentify tracked and closed, plus the GDACS and USGS archives."""
    register, source = db.read(lambda s: s.list_disasters(include_closed=True))
    tag(response, source)
    return history.past_disasters(register, _cache_get, _cache_put, months=months)
