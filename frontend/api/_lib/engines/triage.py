"""Laya multilingual System-1 triage (PRD §6).

Non-autoregressive: no text generation, only classification. Three tiers:
  1. local `laya` router package, if installed
  2. hosted Impossibl endpoint, if IMPOSSIBL_API_KEY is set
  3. deterministic multilingual lexicon matcher (always available, <1 ms)
"""

from __future__ import annotations

import re
import time
import unicodedata
from typing import Any, Optional

import httpx

from ..core.config import get_settings

HOSTED_TIMEOUT_S = 0.35

_SCRIPTS = [
    ("hi", 0x0900, 0x097F), ("bn", 0x0980, 0x09FF), ("pa", 0x0A00, 0x0A7F), ("gu", 0x0A80, 0x0AFF),
    ("or", 0x0B00, 0x0B7F), ("ta", 0x0B80, 0x0BFF), ("te", 0x0C00, 0x0C7F), ("kn", 0x0C80, 0x0CFF),
    ("ml", 0x0D00, 0x0D7F),
]

# Lexicon: category → list of lowercase stems across English and major Indian languages.
DISASTER_TERMS: dict[str, list[str]] = {
    "Flood": ["flood", "inundat", "submerged", "waterlogged", "water rising", "बाढ़", "बाढ", "जलभराव", "डूब",
              "पूर", "বন্যা", "প্লাবিত", "বান", "ବନ୍ୟା", "வெள்ளம்", "వరద", "വെള്ളപ്പൊക്ക"],
    "Cyclone": ["cyclone", "hurricane", "storm", "landfall", "चक्रवात", "तूफान", "तूफ़ान", "चक्रीवादळ",
                "ঘূর্ণিঝড়", "ବାତ୍ୟା", "புயல்", "తుఫాను", "ചുഴലിക്കാറ്റ"],
    "Landslide": ["landslide", "mudslide", "slope fail", "भूस्खलन", "ভূমিধস", "ଭୂସ୍ଖଳନ", "நிலச்சரிவு",
                  "కొండచరియ", "ഉരുൾപൊട്ട", "മണ്ണിടിച്ചിൽ"],
    "Earthquake": ["earthquake", "tremor", "quake", "भूकंप", "भूकम्प", "ভূমিকম্প", "ଭୂମିକମ୍ପ",
                   "நிலநடுக்கம்", "భూకంప", "ഭൂകമ്പ"],
    "Fire": ["fire", "blaze", "burning", "wildfire", "आग", "আগুন", "ନିଆଁ", "தீ ", "మంటలు", "అగ్ని", "തീപിട"],
    "Collapse": ["collapse", "rubble", "building fell", "इमारत गिर", "ढह", "मलबा", "ভেঙে পড়"],
    "Heatwave": ["heatwave", "heat wave", "heat stroke", "heatstroke", "लू ", "लू,", "तापमान", "ਲੂ"],
}

FLAG_TERMS: dict[str, list[str]] = {
    "trapped_civilians": ["trapped", "stranded", "stuck", "cut off", "on the roof", "rooftop", "फंसे", "फँसे",
                          "फंसा", "फँसा", "अडकले", "আটকে", "আবদ্ধ", "ଫସି", "சிக்கி", "చిక్కుకు", "കുടുങ്ങി"],
    "medical_emergency": ["injur", "bleeding", "unconscious", "ambulance", "doctor", "medicine", "insulin",
                          "dialysis", "oxygen", "pregnan", "hospital", "heart attack", "घायल", "चोट", "एम्बुलेंस",
                          "डॉक्टर", "दवा", "बेहोश", "गर्भवती", "जखमी", "আহত", "ডাক্তার", "ଆହତ", "காயம்",
                          "గాయ", "പരിക്ക"],
    "food_water_needed": ["food", "hungry", "ration", "drinking water", "no water", "starv", "खाना", "भोजन",
                          "पीने", "राशन", "भूखे", "पाणी", "অন্ন", "খাবার", "পানীয়", "ଖାଦ୍ୟ", "உணவு",
                          "తాగునీ", "ఆహార", "ഭക്ഷണ"],
    "road_blocked": ["road blocked", "road closed", "road washed", "bridge collapsed", "bridge washed",
                     "no road", "highway blocked", "सड़क बंद", "रास्ता बंद", "पुल टूट", "रस्ता बंद", "রাস্তা বন্ধ",
                     "সেতু ভেঙে", "ରାସ୍ତା ବନ୍ଦ", "சாலை மூட", "சாலை துண்டி", "பாலம் உடை", "రోడ్డు మూసి",
                     "రహదారి తెగి", "റോഡ് തകർ", "ഗതാഗതം തടസ്സ"],
}

DEATH_TERMS = ["dead", "died", "killed", "bodies", "casualt", "मौत", "मृत", "मरे", "মৃত", "ମୃତ", "இறந்த",
               "మృతి", "മരിച്ച"]

NEED_TERMS: dict[str, list[str]] = {
    "Boats": ["boat", "नाव", "नौका", "নৌকা", "ডিঙি", "ଡଙ୍ଗା", "படகு", "పడవ", "होडी", "വള്ളം"],
    "Insulin": ["insulin", "इंसुलिन"],
    "Blood": ["blood", "खून", "रक्त", "রক্ত", "ରକ୍ତ", "இரத்த", "రక్త"],
    "Oxygen": ["oxygen", "ऑक्सीजन"],
    "Medicine": ["medicine", "दवा", "ঔষধ", "ওষুধ", "மருந்து", "మందు"],
    "Food": ["food", "ration", "खाना", "भोजन", "राशन", "খাবার", "ଖାଦ୍ୟ", "உணவு", "ఆహార"],
    "Drinking water": ["drinking water", "पीने का पानी", "पानी चाहिए", "পানীয় জল", "ପିଇବା ପାଣି", "తాగునీ"],
    "Shelter": ["shelter", "tent", "आश्रय", "शिविर", "আশ্রয়"],
    "Rescue team": ["rescue", "बचाव", "উদ্ধার", "ଉଦ୍ଧାର", "மீட்பு", "రక్షణ", "രക്ഷാ"],
}

