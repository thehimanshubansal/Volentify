"""Past disasters in and around India, for the analytics history view.

Two sources, both real:
  * the platform's own register — incidents the live feeds tracked and later closed;
  * the public archives of GDACS (cyclones, floods, droughts, wildfires, volcanoes at Orange/Red alert, and every
    tropical cyclone) and USGS (earthquakes of magnitude 5.0+) for the last 12 months, fetched on demand and cached
    for 12 hours because the archive queries are slow.
The curated table of major disasters since 2013 (official death tolls with sources) lives in the frontend
(lib/reference-data.json) because it never changes at run time.
"""

from __future__ import annotations

import logging
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from typing import Any, Callable, Optional

import httpx

from . import live

log = logging.getLogger("volentify.history")

CACHE_TTL_S = 12 * 3600
ARCHIVE_TYPES = {"TC": "Green;Orange;Red", "FL": "Orange;Red", "DR": "Orange;Red", "WF": "Orange;Red",
                 "VO": "Orange;Red"}


def _row(inc: dict, status: str) -> dict[str, Any]:
    created = inc.get("created_at")
    return {
        "id": inc["id"], "title": inc["title"], "category": inc["category"], "severity": inc["severity"],
        "lat": inc["lat"], "lng": inc["lng"], "state": inc.get("state"), "location": inc.get("location"),
        "started_at": created.isoformat() if isinstance(created, datetime) else created,
        "source": inc.get("source"), "source_url": inc.get("source_url"), "summary": inc.get("summary"),
        "status": status,
    }


def fetch_archive(now: Optional[datetime] = None, months: int = 12) -> tuple[list[dict], dict[str, str]]:
    now = now or datetime.now(timezone.utc)
    start = now - timedelta(days=30 * months)
    status: dict[str, str] = {}

    def gdacs(client: httpx.Client, etype: str) -> list[dict]:
        params = {"eventlist": etype, "alertlevel": ARCHIVE_TYPES[etype], "fromDate": start.strftime("%Y-%m-%d"),
                  "toDate": (now + timedelta(days=1)).strftime("%Y-%m-%d")}
        resp = client.get(live.GDACS_URL, params=params, headers={"Accept": "application/json"})
        if resp.status_code == 204 or not resp.content.strip():
            return []
        resp.raise_for_status()
        return live.parse_gdacs(resp.json(), now, archive=True)

    def usgs(client: httpx.Client) -> list[dict]:
        params = {"format": "geojson", "starttime": start.strftime("%Y-%m-%dT%H:%M:%S"),
                  "minlatitude": live.REGION["min_lat"], "maxlatitude": live.REGION["max_lat"],
                  "minlongitude": live.REGION["min_lng"], "maxlongitude": live.REGION["max_lng"],
                  "minmagnitude": 5.0, "orderby": "time", "limit": 200}
        resp = client.get(live.USGS_URL, params=params)
        resp.raise_for_status()
        return live.parse_usgs(resp.json(), now)

    out: list[dict] = []
    # Every archive query runs in parallel: the whole fetch must fit well inside a 30 s serverless request.
    with httpx.Client(timeout=httpx.Timeout(9.0, connect=4.0), headers={"User-Agent": live.USER_AGENT},
                      follow_redirects=True) as client, ThreadPoolExecutor(max_workers=len(ARCHIVE_TYPES) + 1) as pool:
        futures = {f"GDACS {t}": pool.submit(gdacs, client, t) for t in ARCHIVE_TYPES}
        futures["USGS"] = pool.submit(usgs, client)
        for name, future in futures.items():
            source = name.split()[0]
            try:
                out += future.result(timeout=14)
                status.setdefault(source, "ok")
            except Exception as exc:  # noqa: BLE001 — one archive failing must not hide the others
                status[source] = type(exc).__name__ if status.get(source) != "ok" else "partial"
                log.warning("history archive %s failed: %s", name, exc)
    return out, status


def past_disasters(register: list[dict], cache_get: Callable, cache_put: Callable,
                   months: int = 12) -> dict[str, Any]:
    """Closed incidents from the register plus the public archive, newest first, de-duplicated by id."""
    closed = [_row(d, "CLOSED") for d in register if d.get("status") == "CLOSED"]
    key = f"history:{months}"
    cached = cache_get(key, CACHE_TTL_S)
    archive_status: dict[str, str]
    if cached:
        archive, archive_status, fetched_at = cached["rows"], cached["status"], cached["fetched_at"]
    elif live.offline():
        archive, archive_status, fetched_at = [], {"GDACS": "offline", "USGS": "offline"}, None
    else:
        incidents, archive_status = fetch_archive(months=months)
        active_ids = {d["id"] for d in register if d.get("status") == "ACTIVE"}
        archive = [_row(i, "ACTIVE" if i["id"] in active_ids else "PAST") for i in incidents]
        fetched_at = datetime.now(timezone.utc).isoformat()
        if any(v == "ok" for v in archive_status.values()):
            cache_put(key, {"rows": archive, "status": archive_status, "fetched_at": fetched_at})
        else:
            stale = cache_get(key, None)
            if stale:
                archive, fetched_at = stale["rows"], stale["fetched_at"]
    seen: set[str] = set()
    rows = []
    for r in closed + archive:
        if r["id"] in seen:
            continue
        seen.add(r["id"])
        rows.append(r)
    rows.sort(key=lambda r: str(r.get("started_at") or ""), reverse=True)
    return {"months": months, "items": rows, "archive_status": archive_status, "fetched_at": fetched_at,
            "attribution": "GDACS (EC Joint Research Centre & UN OCHA), USGS Earthquake Hazards Program, and incidents "
                           "tracked by Volentify"}
