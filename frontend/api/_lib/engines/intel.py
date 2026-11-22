"""External situational feeds: OSM infrastructure (Overpass), NDMA SACHET CAP bulletins, imagery catalogue.

Nothing here falls back to invented data. When a feed is unreachable the response says so (``mode``) and carries
either the last real copy (archived bulletins, cached facility lists) or nothing at all.
"""

from __future__ import annotations

import asyncio
import re
import time
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from typing import Any, Optional

import httpx

from .geo import haversine_km
from .live import USER_AGENT, offline

OVERPASS_URL = "https://overpass-api.de/api/interpreter"
OVERPASS_MIRRORS = (OVERPASS_URL, "https://overpass.kumi.systems/api/interpreter",
                    "https://maps.mail.ru/osm/tools/overpass/api/interpreter")
FACILITY_HAZARDS = {"Cyclone", "Storm", "Flood", "Earthquake", "Landslide", "Wildfire", "Volcano", "Heatwave"}
SACHET_RSS_URL = "https://sachet.ndma.gov.in/cap_public_website/rss/rss_india.xml"
CAP_NS = {"cap": "urn:oasis:names:tc:emergency:cap:1.2"}

_OVERPASS_QUERY = """
[out:json][timeout:10];
(
  nwr["amenity"="hospital"](around:{r},{lat},{lng});
  nwr["amenity"="fire_station"](around:{r},{lat},{lng});
  nwr["amenity"="police"](around:{r},{lat},{lng});
  nwr["amenity"="shelter"](around:{r},{lat},{lng});
  nwr["emergency"="assembly_point"](around:{r},{lat},{lng});
  way["bridge"="yes"]["highway"~"trunk|primary"](around:{r},{lat},{lng});
);
out center 80;
"""
_KIND = {"hospital": "Hospital", "fire_station": "Fire station", "police": "Police station",
         "shelter": "Shelter", "assembly_point": "Assembly point"}


def _impact(distance_km: float) -> str:
    if distance_km < 2:
        return "Potentially affected"
    if distance_km < 5:
        return "In proximity"
    return "Outside impact zone"


def _center(el: dict) -> tuple[Optional[float], Optional[float]]:
    return el.get("lat") or el.get("center", {}).get("lat"), el.get("lon") or el.get("center", {}).get("lon")


async def nearby_infrastructure(lat: float, lng: float, radius_km: float) -> dict[str, Any]:
    if offline():
        return {"facilities": [], "data_mode": "OFFLINE"}
    facilities: list[dict] = []
    try:
        async with httpx.AsyncClient(timeout=12.0, headers={"User-Agent": USER_AGENT}) as client:
            resp = await client.post(OVERPASS_URL, data={
                "data": _OVERPASS_QUERY.format(r=int(radius_km * 1000), lat=lat, lng=lng)})
            resp.raise_for_status()
            elements = resp.json().get("elements", [])
    except (httpx.HTTPError, ValueError):
        return {"facilities": [], "data_mode": "OFFLINE"}
    for el in elements:
        el_lat, el_lng = _center(el)
        if el_lat is None or el_lng is None:
            continue
        tags = el.get("tags", {})
        kind = (_KIND.get(tags.get("amenity", "")) or _KIND.get(tags.get("emergency", ""))
                or ("Bridge" if tags.get("bridge") == "yes" else "Facility"))
        dist = haversine_km(lat, lng, el_lat, el_lng)
        facilities.append({"name": tags.get("name") or tags.get("name:en") or f"Unnamed {kind.lower()}",
                           "type": kind, "lat": el_lat, "lng": el_lng, "distance_km": round(dist, 2),
                           "status": _impact(dist), "osm_id": el.get("id")})
    facilities.sort(key=lambda f: f["distance_km"])
    return {"facilities": facilities[:60], "data_mode": "LIVE"}


# ─── Hospitals & relief shelters near active incidents (OpenStreetMap) ─────

RESOURCE_TTL_S = 6 * 3600
_resource_cache: dict[str, tuple[float, Any]] = {}


def _address(tags: dict) -> str:
    if tags.get("addr:full"):
        return tags["addr:full"]
    parts = [tags.get("addr:housenumber"), tags.get("addr:street"), tags.get("addr:suburb"),
             tags.get("addr:city") or tags.get("addr:district"), tags.get("addr:postcode")]
    return ", ".join(p for p in parts if p) or ""


