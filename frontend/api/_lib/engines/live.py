"""Live hazard feeds → Volentify incidents.

Every incident on the platform comes from an authoritative, public, near-real-time source — nothing is invented:

  GDACS        (EC Joint Research Centre / UN OCHA)  tropical cyclones, floods, droughts, wildfires, volcanoes
  USGS         (Earthquake Hazards Program)          earthquakes of magnitude 4.5+ in the last 7 days
  NASA EONET   (Earth Observatory Natural Events)    open severe storms, wildfires, floods, landslides …

Only events in and around India (the region box below, which takes in the Bay of Bengal and the Arabian Sea) and
only recent ones are kept. Each refresh upserts the incidents into the database (so missions, mesh reports and
alerts can link to them), adds an evidence entry whenever the source's account of an event changes, and closes
incidents that a source has dropped. Refreshes run at most every REFRESH_S seconds across all serverless instances;
a scheduled workflow (.github/workflows/live-feeds.yml) keeps them warm so visitors rarely wait for one.
"""

from __future__ import annotations

import hashlib
import logging
import re
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from typing import Any, Callable, Optional

import httpx

from .geo import haversine_km

log = logging.getLogger("volentify.live")

REGION = {"min_lat": 4.0, "max_lat": 38.0, "min_lng": 65.0, "max_lng": 100.0}
REFRESH_S = 15 * 60
FETCH_TIMEOUT = httpx.Timeout(7.0, connect=4.0)
USER_AGENT = "Volentify/3.5 (+https://github.com/Gyanvir/Volentify; disaster intelligence for India)"

GDACS_URL = "https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH"
USGS_URL = "https://earthquake.usgs.gov/fdsnws/event/1/query"
EONET_URL = "https://eonet.gsfc.nasa.gov/api/v3/events"

SOURCES = ("GDACS", "USGS", "NASA EONET")
GDACS_TYPES = {"TC": "Cyclone", "FL": "Flood", "DR": "Drought", "VO": "Volcano", "WF": "Wildfire", "EQ": "Earthquake"}
EONET_CATEGORIES = {"severeStorms": "Cyclone", "wildfires": "Wildfire", "floods": "Flood", "landslides": "Landslide",
                    "volcanoes": "Volcano", "drought": "Drought", "tempExtremes": "Heatwave",
                    "dustHaze": "Dust storm", "earthquakes": "Earthquake"}
# How long after its last update an event still counts as current, per category.
FRESH_DAYS = {"Cyclone": 3, "Earthquake": 7, "Wildfire": 7, "Flood": 10, "Landslide": 10, "Volcano": 14,
              "Drought": 45, "Heatwave": 5, "Dust storm": 3}
RADIUS_KM = {"Flood": 60.0, "Wildfire": 15.0, "Drought": 250.0, "Volcano": 25.0, "Landslide": 15.0,
             "Heatwave": 150.0, "Dust storm": 150.0}
SEV_RANK = {"LOW": 0, "MODERATE": 1, "HIGH": 2, "CRITICAL": 3}
KMH_PER_KT = 1.852


def offline() -> bool:
    """VOLENTIFY_OFFLINE=1 disables every outbound feed call (tests, air-gapped development)."""
    import os
    return os.environ.get("VOLENTIFY_OFFLINE", "").strip() in {"1", "true", "yes"}


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def in_region(lat: float, lng: float) -> bool:
    return REGION["min_lat"] <= lat <= REGION["max_lat"] and REGION["min_lng"] <= lng <= REGION["max_lng"]


def _parse_time(value: Any) -> Optional[datetime]:
    if value in (None, ""):
        return None
    if isinstance(value, (int, float)):
        return datetime.fromtimestamp(value / 1000, tz=timezone.utc)
    text = str(value).strip().replace("Z", "+00:00")
    try:
        dt = datetime.fromisoformat(text)
    except ValueError:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", text.lower()).strip("_")[:48]


def sea_label(lat: float, lng: float) -> Optional[str]:
    if 5 <= lat <= 23 and 80 <= lng <= 95:
        return "Bay of Bengal"
    if 5 <= lat <= 25 and 60 <= lng < 77:
        return "Arabian Sea"
    if lat < 6 and 70 <= lng <= 100:
        return "Indian Ocean"
    return None


def cyclone_severity(wind_kmh: Optional[float]) -> str:
    """IMD intensity classes: severe cyclonic storm ≥ 89 km/h, very severe ≥ 118 km/h."""
    if wind_kmh is None:
        return "MODERATE"
    if wind_kmh >= 118:
        return "CRITICAL"
    if wind_kmh >= 89:
        return "HIGH"
    if wind_kmh >= 62:
        return "MODERATE"
    return "LOW"