_PEOPLE = r"(?:people|persons|person|families|family|children|kids|villagers|लोग|व्यक्ति|परिवार|बच्चे|जन|জন|লোক|ଜଣ|பேர்|మంది)"
_COUNT_RE = re.compile(r"(\d{1,4})\s*" + _PEOPLE, re.IGNORECASE)


def _normalise(text: str) -> str:
    # Convert any Unicode decimal digit (e.g. Devanagari ४) to ASCII before matching.
    digits = "".join(str(unicodedata.digit(ch)) if ch.isdigit() and not ch.isascii() else ch for ch in text)
    return " " + unicodedata.normalize("NFC", digits).lower() + " "


def detect_language(text: str, hint: Optional[str] = None) -> str:
    counts: dict[str, int] = {}
    for ch in text:
        cp = ord(ch)
        for code, lo, hi in _SCRIPTS:
            if lo <= cp <= hi:
                counts[code] = counts.get(code, 0) + 1
    if not counts:
        return hint or "en"
    script = max(counts, key=counts.__getitem__)
    # Devanagari is shared by Hindi and Marathi; Bengali script by Bengali and Assamese.
    if hint and ((script == "hi" and hint == "mr") or (script == "bn" and hint == "as")):
        return hint
    return script


def _hits(text: str, terms: list[str]) -> int:
    return sum(1 for t in terms if t in text)


def deterministic(text: str, language_hint: Optional[str] = None) -> dict[str, Any]:
    norm = _normalise(text)
    type_scores = {k: _hits(norm, v) for k, v in DISASTER_TERMS.items()}
    best = max(type_scores, key=type_scores.__getitem__)
    disaster_type = best if type_scores[best] else "Unspecified"
    flags = {k: _hits(norm, v) > 0 for k, v in FLAG_TERMS.items()}
    deaths = _hits(norm, DEATH_TERMS) > 0
    needs = [need for need, terms in NEED_TERMS.items() if _hits(norm, terms)]
    if "Food" in needs or "Drinking water" in needs:
        flags["food_water_needed"] = True
    if "Insulin" in needs or "Blood" in needs or "Oxygen" in needs:
        flags["medical_emergency"] = True

    counts = [int(m) for m in _COUNT_RE.findall(norm)]
    trapped_count = max(counts) if counts and flags["trapped_civilians"] else None

    has_disaster = disaster_type != "Unspecified"
    if flags["trapped_civilians"] or deaths or (flags["medical_emergency"] and has_disaster):
        severity, urgency = "CRITICAL", 5
    elif flags["medical_emergency"] or flags["road_blocked"] or (has_disaster and flags["food_water_needed"]):
        severity, urgency = "HIGH", 4
    elif has_disaster or flags["food_water_needed"]:
        severity, urgency = "MODERATE", 3
    else:
        severity, urgency = "LOW", 1 if not needs else 2
    if trapped_count and trapped_count >= 10 and urgency == 5:
        urgency = 5

    signals = int(has_disaster) + sum(flags.values()) + int(deaths) + min(2, len(needs))
    confidence = round(min(0.97, 0.52 + 0.09 * signals + 0.03 * min(3, type_scores[best])), 3)
    return {
        "disaster_type": disaster_type, "severity": severity, "urgency_score": urgency,
        "confidence": confidence, "language": detect_language(text, language_hint), "flags": flags,
        "needs": needs, "trapped_count": trapped_count,
    }


def _local_router(text: str, location: Optional[str], hint: Optional[str]) -> Optional[dict]:
    try:
        import laya  # type: ignore[import-not-found]
    except ImportError:
        return None
    try:
        result = laya.triage(text, location=location, language_hint=hint)  # type: ignore[attr-defined]
        return dict(result) if result else None
    except Exception:  # noqa: BLE001 — any router failure drops to the next tier
        return None


def _hosted(text: str, location: Optional[str], hint: Optional[str]) -> Optional[dict]:
    settings = get_settings()
    if not settings.impossibl_api_key:
        return None
    try:
        resp = httpx.post(settings.impossibl_api_url, timeout=HOSTED_TIMEOUT_S,
                          headers={"Authorization": f"Bearer {settings.impossibl_api_key}"},
                          json={"text": text, "location": location, "language_hint": hint})
        resp.raise_for_status()
        return resp.json()
    except (httpx.HTTPError, ValueError):
        return None


_REQUIRED = {"disaster_type", "severity", "urgency_score", "confidence", "flags"}


def triage(text: str, location: Optional[str] = None, language_hint: Optional[str] = None) -> dict[str, Any]:
    started = time.perf_counter()
    baseline = deterministic(text, language_hint)
    result, tier = baseline, "deterministic"
    for name, fn in (("laya-local", _local_router), ("impossibl-hosted", _hosted)):
        candidate = fn(text, location, language_hint)
        if candidate and _REQUIRED <= candidate.keys():
            result = {**baseline, **candidate, "flags": {**baseline["flags"], **candidate["flags"]}}
            tier = name
            break
    result["tier"] = tier
    result["latency_ms"] = round((time.perf_counter() - started) * 1000, 3)
    return result
