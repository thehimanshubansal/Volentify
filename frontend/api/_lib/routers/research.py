"""Research archive APIs: scheduled collection, a public summary and data export for analysis."""

from __future__ import annotations

import csv
import io
import json
from collections import Counter
from datetime import datetime
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import PlainTextResponse

from ..core import db, research
from ..core.security import RateLimiter, require_roles
from ..engines import cyclone, intel, live

router = APIRouter(prefix="/api/research", tags=["research"])
_collect_limiter = RateLimiter(limit=4, window_s=3600)


def _snapshot(store) -> dict:
    disasters = store.list_disasters()
    tasks = store.list_tasks()
    volunteers = store.list_volunteers()
    nodes = store.list_mesh_nodes()
    events = store.list_mesh_events(None, None, None, None, 500)
    return {
        "disasters": dict(Counter(f'{d["category"]}:{d["severity"]}' for d in disasters if d["status"] == "ACTIVE")),
        "tasks": dict(Counter(t["status"] for t in tasks)),
        "open_tasks_by_urgency": dict(Counter(t["urgency"] for t in tasks if t["status"] == "OPEN")),
        "volunteers": dict(Counter(v["availability"] for v in volunteers)),
        "mesh_nodes_active": sum(1 for n in nodes if db.node_is_active(n["last_seen_at"])),
        "mesh_nodes_total": len(nodes),
        "mesh_events_recent": dict(Counter(e["type"] for e in events)),
        "mesh_hops_recent": dict(Counter(str(e["hop_count"]) for e in events)),
    }


@router.post("/collect")
async def collect():
    """Called on a schedule (GitHub Actions, every 3 hours): pull live feeds and archive a platform snapshot."""
    _collect_limiter.check("collect")
    feed = await intel.sachet_bulletins(limit=200)  # live items are archived inside sachet_bulletins
    hazards = await run_in_threadpool(live.ensure_fresh)
    card = cyclone.model_card()
    recorded = {"cap_feed_mode": feed["mode"], "cap_items_seen": len(feed["items"]), "hazard_feeds": hazards}
    if card:
        recorded["model_version_new"] = bool(research.record(
            "model_version", card.get("name", "cyclone"), card, ref=f'{card.get("name")}@{card.get("version")}'))
    snapshot, source = db.read(_snapshot)
    research.record("platform_snapshot", source, snapshot)
    recorded["snapshot_source"] = source
    recorded["archive"] = research.summary()
    return recorded


@router.get("/summary")
def summary():
    """What the archive holds: row counts and the time span per record kind."""
    try:
        return {"kinds": research.summary(), "database": db.database_status()}
    except Exception as exc:  # noqa: BLE001
        if db._is_db_error(exc):
            raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Archive database unavailable")
        raise


@router.get("/export", response_class=PlainTextResponse)
def export(kind: Optional[Literal[research.KINDS]] = None,  # type: ignore[valid-type]
           since: Optional[datetime] = None, format: Literal["jsonl", "csv"] = "jsonl",
           limit: int = Query(10000, ge=1, le=100000),
           _: dict = Depends(require_roles("INCIDENT_ADMIN", "RESEARCHER"))):
    """Download archived records for analysis (JSON Lines, or CSV with the payload as a JSON column)."""
    rows = research.query(kind, since, limit)
    stamp = f'volentify-{kind or "archive"}'
    if format == "csv":
        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow(["id", "kind", "source", "ref", "recorded_at", "payload"])
        for r in rows:
            writer.writerow([r["id"], r["kind"], r["source"], r["ref"], r["recorded_at"].isoformat(),
                             json.dumps(r["payload"], ensure_ascii=False)])
        body, media = buf.getvalue(), "text/csv"
    else:
        body = "\n".join(json.dumps({**r, "recorded_at": r["recorded_at"].isoformat()}, ensure_ascii=False)
                         for r in rows)
        media = "application/x-ndjson"
    return PlainTextResponse(body, media_type=media,
                             headers={"Content-Disposition": f'attachment; filename="{stamp}.{format}"'})