def cyclone_class(wind_kmh: Optional[float]) -> str:
    if wind_kmh is None:
        return "Cyclonic storm"
    for limit, label in ((221, "Super cyclonic storm"), (166, "Extremely severe cyclonic storm"),
                         (118, "Very severe cyclonic storm"), (89, "Severe cyclonic storm"), (62, "Cyclonic storm"),
                         (50, "Deep depression"), (31, "Depression")):
        if wind_kmh >= limit:
            return label
    return "Low-pressure area"


def quake_severity(mag: float, alert: Optional[str]) -> str:
    pager = {"red": "CRITICAL", "orange": "HIGH", "yellow": "MODERATE", "green": "LOW"}.get((alert or "").lower())
    by_mag = "CRITICAL" if mag >= 7 else "HIGH" if mag >= 6 else "MODERATE" if mag >= 5 else "LOW"
    return max(pager or "LOW", by_mag, key=SEV_RANK.get)


def quake_radius(mag: float) -> float:
    return round(min(400.0, max(15.0, 20.0 * 2 ** (mag - 4.5))), 1)


def _incident(source: str, external_id: str, **fields: Any) -> dict[str, Any]:
    ident = f"dis_{_slug(source)}_{_slug(external_id)}"
    code_prefix = {"GDACS": "GDACS", "USGS": "USGS", "NASA EONET": "EONET"}[source]
    row = {
        "id": ident, "code": f"{code_prefix}-{external_id}".upper()[:64], "polygon_geojson": None, "status": "ACTIVE",
        "affected_pop": None, "wind_speed_kmh": None, "rainfall_mm": None, "surge_meters": None, "org_id": None,
        "source": source, "external_id": external_id,
    }
    row.update(fields)
    return row


# ─── GDACS ──────────────────────────────────────────────────────────────────

def parse_gdacs(body: dict, now: datetime, archive: bool = False) -> list[dict]:
    """GDACS events in the region. `archive=True` keeps past events too (used for the history view)."""
    out = []
    for feature in body.get("features") or []:
        p = feature.get("properties") or {}
        coords = (feature.get("geometry") or {}).get("coordinates") or []
        etype = p.get("eventtype")
        category = GDACS_TYPES.get(etype or "")
        if not category or len(coords) < 2 or etype == "EQ":  # earthquakes come from USGS
            continue
        lng, lat = float(coords[0]), float(coords[1])
        countries = [c.get("countryname") for c in p.get("affectedcountries") or [] if c.get("countryname")]
        if not (in_region(lat, lng) or "India" in countries or "India" in str(p.get("country") or "")):
            continue
        started = _parse_time(p.get("fromdate")) or now
        updated = _parse_time(p.get("datemodified")) or _parse_time(p.get("todate")) or started
        ended = _parse_time(p.get("todate")) or updated
        current = str(p.get("iscurrent")).lower() == "true"
        if not archive and not current and now - ended > timedelta(days=FRESH_DAYS.get(category, 7)):
            continue
        sev_data = p.get("severitydata") or {}
        level = str(p.get("episodealertlevel") or p.get("alertlevel") or "Green").title()
        severity = {"Red": "CRITICAL", "Orange": "HIGH"}.get(level, "MODERATE" if category == "Cyclone" else "LOW")
        wind = None
        if category == "Cyclone":
            if str(sev_data.get("severityunit") or "").lower() == "km/h":
                wind = round(float(sev_data.get("severity") or 0), 1) or None
            severity = max(severity, cyclone_severity(wind), key=SEV_RANK.get)
        raw_name = str(p.get("eventname") or p.get("name") or category)
        country = str(p.get("country") or "").split(",")[0].strip() or (countries[0] if countries else "")
        offshore = category == "Cyclone" and not countries
        region = (sea_label(lat, lng) if offshore else None) or country or sea_label(lat, lng) or "South Asia"
        place = f"{lat:.2f}°N, {lng:.2f}°E"
        if category == "Cyclone":
            storm = re.sub(r"-\d{2}$", "", raw_name).replace("-", " ").title()
            title = f"Cyclone {storm}"
            detail = f"{cyclone_class(wind)} {storm}" + (f", maximum sustained wind {round(wind)} km/h" if wind else "")
        else:
            title = str(p.get("name") or f"{category} in {region}")
            detail = re.sub(r"<[^>]+>", " ", str(p.get("htmldescription") or p.get("description") or title))
            detail = re.sub(r"\s+", " ", detail).strip().rstrip(".")
        sev_text = str(sev_data.get("severitytext") or "").strip()
        summary = f"{detail}. {sev_text + '. ' if sev_text and sev_text not in detail else ''}" \
                  f"GDACS alert level {level}" + (f" — affects {', '.join(countries)}." if countries else ".")
        report = (p.get("url") or {}).get("report")
        external = f"{etype}-{p.get('eventid')}"
        radius = round(min(400.0, max(150.0, (wind or 100) * 1.5)), 1) if category == "Cyclone" else RADIUS_KM.get(category, 40.0)
        out.append(_incident(
            "GDACS", external, title=title, category=category, severity=severity, lat=lat, lng=lng,
            location=place, state=region, radius_km=radius,
            summary=summary, wind_speed_kmh=wind, source_url=report, created_at=started, updated_at=updated,
            confidence=0.95 if level in {"Red", "Orange"} else 0.9, storm_key=_slug(raw_name.split("-")[0])))
    return out