def _int(value: Any) -> Optional[int]:
    try:
        return int(str(value).split(";")[0].strip())
    except (TypeError, ValueError):
        return None


def _facilities_query(centers: list[tuple[float, float, float]], timeout_s: int = 10) -> str:
    clauses = []
    for lat, lng, r in centers:
        around = f"(around:{int(r * 1000)},{lat:.5f},{lng:.5f})"
        clauses += [f'nwr["amenity"="hospital"]{around};',
                    f'nwr["social_facility"="shelter"]{around};',
                    f'nwr["emergency"="assembly_point"]{around};',
                    f'nwr["amenity"="shelter"]["shelter_type"!~"public_transport|picnic_shelter|weather_shelter"]["name"]{around};']
    return f"[out:json][timeout:{timeout_s}];(" + "".join(clauses) + ");out center tags 300;"


def parse_facilities(elements: list[dict], incidents: list[dict]) -> dict[str, list[dict]]:
    """Hospitals and shelters, each matched to its nearest incident (or reference point) with the distance to it.

    `inside_zone` marks facilities inside the incident's mapped hazard radius: they are closest, but may themselves
    be affected, so the page tells people to confirm they are operating before travelling.
    """
    hospitals: list[dict] = []
    shelters: list[dict] = []
    seen: set[str] = set()
    for el in elements:
        lat, lng = _center(el)
        tags = el.get("tags") or {}
        name = tags.get("name:en") or tags.get("name")
        if lat is None or lng is None or not name:
            continue
        osm_id = f"{el.get('type', 'n')[0]}{el.get('id')}"
        if osm_id in seen:
            continue
        seen.add(osm_id)
        near = min(incidents, key=lambda d: haversine_km(lat, lng, d["lat"], d["lng"]))
        distance = round(haversine_km(lat, lng, near["lat"], near["lng"]), 1)
        common = {"id": f"osm_{osm_id}", "name": name, "address": _address(tags), "lat": lat, "lng": lng,
                  "osm_url": f"https://www.openstreetmap.org/{el.get('type', 'node')}/{el.get('id')}",
                  "incident_id": near["id"], "incident_title": near["title"], "distance_km": distance,
                  "inside_zone": bool(near.get("radius_km")) and distance <= float(near.get("radius_km") or 0)}
        if tags.get("amenity") == "hospital":
            kind = "Emergency hospital" if tags.get("emergency") == "yes" else (
                "Government hospital" if tags.get("operator:type") in {"government", "public"} else "Hospital")
            hospitals.append({**common, "kind": kind, "beds": _int(tags.get("beds")),
                              "phone": tags.get("phone") or tags.get("contact:phone") or "",
                              "emergency": tags.get("emergency") == "yes", "icu_beds": None, "icu_available": None,
                              "trauma_level": None})
        else:
            facilities = [label for key, label in (("drinking_water", "Drinking water"), ("toilets", "Toilets"),
                                                   ("generator", "Generator"), ("kitchen", "Kitchen"))
                          if tags.get(key) == "yes"]
            shelters.append({**common, "capacity": _int(tags.get("capacity")), "occupancy": None,
                             "facilities": facilities, "incharge": tags.get("operator") or None,
                             "kind": "Assembly point" if tags.get("emergency") == "assembly_point" else "Shelter"})
    hospitals.sort(key=lambda h: (h["distance_km"], h["name"]))
    shelters.sort(key=lambda s: (s["distance_km"], s["name"]))
    return {"hospitals": hospitals[:120], "shelters": shelters[:120]}


def overpass_first(query: str, deadline_s: float = 11.0) -> Optional[list[dict]]:
    """Ask every Overpass mirror at once and keep the first good answer, within a hard deadline.

    The previous sequential loop (three mirrors × 12 s) could outlast Vercel's 30 s function limit, which is why
    /api/resources timed out and the Resources page never loaded.
    """
    from concurrent.futures import ThreadPoolExecutor, as_completed
    from concurrent.futures import TimeoutError as FutureTimeout

    def one(url: str) -> list[dict]:
        resp = httpx.post(url, data={"data": query}, headers={"User-Agent": USER_AGENT},
                          timeout=httpx.Timeout(deadline_s, connect=3.0))
        resp.raise_for_status()
        return resp.json().get("elements", [])

    pool = ThreadPoolExecutor(max_workers=len(OVERPASS_MIRRORS))
    futures = [pool.submit(one, url) for url in OVERPASS_MIRRORS]
    try:
        for future in as_completed(futures, timeout=deadline_s):
            try:
                return future.result()
            except (httpx.HTTPError, ValueError):
                continue
    except (FutureTimeout, TimeoutError):
        pass
    finally:
        pool.shutdown(wait=False, cancel_futures=True)
    return None


