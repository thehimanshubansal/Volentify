"""Multi-source report deduplication (PRD §4.5).

Reports are clustered when they describe the same hazard type within Δr ≤ 15 km and Δt ≤ 2 h.
Clusters with corroborating reports are optionally resolved by Gemini into merged facts.
"""

from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any, Optional

from . import gemini
from .geo import haversine_km
from .triage import deterministic as classify

RADIUS_KM = 15.0
WINDOW_S = 2 * 3600

GAZETTEER = {
    "guwahati": ("Guwahati", 26.1445, 91.7362), "gauhati": ("Guwahati", 26.1445, 91.7362),
    "kamrup": ("Kamrup", 26.2917, 91.5435), "barpeta": ("Barpeta", 26.3220, 91.0060),
    "majuli": ("Majuli", 26.9500, 94.1670), "puri": ("Puri", 19.8135, 85.8312),
    "paradip": ("Paradip", 20.2644, 86.6705), "bhadrak": ("Bhadrak", 21.0574, 86.4947),
    "bhubaneswar": ("Bhubaneswar", 20.2961, 85.8245), "cuttack": ("Cuttack", 20.4625, 85.8830),
    "mumbai": ("Mumbai", 19.0760, 72.8777), "bombay": ("Mumbai", 19.0760, 72.8777),
    "chennai": ("Chennai", 13.0827, 80.2707), "delhi": ("Delhi", 28.6139, 77.2090),
    "wayanad": ("Wayanad", 11.6854, 76.1320), "meppadi": ("Meppadi", 11.5560, 76.1350),
    "chamoli": ("Chamoli", 30.2731, 79.3263), "almora": ("Almora", 29.5982, 79.6467),
    "kolkata": ("Kolkata", 22.5726, 88.3639), "patna": ("Patna", 25.5941, 85.1376),
}
STOPWORDS = {"the", "a", "an", "in", "on", "at", "of", "to", "is", "has", "been", "was", "were", "are", "for",
             "with", "by", "from", "this", "that", "and", "or", "but", "near", "after", "about", "into"}


def _aware(ts: datetime) -> datetime:
    return ts if ts.tzinfo else ts.replace(tzinfo=timezone.utc)


def locate(report: dict) -> Optional[tuple[str, float, float]]:
    if report.get("lat") is not None and report.get("lng") is not None:
        return ("Reported location", report["lat"], report["lng"])
    text = report["text"].lower()
    for key, value in GAZETTEER.items():
        if key in text:
            return value
    return None


def _tokens(text: str) -> set[str]:
    return set(re.findall(r"\w+", text.lower())) - STOPWORDS


def _same_event(a: dict, b: dict) -> bool:
    if a["_type"] != b["_type"] or a["_type"] == "Unspecified":
        return False
    if abs((a["_ts"] - b["_ts"]).total_seconds()) > WINDOW_S:
        return False
    if a["_loc"] and b["_loc"]:
        return haversine_km(a["_loc"][1], a["_loc"][2], b["_loc"][1], b["_loc"][2]) <= RADIUS_KM
    # No coordinates on one side — require strong textual overlap instead.
    ta, tb = _tokens(a["text"]), _tokens(b["text"])
    return bool(ta and tb) and len(ta & tb) / len(ta | tb) >= 0.35


def _merge_with_gemini(cluster: list[dict]) -> Optional[dict[str, Any]]:
    lines = "\n".join(f"- [{r['source']} @ {r['_ts'].isoformat()}] {r['text']}" for r in cluster)
    return gemini.generate_json(
        "You are a disaster-intelligence analyst for India's NDRF. These citizen, media and sensor reports "
        f"were clustered as one incident:\n{lines}\nMerge them into corroborated facts (claims supported by "
        "at least one credible source, stated plainly), an overall severity (CRITICAL/HIGH/MODERATE/LOW) "
        "and a confidence between 0 and 1.",
        '{"corroborated_facts": [string], "severity": string, "confidence": number}',
    )


def deduplicate(reports: list[dict]) -> list[dict]:
    enriched = []
    for r in reports:
        triage = classify(r["text"])
        enriched.append({**r, "_type": triage["disaster_type"], "_sev": triage["severity"],
                         "_loc": locate(r), "_ts": _aware(r["timestamp"])})

    clusters: list[list[dict]] = []
    for report in sorted(enriched, key=lambda x: x["_ts"]):
        home = next((c for c in clusters if any(_same_event(report, m) for m in c)), None)
        if home is None:
            clusters.append([report])
        else:
            home.append(report)

    order = ["CRITICAL", "HIGH", "MODERATE", "LOW"]
    now = datetime.now(timezone.utc)
    events = []
    for idx, cluster in enumerate(clusters, start=1):
        located = [m["_loc"] for m in cluster if m["_loc"]]
        name = located[0][0] if located else "Unknown"
        lat = sum(l[1] for l in located) / len(located) if located else 20.5937
        lng = sum(l[2] for l in located) / len(located) if located else 78.9629
        latest = max(m["_ts"] for m in cluster)
        sources = {m["source"] for m in cluster}
        severity = min((m["_sev"] for m in cluster), key=order.index)
        confidence = round(min(0.97, 0.45 + 0.13 * len(sources)), 3)
        facts = list(dict.fromkeys(m["text"].strip() for m in cluster))[:6]
        engine = "heuristic"
        if len(cluster) > 1:
            merged = _merge_with_gemini(cluster)
            if merged and isinstance(merged.get("corroborated_facts"), list):
                facts = [str(f) for f in merged["corroborated_facts"]][:8]
                if merged.get("severity") in order:
                    severity = merged["severity"]
                if isinstance(merged.get("confidence"), (int, float)):
                    confidence = round(max(0.0, min(1.0, float(merged["confidence"]))), 3)
                engine = "gemini"
        events.append({
            "event_id": f"EVT-{idx:03d}", "disaster_type": cluster[0]["_type"], "location": name,
            "lat": round(lat, 4), "lng": round(lng, 4), "report_count": len(cluster),
            "report_ids": [m["id"] for m in cluster],
            "status": "Active" if (now - latest).total_seconds() < 6 * 3600 else "Monitoring",
            "last_update": latest, "severity": severity, "confidence": confidence,
            "corroborated_facts": facts, "engine": engine,
        })
    return events