GDACS_WINDOW_DAYS = {"TC": 21, "FL": 30, "WF": 21, "VO": 45, "DR": 180}


def fetch_gdacs(client: httpx.Client, now: datetime) -> list[dict]:
    """One request per hazard type: a combined request is paged and would hide everything but cyclones."""
    def one(etype: str) -> list[dict]:
        params = {"eventlist": etype, "alertlevel": "Green;Orange;Red",
                  "fromDate": (now - timedelta(days=GDACS_WINDOW_DAYS[etype])).strftime("%Y-%m-%d"),
                  "toDate": (now + timedelta(days=1)).strftime("%Y-%m-%d")}
        resp = client.get(GDACS_URL, params=params, headers={"Accept": "application/json"})
        if resp.status_code == 204 or not resp.content.strip():
            return []  # GDACS answers an empty search with no body
        resp.raise_for_status()
        return parse_gdacs(resp.json(), now)

    with ThreadPoolExecutor(max_workers=len(GDACS_WINDOW_DAYS)) as pool:
        batches = list(pool.map(one, GDACS_WINDOW_DAYS))
    return [row for batch in batches for row in batch]


# ─── USGS ───────────────────────────────────────────────────────────────────

def parse_usgs(body: dict, now: datetime) -> list[dict]:
    out = []
    for feature in body.get("features") or []:
        p = feature.get("properties") or {}
        coords = (feature.get("geometry") or {}).get("coordinates") or []
        if len(coords) < 2 or p.get("mag") is None or p.get("type", "earthquake") != "earthquake":
            continue
        lng, lat = float(coords[0]), float(coords[1])
        depth = float(coords[2]) if len(coords) > 2 and coords[2] is not None else None
        mag = float(p["mag"])
        when = _parse_time(p.get("time")) or now
        updated = _parse_time(p.get("updated")) or when
        place = str(p.get("place") or f"{lat:.2f}°N, {lng:.2f}°E")
        if "," in place:
            near, region = (part.strip() for part in place.rsplit(",", 1))
        else:
            near, region = place, sea_label(lat, lng) or "South Asia"
        facts = [f"Magnitude {mag:.1f}{(' ' + p['magType']) if p.get('magType') else ''} earthquake"
                 + (f" at {depth:.0f} km depth" if depth is not None else "") + f", {place}."]
        if p.get("tsunami"):
            facts.append("USGS has raised its tsunami flag for this event — check INCOIS bulletins.")
        if p.get("felt"):
            facts.append(f"{p['felt']} people reported feeling it to USGS.")
        if p.get("alert"):
            facts.append(f"USGS PAGER alert level {str(p['alert']).title()}.")
        facts.append(f"Solution status: {p.get('status') or 'automatic'}.")
        out.append(_incident(
            "USGS", str(feature.get("id") or p.get("code")), title=f"M {mag:.1f} earthquake — {place}",
            category="Earthquake", severity=quake_severity(mag, p.get("alert")), lat=lat, lng=lng, location=near,
            state=region, radius_km=quake_radius(mag), summary=" ".join(facts), source_url=p.get("url"),
            created_at=when, updated_at=updated, confidence=0.97 if p.get("status") == "reviewed" else 0.9))
    return out


