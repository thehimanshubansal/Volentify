"""Research archive: a timestamped, append-only record of what the platform observed and predicted.

Live feeds (NDMA SACHET CAP alerts), every forecast served, every dispatch run, each trained model version and
periodic platform snapshots are written to the `research_log` table so results can be reproduced and analysed
later. Writes are best-effort and never slow down or fail the request that triggered them. No personal data is
recorded: citizen report text, names, phone numbers and exact volunteer locations stay out of the archive.
"""

from __future__ import annotations

import hashlib
import json
from collections import deque
from datetime import datetime, timezone
from typing import Any, Iterable, Optional

from . import db

KINDS = ("cap_alert", "forecast", "dispatch_run", "model_version", "platform_snapshot")

DDL = """
CREATE TABLE IF NOT EXISTS "research_log" (
  "id"          BIGSERIAL PRIMARY KEY,
  "kind"        TEXT NOT NULL,
  "source"      TEXT NOT NULL,
  "ref"         TEXT,
  "recorded_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "payload"     JSONB NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "research_log_kind_ref_key" ON "research_log" ("kind", "ref") WHERE "ref" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "research_log_kind_time_idx" ON "research_log" ("kind", "recorded_at");
"""

_ready: set[int] = set()
_memory: deque[dict] = deque(maxlen=5000)  # used only when no database is configured (local runs, tests)


def _default(value: Any):
    if isinstance(value, datetime):
        return value.astimezone(timezone.utc).isoformat()
    if isinstance(value, (set, tuple)):
        return list(value)
    return str(value)


def _plain(payload: Any) -> Any:
    return json.loads(json.dumps(payload, default=_default))


def fingerprint(*parts: Any) -> str:
    return hashlib.sha1("|".join(str(p) for p in parts).encode()).hexdigest()[:20]


def _store() -> Optional[db.PostgresStore]:
    pg = db._postgres()
    if pg is not None and id(pg) not in _ready:
        with pg._conn() as conn:
            conn.execute(DDL)
        _ready.add(id(pg))
    return pg


def record_many(kind: str, source: str, rows: Iterable[tuple[Optional[str], Any]]) -> int:
    """Append (ref, payload) rows; rows whose ref was already recorded for this kind are skipped."""
    rows = [(ref, _plain(payload)) for ref, payload in rows]
    if not rows:
        return 0
    try:
        pg = _store()
        if pg is None:
            if db.get_settings().database_url:
                return 0  # configured but unreachable: drop rather than keep a misleading partial archive
            seen = {(r["kind"], r["ref"]) for r in _memory if r["ref"]}
            fresh = [r for r in rows if not r[0] or (kind, r[0]) not in seen]
            for ref, payload in fresh:
                _memory.append({"id": len(_memory) + 1, "kind": kind, "source": source, "ref": ref,
                                "recorded_at": datetime.now(timezone.utc), "payload": payload})
            return len(fresh)
        from psycopg.types.json import Jsonb
        inserted = 0
        with pg._conn() as conn:
            for ref, payload in rows:
                cur = conn.execute(
                    'INSERT INTO "research_log" ("kind","source","ref","payload") VALUES (%s,%s,%s,%s) '
                    'ON CONFLICT DO NOTHING', (kind, source, ref, Jsonb(payload)))
                inserted += cur.rowcount or 0
        return inserted
    except Exception as exc:  # noqa: BLE001 — the archive must never break the request it observes
        if db._is_db_error(exc):
            db._mark_down(exc)
            return 0
        raise


def record(kind: str, source: str, payload: Any, ref: Optional[str] = None) -> int:
    return record_many(kind, source, [(ref, payload)])


def query(kind: Optional[str] = None, since: Optional[datetime] = None, limit: int = 10000) -> list[dict]:
    pg = _store()
    if pg is None:
        rows = [r for r in _memory if (not kind or r["kind"] == kind) and (not since or r["recorded_at"] >= since)]
        return rows[-limit:]
    clauses, params = [], []
    if kind:
        clauses.append('"kind" = %s')
        params.append(kind)
    if since:
        clauses.append('"recorded_at" >= %s')
        params.append(since)
    where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
    return pg._all(f'SELECT * FROM "research_log" {where} ORDER BY "recorded_at", "id" LIMIT %s',
                   (*params, limit))


def summary() -> dict[str, Any]:
    pg = _store()
    if pg is None:
        out: dict[str, Any] = {}
        for r in _memory:
            k = out.setdefault(r["kind"], {"count": 0, "first": r["recorded_at"], "last": r["recorded_at"]})
            k["count"] += 1
            k["last"] = r["recorded_at"]
        return out
    rows = pg._all('SELECT "kind", COUNT(*)::int AS count, MIN("recorded_at") AS first, MAX("recorded_at") AS last '
                   'FROM "research_log" GROUP BY "kind" ORDER BY "kind"')
    return {r["kind"]: {"count": r["count"], "first": r["first"], "last": r["last"]} for r in rows}