def _cached_fetch(key: str, centers: list[tuple[float, float, float]], refs: list[dict], cache_get, cache_put,
                  deadline_s: float) -> dict[str, Any]:
    if _resource_cache.get(key) and time.monotonic() - _resource_cache[key][0] < RESOURCE_TTL_S:
        return _resource_cache[key][1]
    cached = cache_get(key, RESOURCE_TTL_S) if cache_get else None
    if cached:
        _resource_cache[key] = (time.monotonic(), cached)
        return cached
    if offline():
        return {"hospitals": [], "shelters": [], "mode": "OFFLINE", "fetched_at": None, "query": None}
    query = _facilities_query(centers, timeout_s=int(deadline_s))
    elements = overpass_first(query, deadline_s)
    if elements is None:
        stale = cache_get(key, None) if cache_get else None
        # The browser can still ask Overpass itself (lib/overpass.ts), so hand it the query it should run.
        return stale or {"hospitals": [], "shelters": [], "mode": "OFFLINE", "fetched_at": None, "query": query}
    value = {**parse_facilities(elements, refs), "mode": "LIVE", "fetched_at": datetime.now(timezone.utc).isoformat(),
             "query": None}
    _resource_cache[key] = (time.monotonic(), value)
    if cache_put:
        cache_put(key, value)
    return value


def _focus(incidents: list[dict]) -> list[dict]:
    order = {"CRITICAL": 0, "HIGH": 1, "MODERATE": 2, "LOW": 3}
    land = [d for d in incidents if d.get("status", "ACTIVE") == "ACTIVE" and d.get("category") in FACILITY_HAZARDS
            and not str(d.get("location", "")).endswith("Sea") and d.get("state") not in {"Bay of Bengal", "Arabian Sea", "Indian Ocean"}]
    return sorted(land, key=lambda d: (order.get(d["severity"], 4), d["title"]))


def relief_facilities(incidents: list[dict], cache_get=None, cache_put=None, deadline_s: float = 11.0) -> dict[str, Any]:
    """Hospitals and shelters mapped in OpenStreetMap around the most severe active incidents (up to four).

    Cached for six hours (in process and, when given, in the database) because Overpass is slow and rate-limited.
    """
    focus = _focus(incidents)[:4]
    if not focus:
        return {"hospitals": [], "shelters": [], "mode": "NO_INCIDENTS", "fetched_at": None, "query": None}
    key = "facilities:" + ",".join(sorted(d["id"] for d in focus))
    centers = [(d["lat"], d["lng"], max(5.0, min(15.0, float(d.get("radius_km") or 15)))) for d in focus]
    return _cached_fetch(key, centers, focus, cache_get, cache_put, deadline_s)


def facilities_for_incident(incident: dict, cache_get=None, cache_put=None, deadline_s: float = 11.0) -> dict[str, Any]:
    """Facilities around one incident, nearest first (the incident-specific matching on /resources)."""
    radius = max(8.0, min(25.0, float(incident.get("radius_km") or 20)))
    key = f"facilities:one:{incident['id']}:{int(radius)}"
    return _cached_fetch(key, [(incident["lat"], incident["lng"], radius)], [incident], cache_get, cache_put,
                         deadline_s)


def facilities_near(lat: float, lng: float, radius_km: float, cache_get=None, cache_put=None,
                    deadline_s: float = 11.0) -> dict[str, Any]:
    """Facilities around a point (the person's own location), nearest first. Cached per ~1 km grid cell."""
    lat, lng = round(lat, 2), round(lng, 2)
    ref = {"id": "here", "title": "your location", "lat": lat, "lng": lng, "radius_km": 0}
    key = f"facilities:near:{lat:.2f}:{lng:.2f}:{int(radius_km)}"
    return _cached_fetch(key, [(lat, lng, radius_km)], [ref], cache_get, cache_put, deadline_s)