def fetch_usgs(client: httpx.Client, now: datetime) -> list[dict]:
    params = {"format": "geojson", "starttime": (now - timedelta(days=7)).strftime("%Y-%m-%dT%H:%M:%S"),
              "minlatitude": REGION["min_lat"], "maxlatitude": REGION["max_lat"],
              "minlongitude": REGION["min_lng"], "maxlongitude": REGION["max_lng"],
              "minmagnitude": 4.5, "orderby": "time", "limit": 60}
    resp = client.get(USGS_URL, params=params)
    resp.raise_for_status()
    return parse_usgs(resp.json(), now)


# ─── NASA EONET ─────────────────────────────────────────────────────────────

def parse_eonet(body: dict, now: datetime) -> list[dict]:
    out = []
    for ev in body.get("events") or []:
        cats = [c.get("id") for c in ev.get("categories") or []]
        category = next((EONET_CATEGORIES[c] for c in cats if c in EONET_CATEGORIES), None)
        points = [g for g in ev.get("geometry") or [] if g.get("type") == "Point" and len(g.get("coordinates") or []) >= 2]
        if not category or not points:
            continue
        points.sort(key=lambda g: g.get("date") or "")
        last, first = points[-1], points[0]
        lng, lat = float(last["coordinates"][0]), float(last["coordinates"][1])
        if not in_region(lat, lng):
            continue
        updated = _parse_time(last.get("date")) or now
        if now - updated > timedelta(days=FRESH_DAYS.get(category, 7)):
            continue
        title = str(ev.get("title") or category)
        wind = None
        if last.get("magnitudeValue") is not None and str(last.get("magnitudeUnit")).lower() == "kts":
            wind = round(float(last["magnitudeValue"]) * KMH_PER_KT, 1)
        if category == "Cyclone" and not re.search(r"cyclone|storm|depression|typhoon", title, re.I):
            category = "Storm"
        severity = cyclone_severity(wind) if category == "Cyclone" else "MODERATE"
        sources = ", ".join(s.get("id", "") for s in ev.get("sources") or [] if s.get("id")) or "NASA EONET"
        summary = (f"{title}. Latest position {lat:.1f}°N {lng:.1f}°E at {updated.strftime('%d %b %H:%M')} UTC"
                   + (f", sustained wind {round(wind)} km/h ({cyclone_class(wind).lower()})" if wind else "")
                   + f". Reported by {sources} via NASA EONET.")
        link = next((s.get("url") for s in ev.get("sources") or [] if s.get("url")), None) or ev.get("link")
        name_key = re.sub(r"(tropical|cyclone|storm|severe|depression|very|extremely|super)", "", title, flags=re.I)
        out.append(_incident(
            "NASA EONET", str(ev.get("id")), title=title, category=category, severity=severity, lat=lat, lng=lng,
            location=f"{lat:.2f}°N, {lng:.2f}°E", state=sea_label(lat, lng) or "South Asia",
            radius_km=round(max(150.0, (wind or 100) * 1.5), 1) if category == "Cyclone" else RADIUS_KM.get(category, 40.0),
            summary=summary, wind_speed_kmh=wind, source_url=link,
            created_at=_parse_time(first.get("date")) or updated, updated_at=updated, confidence=0.88,
            storm_key=_slug(name_key)))
    return out


def fetch_eonet(client: httpx.Client, now: datetime) -> list[dict]:
    bbox = f'{REGION["min_lng"]},{REGION["max_lat"]},{REGION["max_lng"]},{REGION["min_lat"]}'
    resp = client.get(EONET_URL, params={"status": "open", "days": 21, "bbox": bbox})
    resp.raise_for_status()
    return parse_eonet(resp.json(), now)


# ─── Merge & evidence ───────────────────────────────────────────────────────

def merge(incidents: list[dict]) -> list[dict]:
    """Drop EONET duplicates of storms GDACS already tracks (same name, or within 300 km)."""
    gdacs_storms = [i for i in incidents if i["source"] == "GDACS" and i["category"] == "Cyclone"]
    kept = []
    for inc in incidents:
        if inc["source"] == "NASA EONET" and inc["category"] in {"Cyclone", "Storm"}:
            if any(inc.get("storm_key") and inc.get("storm_key") == g.get("storm_key")
                   or haversine_km(inc["lat"], inc["lng"], g["lat"], g["lng"]) < 300 for g in gdacs_storms):
                continue
        kept.append(inc)
    kept.sort(key=lambda i: (-SEV_RANK[i["severity"]], -i["updated_at"].timestamp()))
    return kept


