"""Corroboration analysis and NDRF tactical briefing (PRD §4.5)."""

from __future__ import annotations

import re
from datetime import datetime, timezone

from . import gemini
from .triage import deterministic as classify

CONFLICT_PAIRS = [
    ("no casualties", "casualties"), ("no casualties", "killed"), ("no casualties", "stranded"),
    ("receding", "rising"), ("under control", "spreading"), ("under control", "out of control"),
    ("no damage", "severe damage"), ("evacuated safely", "stranded"), ("stable", "worsening"),
    ("weakening", "intensifying"),
]
NEED_CHECKLIST = {
    "Boats": "Boats and water-rescue crews for cut-off households",
    "Rescue team": "Search-and-rescue teams for trapped or stranded people",
    "Medicine": "Medical teams and essential medicines at relief camps",
    "Insulin": "Insulin and cold-chain for diabetic evacuees",
    "Blood": "Blood units (O-negative priority) at receiving hospitals",
    "Oxygen": "Oxygen cylinders for respiratory and critical patients",
    "Food": "Dry rations and cooked meals for displaced families",
    "Drinking water": "Safe drinking water and purification tablets",
    "Shelter": "Shelter capacity, tarpaulins and bedding",
}
STOPWORDS = {"the", "a", "an", "in", "on", "at", "of", "to", "is", "has", "been", "and", "or", "for", "with"}
SOURCE_WEIGHT = {"OFFICIAL": 1.0, "SENSOR": 1.0, "NEWS": 0.7, "CITIZEN": 0.6, "SOCIAL": 0.5}


def _tokens(text: str) -> set[str]:
    return set(re.findall(r"\w+", text.lower())) - STOPWORDS


def _conflicts(a: str, b: str) -> bool:
    a, b = a.lower(), b.lower()
    return any((p in a and q in b) or (q in a and p in b) for p, q in CONFLICT_PAIRS)


def generate(event_id: str, event_label: str, location: str, evidence: list[dict]) -> dict:
    kept: list[dict] = []
    supporting = conflicting = duplicate = 0
    for ev in sorted(evidence, key=lambda e: e["timestamp"]):
        if any(len(_tokens(ev["claim_text"]) & _tokens(k["claim_text"]))
               / max(1, len(_tokens(ev["claim_text"]) | _tokens(k["claim_text"]))) > 0.7 for k in kept):
            duplicate += 1
            continue
        if any(_conflicts(ev["claim_text"], k["claim_text"]) for k in kept):
            conflicting += 1
            ev = {**ev, "_conflict": True}
        else:
            supporting += 1
        kept.append(ev)

    support_texts = [k["claim_text"] for k in kept if not k.get("_conflict")]
    triage = classify(" ".join(support_texts))
    needs = triage["needs"]
    if triage["flags"]["trapped_civilians"] and "Rescue team" not in needs:
        needs.append("Rescue team")
    if triage["flags"]["food_water_needed"] and "Food" not in needs:
        needs.append("Food")

    latest = max(e["timestamp"] if e["timestamp"].tzinfo else e["timestamp"].replace(tzinfo=timezone.utc)
                 for e in evidence)
    hours = (datetime.now(timezone.utc) - latest).total_seconds() / 3600
    weight = sum(SOURCE_WEIGHT.get(str(k["source_type"]), 0.5) for k in kept if not k.get("_conflict"))
    agreement = supporting / max(1, supporting + conflicting)
    confidence = round(0.45 * agreement + 0.3 * max(0.3, 1 - hours / 24) + 0.25 * min(1.0, weight / 4), 3)
    severity = triage["severity"]

    sources = len({e["source"] for e in evidence})
    brief = (f"{sources} independent source{'s' if sources != 1 else ''} describe a {severity.lower()}-severity "
             f"{event_label.lower()}{f' in {location}' if location else ''}. ")
    brief += " ".join(support_texts[:3])
    if conflicting:
        brief += f" {conflicting} conflicting report{'s' if conflicting != 1 else ''} need field verification."
    checklist = [NEED_CHECKLIST[n] for n in needs if n in NEED_CHECKLIST] or [
        "Confirm casualty and displacement figures with district control room"]
    engine = "heuristic"

    lines = "\n".join(f"- [{e['source_type']}: {e['source']}] {e['claim_text']}" for e in evidence[:40])
    merged = gemini.generate_json(
        f"Write a tactical situation briefing for NDRF incident commanders on '{event_label}' "
        f"({location or 'India'}). Evidence:\n{lines}\nKeep the brief under 150 words, factual, no speculation.",
        '{"brief": string, "severity": "CRITICAL|HIGH|MODERATE|LOW", "checklist": [string]}',
    )
    if merged and isinstance(merged.get("brief"), str):
        brief = merged["brief"].strip()
        if merged.get("severity") in {"CRITICAL", "HIGH", "MODERATE", "LOW"}:
            severity = merged["severity"]
        if isinstance(merged.get("checklist"), list) and merged["checklist"]:
            checklist = [str(c) for c in merged["checklist"]][:8]
        engine = "gemini"

    words = brief.split()
    if len(words) > 150:
        brief = " ".join(words[:150]) + "…"
    return {
        "event_id": event_id, "event_label": event_label, "severity": severity, "confidence": confidence,
        "supporting_count": supporting, "conflicting_count": conflicting, "duplicate_count": duplicate,
        "needs": needs, "checklist": checklist, "brief": brief, "engine": engine,
    }