# ─── NDMA SACHET Common Alerting Protocol feed ──────────────────────────────

CAP_SEVERITY = {"extreme": "CRITICAL", "severe": "HIGH", "moderate": "MODERATE", "minor": "LOW", "unknown": "LOW"}
FEED_TTL_S = 5 * 60
CAP_DETAIL_LIMIT = 40
_feed_cache: dict[str, Any] = {"at": 0.0, "value": None}


def _severity_from_text(text: str) -> str:
    t = text.lower()
    if "red" in t or "extreme" in t or "severe" in t:
        return "CRITICAL"
    if "orange" in t or "warning" in t:
        return "HIGH"
    if "yellow" in t or "watch" in t:
        return "MODERATE"
    return "LOW"


def _issuer(author: str) -> str:
    m = re.search(r"\(([^)]+)\)", author or "")
    return (m.group(1) if m else author or "NDMA SACHET").strip()


def parse_rss(content: bytes, limit: int) -> list[dict]:
    root = ET.fromstring(content)
    items = []
    for item in root.iter("item"):
        title = (item.findtext("title") or "").strip()
        desc = (item.findtext("description") or "").strip()
        pub = item.findtext("pubDate")
        try:
            published = parsedate_to_datetime(pub) if pub else datetime.now(timezone.utc)
        except (TypeError, ValueError):
            published = datetime.now(timezone.utc)
        items.append({"title": title, "description": desc, "link": item.findtext("link"),
                      "source": _issuer(item.findtext("author") or ""), "category": item.findtext("category") or "",
                      "severity": _severity_from_text(f"{title} {desc}"), "published_at": published,
                      "event": None, "expires_at": None, "area": None, "instruction": None, "language": None})
        if len(items) >= limit:
            break
    return items


def parse_cap(content: bytes) -> Optional[dict]:
    """English (or first) <info> block of a CAP 1.2 message."""
    try:
        root = ET.fromstring(content)
    except ET.ParseError:
        return None
    infos = root.findall("cap:info", CAP_NS)
    if not infos:
        return None
    info = next((i for i in infos if (i.findtext("cap:language", "", CAP_NS) or "").lower().startswith("en")), infos[0])

    def text(tag: str) -> str:
        return (info.findtext(f"cap:{tag}", "", CAP_NS) or "").strip()

    expires = text("expires")
    try:
        expires_at = datetime.fromisoformat(expires) if expires else None
    except ValueError:
        expires_at = None
    areas = [a.findtext("cap:areaDesc", "", CAP_NS).strip() for a in info.findall("cap:area", CAP_NS)]
    return {"headline": text("headline"), "description": text("description"), "instruction": text("instruction"),
            "event": text("event"), "severity": CAP_SEVERITY.get(text("severity").lower()),
            "expires_at": expires_at, "language": text("language"),
            "area": ", ".join(a.replace("_", " ") for a in areas if a) or None,
            "sender": (root.findtext("cap:sender", "", CAP_NS) or "").replace("-", " ").strip()}


async def _enrich(client: httpx.AsyncClient, item: dict) -> dict:
    if not item.get("link"):
        return item
    try:
        resp = await client.get(item["link"])
        resp.raise_for_status()
        cap = parse_cap(resp.content)
    except (httpx.HTTPError, ValueError):
        return item
    if not cap:
        return item
    english = cap["language"].lower().startswith("en")
    return {**item,
            "title": cap["headline"] if english and cap["headline"] else item["title"],
            "description": cap["description"] or item["description"],
            "severity": cap["severity"] or item["severity"], "event": cap["event"] or None,
            "expires_at": cap["expires_at"], "area": cap["area"], "instruction": cap["instruction"] or None,
            "language": cap["language"] or None,
            "source": cap.get("sender") or item["source"]}


