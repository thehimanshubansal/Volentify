"""Automated safety advisories for active incidents affecting India.

Volentify advisories used to come only from incident commanders broadcasting on the platform, so the "Volentify
advisories" section stayed empty whenever nobody had broadcast (which, after the demo data was removed, was always).
Every active live-feed incident that touches India now also gets an automated advisory: the incident's own
description from its source (GDACS, USGS or NASA EONET) and the standard public-safety actions for that hazard,
following NDMA's published dos and don'ts.

These are guidance, not warnings. They are labelled "Automated" everywhere, never "Official", and always point to
the official IMD / CWC / INCOIS / SDMA warning, so they cannot be mistaken for an authority's alert (Disaster
Management Act 2005, s.54). Broadcasts by verified incident commanders remain the only "Volentify command" alerts.
"""

from __future__ import annotations

from typing import Any

INDIA_PLACES = {
    "India", "Bay of Bengal", "Arabian Sea", "Andaman Sea", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar",
    "Chhattisgarh", "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu & Kashmir", "Jammu and Kashmir",
    "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
    "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
    "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Lakshadweep",
}

GUIDANCE: dict[str, str] = {
    "Cyclone": "Stay indoors and away from windows while the storm passes. If you live in a kutcha house or a "
               "low-lying coastal area, move to the nearest cyclone shelter when the district administration asks. "
               "Keep drinking water, a torch, a charged phone and documents in a waterproof bag. Fishers must not "
               "go to sea. After landfall, keep away from fallen power lines and wait for the all-clear.",
    "Storm": "Stay indoors and away from windows, trees and hoardings. Unplug appliances and keep a torch and "
             "charged phone ready. Do not shelter under trees or near power lines.",
    "Flood": "Move to higher ground early. Never walk, swim or drive through flood water — fast water 15 cm deep "
             "can knock you over and 60 cm can carry a car away. Switch off electricity at the mains if water "
             "enters your home. Drink only boiled or chlorinated water and keep children away from drains and rivers.",
    "Earthquake": "Expect aftershocks: drop, cover and hold on until shaking stops. Stay out of damaged buildings "
                  "and away from glass, walls and overhead wires. Check for gas leaks and do not use open flames. "
                  "On the coast, if shaking was strong or long, move to high ground and follow INCOIS bulletins.",
    "Landslide": "Keep away from steep slopes and from valleys and streams below them. Cracks in the ground, tilting "
                 "trees or poles and suddenly muddy water are warning signs — leave early. Do not cross debris or "
                 "swollen streams; follow evacuation orders.",
    "Wildfire": "Keep away from the fire area and follow the forest department's instructions. Keep doors and "
                "windows closed against smoke, cover your nose and mouth with a damp cloth, and report new fires "
                "on 101.",
    "Heatwave": "Avoid going out between 12 noon and 3 pm. Drink water often even if you are not thirsty; use ORS, "
                "lassi or lemon water. Check on elderly people, children and outdoor workers. Heat stroke is an "
                "emergency — call 108.",
    "Drought": "Use water sparingly and drink only safe water. Follow your district's advisories on water supply "
               "and crop contingency plans, and watch for heat illness in people and livestock.",
    "Volcano": "Follow the instructions of local authorities. Stay indoors if ash is falling, protect your nose and "
               "mouth, and keep away from the exclusion zone.",
    "Dust storm": "Stay indoors with doors and windows shut. If you are outside, cover your nose and mouth and keep "
                  "away from trees, hoardings and weak walls. Drivers should pull over away from trees.",
}
DEFAULT_GUIDANCE = "Follow the instructions of your district administration and keep emergency numbers at hand."
OFFICIAL_SOURCE = {
    "Cyclone": "IMD", "Storm": "IMD", "Heatwave": "IMD", "Dust storm": "IMD", "Flood": "CWC and your state SDMA",
    "Earthquake": "NCS and INCOIS", "Landslide": "GSI and your state SDMA", "Wildfire": "the state forest department",
}


def affects_india(d: dict[str, Any]) -> bool:
    text = " ".join(str(d.get(k) or "") for k in ("title", "summary", "location"))
    return d.get("state") in INDIA_PLACES or "India" in text


def for_incidents(incidents: list[dict]) -> list[dict]:
    """One automated advisory per active incident affecting India, shaped like an Alert row."""
    out = []
    for d in incidents:
        if d.get("status", "ACTIVE") != "ACTIVE" or not affects_india(d):
            continue
        category = d.get("category") or "Hazard"
        official = OFFICIAL_SOURCE.get(category, "your state SDMA")
        source = d.get("source") or "live feed"
        out.append({
            "id": f"adv_{d['id']}", "code": f"AUTO-{str(d.get('code') or d['id'])[-12:]}".upper(),
            "title": d["title"], "category": category, "level": d.get("severity") or "MODERATE",
            "location": d.get("location") or "", "state": d.get("state") or "India",
            "description": f"{d.get('summary') or ''} Generated automatically from {source} data — not an official "
                           f"warning. Check {official} and NDMA SACHET for official warnings.".strip(),
            "advisory": GUIDANCE.get(category, DEFAULT_GUIDANCE),
            "disaster_id": d["id"], "sender_id": None, "created_at": d.get("updated_at") or d.get("created_at"),
            "kind": "AUTO", "source": source, "source_url": d.get("source_url"),
        })
    return out
