"""Audit trail of privileged and safety-relevant actions.

Every role change, verification, alert broadcast, mission change, mesh review decision, node quarantine, password
change and elevated sign-in is written to the append-only `audit_log` table. Each entry carries the SHA-256 of its
own content chained to the previous entry's hash, so a deleted or edited row breaks the chain and is detectable
(`GET /api/admin/audit/verify`). The CERT-In directions of 28 April 2022 ask for logs to be kept for at least
180 days; Volentify never deletes them.

Writes are best-effort: an audit failure is logged but never blocks the action itself, because in an emergency a
mission update matters more than its paperwork. Detail fields must not contain report text or contact details.
"""

from __future__ import annotations

import hashlib
import json
import logging
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import Request

from . import db

log = logging.getLogger("volentify.audit")

RETENTION_DAYS = 180


def _canonical(row: dict) -> str:
    def default(value: Any) -> str:
        if isinstance(value, datetime):
            return value.astimezone(timezone.utc).isoformat()
        return str(value)

    keys = ("at", "actor_id", "actor_email", "actor_role", "action", "target_type", "target_id", "detail", "ip")
    return json.dumps({k: row.get(k) for k in keys}, sort_keys=True, separators=(",", ":"), default=default)


def chain_hash(prev_hash: str, row: dict) -> str:
    return hashlib.sha256(f"{prev_hash}|{_canonical(row)}".encode()).hexdigest()


def verify_chain(rows: list[dict]) -> dict[str, Any]:
    """Check entries (oldest first) against their stored hashes. Returns the first break, if any."""
    prev: Optional[str] = None
    for row in rows:
        if prev is not None and row.get("prev_hash") != prev:
            return {"ok": False, "checked": rows.index(row), "broken_at": row.get("id"), "reason": "missing entry"}
        if chain_hash(row.get("prev_hash") or "", row) != row.get("hash"):
            return {"ok": False, "checked": rows.index(row), "broken_at": row.get("id"), "reason": "altered entry"}
        prev = row.get("hash")
    return {"ok": True, "checked": len(rows), "broken_at": None, "reason": None}


def record(action: str, claims: Optional[dict] = None, *, target_type: Optional[str] = None,
           target_id: Optional[str] = None, detail: Optional[dict] = None, request: Optional[Request] = None) -> None:
    from .security import client_key

    claims = claims or {}
    row = {
        "at": datetime.now(timezone.utc),
        "actor_id": claims.get("sub"), "actor_email": claims.get("email"), "actor_role": claims.get("role"),
        "action": action, "target_type": target_type, "target_id": target_id, "detail": detail or {},
        "ip": client_key(request) if request is not None else None,
    }
    try:
        db.write(lambda s: s.add_audit(row))
    except Exception:  # noqa: BLE001 — never block the action being audited
        log.exception("audit write failed for %s", action)