def _archived_bulletins(limit: int) -> list[dict]:
    """The most recent real bulletins already in the research archive (used only when SACHET is unreachable)."""
    from ..core import research
    try:
        rows = research.query("cap_alert", since=datetime.now(timezone.utc) - timedelta(hours=48), limit=5000)
    except Exception:  # noqa: BLE001
        return []
    items = [dict(r["payload"]) for r in rows if isinstance(r.get("payload"), dict)]
    now = datetime.now(timezone.utc)
    fresh = []
    for i in items:
        exp = i.get("expires_at")
        try:
            if exp and datetime.fromisoformat(str(exp)) < now:
                continue
        except ValueError:
            pass
        fresh.append(i)
    fresh.sort(key=lambda i: str(i.get("published_at") or ""), reverse=True)
    return fresh[:limit]


async def sachet_bulletins(limit: int = 40) -> dict[str, Any]:
    """Public CAP warnings from NDMA SACHET, enriched from each CAP message and with expired warnings removed."""
    cached = _feed_cache["value"]
    if cached and time.monotonic() - _feed_cache["at"] < FEED_TTL_S:
        return {**cached, "items": cached["items"][:limit]}
    if offline():
        return {"source": "NDMA SACHET CAP feed", "mode": "OFFLINE", "items": []}
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(8.0, connect=4.0), follow_redirects=True,
                                     headers={"User-Agent": USER_AGENT}) as client:
            resp = await client.get(SACHET_RSS_URL)
            resp.raise_for_status()
            items = parse_rss(resp.content, max(limit, 100))
            head, tail = items[:CAP_DETAIL_LIMIT], items[CAP_DETAIL_LIMIT:]
            try:
                head = list(await asyncio.wait_for(asyncio.gather(*(_enrich(client, i) for i in head)), timeout=7.0))
            except asyncio.TimeoutError:
                pass
            items = head + tail
    except (httpx.HTTPError, ET.ParseError):
        archived = _archived_bulletins(limit)
        return {"source": "Volentify archive of NDMA SACHET", "mode": "CACHED" if archived else "OFFLINE",
                "items": archived}
    now = datetime.now(timezone.utc)
    current = [i for i in items if not i.get("expires_at") or i["expires_at"] > now]
    if current:
        from ..core import research
        research.record_many("cap_alert", "NDMA SACHET", [
            (research.fingerprint(i["title"], i["published_at"], i["link"]), i) for i in current])
    value = {"source": "NDMA SACHET CAP feed", "mode": "LIVE", "items": current}
    _feed_cache.update(at=time.monotonic(), value=value)
    return {**value, "items": current[:limit]}


# ─── Imagery catalogue ──────────────────────────────────────────────────────

def imagery_layers() -> list[dict[str, Any]]:
    """Raster layers the tactical map can render. Daily imagery uses yesterday (UTC) for complete coverage."""
    day = (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d")
    gibs = "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/{layer}/default/{day}/GoogleMapsCompatible_Level9/{{z}}/{{y}}/{{x}}.jpg"
    return [
        {"id": "esri-imagery", "label": "Satellite (high resolution)", "short": "Satellite", "provider": "Esri World Imagery",
         "tiles": ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
         "max_zoom": 19, "cadence": "Static mosaic"},
        {"id": "modis-terra", "label": "MODIS Terra true colour", "short": "MODIS", "provider": "NASA GIBS",
         "tiles": [gibs.format(layer="MODIS_Terra_CorrectedReflectance_TrueColor", day=day)],
         "max_zoom": 9, "cadence": f"Daily · {day}", "date": day},
        {"id": "viirs-snpp", "label": "VIIRS SNPP true colour", "short": "VIIRS", "provider": "NASA GIBS",
         "tiles": [gibs.format(layer="VIIRS_SNPP_CorrectedReflectance_TrueColor", day=day)],
         "max_zoom": 9, "cadence": f"Daily · {day}", "date": day},
        {"id": "viirs-noaa20", "label": "VIIRS NOAA-20 true colour", "short": "NOAA-20", "provider": "NASA GIBS",
         "tiles": [gibs.format(layer="VIIRS_NOAA20_CorrectedReflectance_TrueColor", day=day)],
         "max_zoom": 9, "cadence": f"Daily · {day}", "date": day},
        {"id": "rainviewer", "label": "Precipitation radar composite", "short": "Radar", "provider": "RainViewer",
         "tiles": [], "dynamic": "https://api.rainviewer.com/public/weather-maps.json", "max_zoom": 7,
         "cadence": "Every 10 minutes"},
    ]