def evidence_for(inc: dict) -> dict:
    """One evidence entry per distinct account of the event, so the dossier keeps a real timeline."""
    digest = hashlib.sha1(inc["summary"].encode()).hexdigest()[:10]
    label = {"GDACS": "GDACS (EC JRC / UN OCHA)", "USGS": "USGS Earthquake Hazards Program",
             "NASA EONET": "NASA EONET"}[inc["source"]]
    return {"id": f"ev_{inc['id'][4:]}_{digest}"[:64], "disaster_id": inc["id"], "author_id": None, "source": label,
            "source_type": "OFFICIAL", "claim_text": inc["summary"], "relation": "SUPPORTING",
            "confidence": inc.get("confidence", 0.9), "language": "en", "created_at": inc["updated_at"]}


DISASTER_FIELDS = ("id", "code", "title", "category", "severity", "lat", "lng", "location", "state", "radius_km",
                   "polygon_geojson", "status", "affected_pop", "summary", "wind_speed_kmh", "rainfall_mm",
                   "surge_meters", "org_id", "created_at", "updated_at", "source", "source_url", "external_id")


def disaster_row(inc: dict) -> dict:
    return {k: inc.get(k) for k in DISASTER_FIELDS}


# ─── Fetch & sync orchestration ─────────────────────────────────────────────

FETCHERS: dict[str, Callable[[httpx.Client, datetime], list[dict]]] = {
    "GDACS": fetch_gdacs, "USGS": fetch_usgs, "NASA EONET": fetch_eonet,
}


def fetch_all(now: Optional[datetime] = None) -> tuple[list[dict], dict[str, str]]:
    """Pull every feed in parallel. Returns (incidents, {source: "ok" | error})."""
    now = now or utcnow()
    status: dict[str, str] = {}
    results: list[dict] = []
    with httpx.Client(timeout=FETCH_TIMEOUT, headers={"User-Agent": USER_AGENT}, follow_redirects=True) as client:
        with ThreadPoolExecutor(max_workers=len(FETCHERS)) as pool:
            futures = {name: pool.submit(fn, client, now) for name, fn in FETCHERS.items()}
            for name, future in futures.items():
                try:
                    rows = future.result(timeout=12)
                    results.extend(rows)
                    status[name] = "ok"
                except Exception as exc:  # noqa: BLE001 — one feed failing must not hide the others
                    status[name] = type(exc).__name__
                    log.warning("live feed %s failed: %s", name, exc)
    return merge(results), status


_lock = threading.Lock()
_state: dict[str, Any] = {"synced_at": None, "last": None}  # monotonic time of the last sync; None = never


def ensure_fresh(force: bool = False, max_age_s: int = REFRESH_S) -> dict[str, Any]:
    """Refresh live incidents if they are older than max_age_s. Never raises; returns a short report."""
    from ..core import db

    if offline():
        return {"refreshed": False, "reason": "offline"}
    # (Never compare against 0: a freshly booted serverless VM's monotonic clock starts near zero.)
    if not force and _state["synced_at"] is not None and time.monotonic() - _state["synced_at"] < max_age_s:
        return {"refreshed": False, "reason": "fresh"}
    if not _lock.acquire(blocking=False):
        return {"refreshed": False, "reason": "in-progress"}
    try:
        pg = db._postgres()
        if pg is not None and not force:
            try:
                if not pg.claim_feed("hazards", max_age_s):
                    _state["synced_at"] = time.monotonic()
                    return {"refreshed": False, "reason": "fresh"}
            except Exception as exc:  # noqa: BLE001
                if not db._is_db_error(exc):
                    raise
                db._mark_down(exc)
                pg = None
        incidents, status = fetch_all()
        ok_sources = [s for s, v in status.items() if v == "ok"]
        evidence = [evidence_for(i) for i in incidents]
        rows = [disaster_row(i) for i in incidents]
        db.MEMORY.upsert_live(rows, evidence, ok_sources)
        stored = "memory"
        if pg is not None:
            try:
                pg.upsert_live(rows, evidence, ok_sources)
                pg.mark_feed("hazards", status)
                stored = "database"
            except Exception as exc:  # noqa: BLE001
                if not db._is_db_error(exc):
                    raise
                db._mark_down(exc)
        _state["synced_at"] = time.monotonic()
        _state["last"] = {"at": utcnow().isoformat(), "sources": status, "incidents": len(rows), "stored": stored}
        return {"refreshed": True, **_state["last"]}
    except Exception as exc:  # noqa: BLE001 — a feed problem must never break the page that asked
        log.exception("live refresh failed")
        return {"refreshed": False, "reason": type(exc).__name__}
    finally:
        _lock.release()


def last_sync() -> Optional[dict]:
    return _state["last"]
