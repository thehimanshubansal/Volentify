"""Platform rules enforced on the server: privacy scrubbing, priority sanity, reserved payload fields, time limits.

These mirror the rules shown to people on /safety and inside the Volentify Mesh app. The server enforces them again
because a phone can run an old app version, and anything that arrives over the mesh is untrusted input.

  * PII scrubbing     Aadhaar, PAN, bank/card and phone numbers are removed from free text before it is stored or
                      relayed (DPDP Act 2023 data minimisation; reports are readable by every phone that relays them).
  * Reserved fields   `official`, `role`, `alert_code`, `automated`, `minimised` can only be set by the server, so a
                      phone cannot make a message look like it came from incident command (DM Act 2005, s.54).
  * Priority sanity   CRITICAL is reserved for life-safety report types; anything else is capped at HIGH.
  * Ghost missions    a mission accepted but not started within MISSION_START_MINUTES returns to the open pool.
  * Retention         free text and exact coordinates of field reports are minimised RETENTION_DAYS after the
                      observation once the incident is closed (or was never linked to one).
"""

from __future__ import annotations

import re
from typing import Any

MISSION_START_MINUTES = 45
RETENTION_DAYS = 30
MAX_MESSAGE_CHARS = 240

LIFE_SAFETY_TYPES = {"PERSON_TRAPPED", "MEDICAL_EMERGENCY", "FIRE", "FLOOD", "PERSON_MISSING"}
RESERVED_PAYLOAD_KEYS = {"official", "role", "alert_code", "automated", "minimised"}
TEXT_KEYS = ("notes", "note", "message", "location_text", "from")

# Order matters: longest identifiers first (a card number would otherwise be half-matched as an Aadhaar,
# an Aadhaar as a phone number).
_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("card or account number", re.compile(r"(?<!\d)\d(?:[\s-]?\d){12,18}(?!\d)")),
    ("Aadhaar number", re.compile(r"(?<!\d)[2-9]\d{3}[\s-]?\d{4}[\s-]?\d{4}(?![\s-]?\d)")),
    ("PAN", re.compile(r"\b[A-Z]{5}\d{4}[A-Z]\b")),
    ("phone number", re.compile(r"(?<![\d+])(?:\+?91[\s-]?|0)?[6-9]\d{4}[\s-]?\d{5}(?!\d)")),
]


def scrub_pii(text: str) -> tuple[str, list[str]]:
    """Replace identity and contact numbers with [removed]. Returns the clean text and what was removed."""
    removed: list[str] = []
    for label, pattern in _PATTERNS:
        text, n = pattern.subn("[removed]", text)
        if n and label not in removed:
            removed.append(label)
    return text, removed


_IMPERSONATION = re.compile(r"volentify|official|incident\s*command|ndma|ndrf|sdma|\bimd\b", re.IGNORECASE)


def clean_payload(payload: dict[str, Any], *, allow_reserved: bool = False) -> dict[str, Any]:
    """Scrub free-text fields and drop server-only keys from a report or message payload.

    A sender name that claims to be Volentify, command or an authority is replaced: only the server may speak
    for them.
    """
    out: dict[str, Any] = {}
    for key, value in payload.items():
        if key in RESERVED_PAYLOAD_KEYS and not allow_reserved:
            continue
        if key in TEXT_KEYS and isinstance(value, str):
            value, _ = scrub_pii(value)
        if key == "from" and isinstance(value, str) and not allow_reserved and _IMPERSONATION.search(value):
            value = "Field team"
        out[key] = value
    return out


def cap_priority(event_type: str, priority: str) -> str:
    if priority == "CRITICAL" and event_type not in LIFE_SAFETY_TYPES:
        return "HIGH"
    return priority
