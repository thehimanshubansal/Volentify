"""ML inference, dispatch optimisation and situational-intelligence endpoints (PRD §10.3–10.5)."""

from __future__ import annotations

from fastapi import APIRouter, Query, Request, Response
from fastapi.concurrency import run_in_threadpool

from ..core import db, research
from ..core.security import RateLimiter, current_claims, public_name
from ..engines import briefing, cyclone, dedup, dispatch, intel, live, rules, surge, triage
from ..schemas import (
    BriefingRequest, DeduplicatedEvent, DispatchRequest, DispatchResult, MatchRequest, NearbyRequest,
    PredictionRequest, PredictionResponse, RankedMatch, RawReport, SituationBriefing, TriageRequest,
    TriageResponse,
)
from .common import tag

router = APIRouter(prefix="/api", tags=["intelligence"])
_refresh_limiter = RateLimiter(limit=30, window_s=3600)


@router.post("/predict", response_model=PredictionResponse)
def predict(body: PredictionRequest):
    inputs = body.model_dump()
    result = surge.predict(inputs)
    research.record("forecast", str(result.get("model", "surge")), {"input": inputs, "output": result})
    return result


@router.get("/ml/models")
def ml_models():
    """Model cards for the trained models this deployment serves (empty until the pipeline has run)."""
    card = cyclone.model_card()
    return {"cyclone": card, "trained": card is not None, "dispatch": cyclone.dispatch_benchmark()}


@router.post("/triage/laya", response_model=TriageResponse)
def laya_triage(body: TriageRequest):
    return triage.triage(body.text, body.location, body.language_hint)


@router.post("/events/ingest", response_model=list[DeduplicatedEvent])
def events_ingest(reports: list[RawReport]):
    return dedup.deduplicate([r.model_dump() for r in reports])


@router.post("/briefing/generate", response_model=SituationBriefing)
def briefing_generate(body: BriefingRequest):
    return briefing.generate(body.event_id, body.event_label, body.location,
                             [e.model_dump() for e in body.evidence])


@router.post("/match", response_model=list[RankedMatch])
def match(body: MatchRequest, request: Request, response: Response):
    if body.volunteers is not None:
        volunteers, source = [v.model_dump() for v in body.volunteers], "request"
    else:
        volunteers, source = db.read(lambda s: s.list_volunteers())
    tag(response, source)
    ranked = dispatch.rank_volunteers(body.task.model_dump(), volunteers)
    if source != "request" and not current_claims(request):
        ranked = [{**r, "name": public_name(r["name"])} for r in ranked]
    return ranked


@router.post("/match/dispatch-batch", response_model=DispatchResult)
def dispatch_batch(request: Request, response: Response, body: DispatchRequest | None = None):
    body = body or DispatchRequest()

    def load(store):
        tasks = [t.model_dump() for t in body.tasks] if body.tasks is not None else store.list_tasks(status="OPEN")
        vols = ([v.model_dump() for v in body.volunteers] if body.volunteers is not None
                else store.list_volunteers())
        return tasks, vols

    (tasks, volunteers), source = db.read(load)
    tag(response, source)
    result = dispatch.dispatch_batch(tasks, volunteers)
    out = result if isinstance(result, dict) else result.model_dump()
    research.record("dispatch_run", f"sperling/{source}", {
        "tiers": out.get("tiers"), "completeness": out.get("completeness"), "latency_ms": out.get("latency_ms"),
        "tasks_evaluated": out.get("tasks_evaluated"), "volunteers_evaluated": out.get("volunteers_evaluated"),
        "scarcity": out.get("scarcity"), "bottlenecks": len(out.get("bottlenecks") or []),
        "assignment_scores": [a.get("score") if isinstance(a, dict) else getattr(a, "score", None)
                              for a in out.get("assignments") or []],
    })
    if body.volunteers is None and not current_claims(request):
        out = {**out, "assignments": [{**a, "volunteer_name": public_name(a["volunteer_name"])}
                                      for a in out.get("assignments") or []]}
        return out
    return result


@router.post("/infrastructure/nearby")
async def infrastructure_nearby(body: NearbyRequest):
    return await intel.nearby_infrastructure(body.lat, body.lng, body.radius_km)


@router.get("/bhuvan/layers")
def imagery_layers():
    return intel.imagery_layers()


@router.get("/bhuvan/bulletins")
async def bulletins(limit: int = Query(40, ge=1, le=200)):
    """Official CAP warnings in force (NDMA SACHET), newest first; expired warnings are removed."""
    return await intel.sachet_bulletins(limit=limit)


# ─── Live feeds ─────────────────────────────────────────────────────────────

@router.api_route("/live/refresh", methods=["GET", "POST"])
async def live_refresh():
    """Refresh the live hazard feeds if they are more than two minutes old, then warm the facility cache.

    Called every 15 minutes by .github/workflows/live-feeds.yml so visitors rarely wait for a refresh.
    """
    _refresh_limiter.check("live-refresh")
    report = await run_in_threadpool(live.ensure_fresh, False, 120)
    incidents, _ = await run_in_threadpool(db.read, lambda s: s.list_disasters())
    from .entities import _cache_get, _cache_put, mission_watchdog
    facilities = await run_in_threadpool(intel.relief_facilities, incidents, _cache_get, _cache_put)
    bulletins = await intel.sachet_bulletins(limit=1)
    await run_in_threadpool(mission_watchdog)
    minimised = await run_in_threadpool(_minimise_old_reports)
    await run_in_threadpool(_prune_rate_limits)
    return {**report, "active_incidents": len(incidents), "facilities_mode": facilities["mode"],
            "hospitals": len(facilities["hospitals"]), "shelters": len(facilities["shelters"]),
            "bulletins_mode": bulletins["mode"], "reports_minimised": minimised}


def _prune_rate_limits() -> None:
    try:
        pg = db._postgres()
        if pg is not None:
            pg.prune_rate_limits()
    except Exception:  # noqa: BLE001
        pass


def _minimise_old_reports() -> int:
    """Data minimisation (rules.RETENTION_DAYS): runs with the 15-minute live refresh."""
    from datetime import datetime, timedelta, timezone
    cutoff = datetime.now(timezone.utc) - timedelta(days=rules.RETENTION_DAYS)
    try:
        return db.write(lambda s: s.minimise_mesh_events(cutoff))[0]
    except Exception:  # noqa: BLE001
        return 0


@router.get("/live/status")
def live_status():
    """When the hazard feeds were last refreshed and how each source answered."""
    pg = db._postgres()
    stored = None
    if pg is not None:
        try:
            stored = pg.feed_status("hazards")
        except Exception as exc:  # noqa: BLE001
            if not db._is_db_error(exc):
                raise
    return {"this_instance": live.last_sync(), "database": stored, "refresh_interval_s": live.REFRESH_S,
            "sources": list(live.SOURCES), "region": live.REGION}
