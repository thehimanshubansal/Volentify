"""Data access with zero-downtime fallback (PRD §1.2, §9).

`PostgresStore` talks to the Neon PostgreSQL database through Neon's pooled endpoint (PgBouncer in transaction
mode). `MemoryStore` holds the same entities in process memory when no database is configured or it is
unreachable. Both implement the same methods, so routers never branch on the backend.

There is no demonstration dataset: incidents come from live public hazard feeds (engines/live.py, mirrored into
memory as well as the database) and everything else — users, volunteers, missions, alerts, mesh reports — is
created by real people using the platform. The memory store therefore starts empty.

Reads silently degrade to the memory store. Writes that must be durable (mesh ingest) raise
`DurabilityUnavailable` instead, so gateways keep their outbox and retry (PRD AT-08).
"""

from __future__ import annotations

import copy
import json
import threading
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Callable, Optional, TypeVar
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from .config import get_settings

T = TypeVar("T")

ACTIVE_TASK_STATES = ("ASSIGNED", "IN_PROGRESS")
NODE_LIVENESS = timedelta(minutes=30)  # OD-06


class DurabilityUnavailable(RuntimeError):
    """Raised when a write requires PostgreSQL but it is unreachable."""


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


# ─── In-memory store ────────────────────────────────────────────────────────

class MemoryStore:
    def __init__(self) -> None:
        self._lock = threading.RLock()
        self.reset()

    def reset(self) -> None:
        with self._lock:
            self.users: dict[str, dict] = {}
            self.volunteers: dict[str, dict] = {}
            self.disasters: dict[str, dict] = {}
            self.evidence: list[dict] = []
            self.tasks: dict[str, dict] = {}
            self.alerts: list[dict] = []
            self.orgs: list[dict] = []
            self.mesh_nodes: dict[str, dict] = {}
            self.mesh_events: dict[str, dict] = {}
            self.cache: dict[str, tuple[float, Any]] = {}
            self.reviews: dict[tuple[str, str], dict] = {}
            self.audit: list[dict] = []
            self.blocked: dict[str, dict] = {}
            self.rates: dict[str, tuple[float, int]] = {}
            self._provision_regulators()

    def _provision_regulators(self) -> None:
        """The platform regulator accounts exist in every store, like schema.sql creates them in PostgreSQL."""
        from ..data.migrations import REGULATOR_PROFILE
        from ..data.regulators import REGULATORS
        ts = utcnow()
        for r in REGULATORS:
            self.users[r["id"]] = {
                "id": r["id"], "name": r["name"], "email": r["email"], "phone": "", "password_hash": r["password_hash"],
                "role": "INCIDENT_ADMIN", "state_district": None, "lat": None, "lng": None, "provider": "credentials",
                "google_id": None, "avatar_url": None, "blood_group": None, "emergency_contact": None,
                "is_verified": True, "onboarded": True, "org_id": None, "profile_data": dict(REGULATOR_PROFILE),
                "muster_code": None, "muster_issued_at": None, "created_at": ts, "updated_at": ts}

    def load(self, dataset: dict[str, list[dict]]) -> None:
        """Install a dataset (used by the test suite's fixtures)."""
        with self._lock:
            self.users.update({u["id"]: copy.deepcopy(u) for u in dataset.get("users", [])})
            self.volunteers.update({v["id"]: copy.deepcopy(v) for v in dataset.get("volunteers", [])})
            self.disasters.update({d["id"]: copy.deepcopy(d) for d in dataset.get("disasters", [])})
            self.evidence.extend(copy.deepcopy(e) for e in dataset.get("evidence", []))
            self.tasks.update({t["id"]: copy.deepcopy(t) for t in dataset.get("tasks", [])})
            self.alerts.extend(copy.deepcopy(a) for a in dataset.get("alerts", []))
            self.orgs.extend(copy.deepcopy(o) for o in dataset.get("organizations", []))
            self.mesh_nodes.update({n["node_uuid"]: copy.deepcopy(n) for n in dataset.get("mesh_nodes", [])})
            self.mesh_events.update({e["event_id"]: copy.deepcopy(e) for e in dataset.get("mesh_events", [])})

    # users
    def get_user(self, user_id: str) -> Optional[dict]:
        return copy.deepcopy(self.users.get(user_id))

    def get_user_by_email(self, email: str) -> Optional[dict]:
        return copy.deepcopy(next((u for u in self.users.values() if u["email"] == email.lower()), None))

    def get_user_by_google(self, google_id: str) -> Optional[dict]:
        return copy.deepcopy(next((u for u in self.users.values() if u.get("google_id") == google_id), None))

    def create_user(self, user: dict) -> dict:
        with self._lock:
            if self.get_user_by_email(user["email"]):
                raise ValueError("email already registered")
            self.users[user["id"]] = copy.deepcopy(user)
        return copy.deepcopy(user)

    def update_user(self, user_id: str, fields: dict) -> Optional[dict]:
        with self._lock:
            if user_id not in self.users:
                return None
            self.users[user_id].update(copy.deepcopy(fields), updated_at=utcnow())
            return copy.deepcopy(self.users[user_id])

    def list_users(self, limit: int = 200) -> list[dict]:
        users = sorted(self.users.values(), key=lambda u: u["created_at"], reverse=True)
        return copy.deepcopy(users[:limit])

    # volunteers
    def upsert_volunteer_profile(self, user_id: str, fields: dict) -> dict:
        with self._lock:
            existing = next((v for v in self.volunteers.values() if v.get("user_id") == user_id), None)
            user = self.users[user_id]
            if existing:
                existing.update(fields, name=user["name"], verified=user["is_verified"])
                return copy.deepcopy(existing)
            profile = {
                "id": f"vol_{user_id[-8:]}", "user_id": user_id, "name": user["name"], "skills": [],
                "lat": 20.59, "lng": 78.96, "location_name": "Field Location", "availability": "AVAILABLE",
                "verified": user["is_verified"], "missions_done": 0, "total_hours": 0.0, "equipment": [],
                "badge_level": "Tier-1 Field Responder", "response_rate": 98.0, "active_missions": 0,
            }
            profile.update(fields)
            self.volunteers[profile["id"]] = profile
            return copy.deepcopy(profile)

    def get_volunteer_by_user(self, user_id: str) -> Optional[dict]:
        return copy.deepcopy(next((v for v in self.volunteers.values() if v.get("user_id") == user_id), None))

    def list_volunteers(self, availability: Optional[str] = None) -> list[dict]:
        vols = list(self.volunteers.values())
        if availability:
            vols = [v for v in vols if v["availability"] == availability]
        return copy.deepcopy(vols)

    def set_availability(self, volunteer_id: str, availability: str) -> Optional[dict]:
        with self._lock:
            vol = self.volunteers.get(volunteer_id)
            if not vol:
                return None
            vol["availability"] = availability
            return copy.deepcopy(vol)

    # disasters & evidence
    def list_disasters(self, include_closed: bool = False) -> list[dict]:
        order = {"CRITICAL": 0, "HIGH": 1, "MODERATE": 2, "LOW": 3}
        rows = [d for d in self.disasters.values() if include_closed or d.get("status") != "CLOSED"]
        return copy.deepcopy(sorted(rows, key=lambda d: (order[d["severity"]], d["title"])))

    def upsert_live(self, rows: list[dict], evidence: list[dict], sources_ok: list[str]) -> None:
        """Mirror the live feeds: insert/update incidents, append new evidence, close what the feeds dropped."""
        with self._lock:
            live_ids = {r["id"] for r in rows}
            for d in self.disasters.values():
                if d.get("source") in sources_ok and d.get("status") == "ACTIVE" and d["id"] not in live_ids:
                    d["status"], d["updated_at"] = "CLOSED", utcnow()
            for r in rows:
                existing = self.disasters.get(r["id"])
                if existing:
                    existing.update({k: v for k, v in r.items() if k != "created_at"})
                else:
                    self.disasters[r["id"]] = copy.deepcopy(r)
            known = {e["id"] for e in self.evidence}
            self.evidence.extend(copy.deepcopy(e) for e in evidence if e["id"] not in known)

    def cache_get(self, key: str, max_age_s: Optional[float]) -> Optional[Any]:
        hit = self.cache.get(key)
        if not hit or (max_age_s is not None and time.time() - hit[0] > max_age_s):
            return None
        return copy.deepcopy(hit[1])

    def cache_put(self, key: str, value: Any) -> None:
        self.cache[key] = (time.time(), copy.deepcopy(value))

    def get_disaster(self, disaster_id: str) -> Optional[dict]:
        d = self.disasters.get(disaster_id) or next(
            (x for x in self.disasters.values() if x["code"] == disaster_id), None)
        return copy.deepcopy(d)

    def list_evidence(self, disaster_id: str) -> list[dict]:
        ev = [e for e in self.evidence if e["disaster_id"] == disaster_id]
        return copy.deepcopy(sorted(ev, key=lambda e: e["created_at"], reverse=True))

    def add_evidence(self, evidence: dict) -> dict:
        with self._lock:
            self.evidence.append(copy.deepcopy(evidence))
        return evidence

    # tasks
    def list_tasks(self, status: Optional[str] = None, disaster_id: Optional[str] = None,
                   assigned_to: Optional[str] = None) -> list[dict]:
        tasks = list(self.tasks.values())
        if status:
            tasks = [t for t in tasks if t["status"] == status]
        if disaster_id:
            tasks = [t for t in tasks if t["disaster_id"] == disaster_id]
        if assigned_to:
            tasks = [t for t in tasks if t["assigned_to_id"] == assigned_to]
        return copy.deepcopy(sorted(tasks, key=lambda t: t["created_at"], reverse=True))

    def get_task(self, task_id: str) -> Optional[dict]:
        return copy.deepcopy(self.tasks.get(task_id))

    def create_task(self, task: dict) -> dict:
        with self._lock:
            self.tasks[task["id"]] = copy.deepcopy(task)
        return task

    def update_task(self, task_id: str, fields: dict) -> Optional[dict]:
        with self._lock:
            task = self.tasks.get(task_id)
            if not task:
                return None
            task.update(fields, updated_at=utcnow())
            return copy.deepcopy(task)

    # alerts & organisations
    def list_alerts(self, limit: int = 100) -> list[dict]:
        return copy.deepcopy(sorted(self.alerts, key=lambda a: a["created_at"], reverse=True)[:limit])

    def create_alert(self, alert: dict) -> dict:
        with self._lock:
            self.alerts.append(copy.deepcopy(alert))
        return alert

    def list_organizations(self) -> list[dict]:
        return copy.deepcopy(self.orgs)

    # mesh
    def upsert_node(self, node_uuid: str, fields: dict) -> dict:
        with self._lock:
            node = self.mesh_nodes.get(node_uuid)
            if node is None:
                node = {"id": f"mn_{node_uuid[:8]}", "node_uuid": node_uuid, "volunteer_id": None,
                        "last_lat": None, "last_lng": None, "battery_level": None,
                        "last_seen_at": utcnow(), "created_at": utcnow()}
                self.mesh_nodes[node_uuid] = node
            node.update({k: v for k, v in fields.items() if v is not None})
            node["last_seen_at"] = utcnow()
            return copy.deepcopy(node)

    def insert_mesh_event(self, event: dict) -> bool:
        with self._lock:
            if event["event_id"] in self.mesh_events:
                return False
            self.mesh_events[event["event_id"]] = copy.deepcopy(event)
            return True

    def get_mesh_event(self, event_id: str) -> Optional[dict]:
        return copy.deepcopy(self.mesh_events.get(event_id))

    def update_mesh_event(self, event_id: str, fields: dict) -> Optional[dict]:
        with self._lock:
            ev = self.mesh_events.get(event_id)
            if not ev:
                return None
            ev.update(fields)
            return copy.deepcopy(ev)

    def list_mesh_events(self, disaster_id: Optional[str] = None, priority: Optional[str] = None,
                         type_: Optional[str] = None, since: Optional[datetime] = None,
                         limit: int = 50) -> list[dict]:
        evs = list(self.mesh_events.values())
        if disaster_id:
            evs = [e for e in evs if e["disaster_id"] == disaster_id]
        if priority:
            evs = [e for e in evs if e["priority"] == priority]
        if type_:
            evs = [e for e in evs if e["type"] == type_]
        if since:
            evs = [e for e in evs if e["observed_at"] >= since]
        return copy.deepcopy(sorted(evs, key=lambda e: e["observed_at"], reverse=True)[:limit])

    def list_mesh_nodes(self) -> list[dict]:
        return copy.deepcopy(sorted(self.mesh_nodes.values(), key=lambda n: n["last_seen_at"], reverse=True))


    def hit_rate(self, key: str, window_s: int, increment: bool = True) -> int:
        with self._lock:
            now = time.time()
            start, hits = self.rates.get(key, (now, 0))
            if now - start > window_s:
                start, hits = now, 0
            if increment:
                hits += 1
            self.rates[key] = (start, hits)
            return hits

    def list_blocked_nodes(self) -> list[dict]:
        return copy.deepcopy(sorted(self.blocked.values(), key=lambda b: b["created_at"], reverse=True))

    def blocked_among(self, node_uuids: list[str]) -> set[str]:
        return {u for u in node_uuids if u in self.blocked}

    def block_node(self, node_uuid: str, reason: str, blocked_by: Optional[str]) -> dict:
        with self._lock:
            row = {"node_uuid": node_uuid, "reason": reason, "blocked_by": blocked_by, "created_at": utcnow()}
            self.blocked.setdefault(node_uuid, row)
            return copy.deepcopy(self.blocked[node_uuid])

    def unblock_node(self, node_uuid: str) -> bool:
        with self._lock:
            return self.blocked.pop(node_uuid, None) is not None

    def minimise_mesh_events(self, before: datetime) -> int:
        """DPDP data minimisation: strip free text and coarsen coordinates of old reports (see rules.py)."""
        closed = {d["id"] for d in self.disasters.values() if d.get("status") == "CLOSED"}
        n = 0
        with self._lock:
            for ev in self.mesh_events.values():
                payload = ev.get("payload") or {}
                if ev["observed_at"] >= before or payload.get("minimised"):
                    continue
                if ev.get("disaster_id") and ev["disaster_id"] not in closed:
                    continue
                ev["payload"] = {"minimised": True, **{k: payload[k] for k in ("count", "needs", "count_band")
                                                       if k in payload}}
                if ev.get("lat") is not None:
                    ev["lat"], ev["lng"] = round(ev["lat"], 2), round(ev["lng"], 2)
                n += 1
        return n

    # volunteers: profile & mission bookkeeping
    def get_volunteer(self, volunteer_id: str) -> Optional[dict]:
        vol = self.volunteers.get(volunteer_id)
        if not vol:
            return None
        out = copy.deepcopy(vol)
        out["active_missions"] = sum(1 for t in self.tasks.values() if t.get("assigned_to_id") == vol["user_id"]
                                     and t["status"] in ACTIVE_TASK_STATES)
        return out

    def set_volunteer_location(self, user_id: str, lat: float, lng: float, location_name: Optional[str]) -> None:
        with self._lock:
            for vol in self.volunteers.values():
                if vol.get("user_id") == user_id:
                    vol["lat"], vol["lng"] = lat, lng
                    if location_name:
                        vol["location_name"] = location_name

    def record_mission_completion(self, user_id: str, hours: float) -> None:
        with self._lock:
            for vol in self.volunteers.values():
                if vol.get("user_id") == user_id:
                    vol["missions_done"] = int(vol.get("missions_done") or 0) + 1
                    vol["total_hours"] = round(float(vol.get("total_hours") or 0) + hours, 2)

    def release_stale_assignments(self, cutoff: datetime) -> list[dict]:
        released = []
        with self._lock:
            for t in self.tasks.values():
                accepted = t.get("accepted_at") or t.get("updated_at")
                if t["status"] == "ASSIGNED" and accepted and accepted < cutoff:
                    released.append({"id": t["id"], "code": t["code"], "released_from": t.get("assigned_to_id")})
                    t.update(status="OPEN", assigned_to_id=None, accepted_at=None, updated_at=utcnow())
        return released

    # reviews
    def upsert_review(self, review: dict) -> dict:
        with self._lock:
            key = (review["volunteer_user_id"], review["author_id"])
            existing = self.reviews.get(key)
            if existing:
                existing.update(rating=review["rating"], comment=review["comment"],
                                task_id=review.get("task_id") or existing.get("task_id"), updated_at=utcnow())
            else:
                self.reviews[key] = copy.deepcopy(review)
            return copy.deepcopy(self.reviews[key])

    def list_reviews(self, volunteer_user_id: str) -> list[dict]:
        out = []
        for r in self.reviews.values():
            if r["volunteer_user_id"] != volunteer_user_id:
                continue
            author = self.users.get(r["author_id"]) or {}
            task = self.tasks.get(r.get("task_id") or "") or {}
            out.append({**copy.deepcopy(r), "author_name": author.get("name", "Member"),
                        "author_role": author.get("role", "CITIZEN"), "task_code": task.get("code")})
        return sorted(out, key=lambda r: r["updated_at"], reverse=True)

    # audit trail
    def add_audit(self, row: dict) -> dict:
        from .audit import chain_hash
        with self._lock:
            prev = self.audit[-1]["hash"] if self.audit else ""
            entry = {**copy.deepcopy(row), "id": len(self.audit) + 1, "prev_hash": prev}
            entry["hash"] = chain_hash(prev, row)
            self.audit.append(entry)
            return copy.deepcopy(entry)

    def list_audit(self, limit: int = 200, action: Optional[str] = None, actor: Optional[str] = None) -> list[dict]:
        rows = [a for a in self.audit if (not action or a["action"].startswith(action))
                and (not actor or actor in (a.get("actor_email") or "") or actor == a.get("actor_id"))]
        return copy.deepcopy(list(reversed(rows))[:limit])

    # transparency: raw rows for engines/transparency.py (no personal data)
    def transparency_rows(self) -> dict[str, list[dict]]:
        def pick(rows, *keys):
            return [{k: r.get(k) for k in keys} for r in rows]
        mesh = []
        for e in self.mesh_events.values():
            payload = e.get("payload") if isinstance(e.get("payload"), dict) else {}
            count = payload.get("count")
            mesh.append({"type": e["type"], "priority": e["priority"], "review_status": e["review_status"],
                         "observed_at": e["observed_at"], "received_at": e["received_at"],
                         "count": count if isinstance(count, int) else None, "origin_node_id": e["origin_node_id"]})
        users = {u["id"]: u for u in self.users.values()}
        return {
            "disasters": pick(self.disasters.values(), "source", "category", "status", "severity", "created_at"),
            "alerts": pick(self.alerts, "level", "category", "created_at"),
            "mesh": mesh,
            "nodes": pick(self.mesh_nodes.values(), "last_seen_at"),
            "tasks": pick(self.tasks.values(), "status", "urgency", "required_skill", "created_at", "accepted_at",
                          "started_at", "completed_at", "people_helped", "assigned_to_id"),
            "volunteers": [{"availability": v["availability"], "skills": v.get("skills") or [],
                            "verified": bool((users.get(v.get("user_id")) or {}).get("is_verified", v.get("verified")))}
                           for v in self.volunteers.values()],
            "users": pick(self.users.values(), "role", "is_verified", "created_at"),
            "reviews": pick(self.reviews.values(), "rating"),
            "audit": pick(self.audit, "action", "at"),
            "blocked": pick(self.blocked.values(), "created_at"),
        }


# ─── PostgreSQL store ───────────────────────────────────────────────────────

def _clean_dsn(url: str) -> str:
    """Normalise a connection URL for libpq.

    * drops Prisma-only query params such as ?pgbouncer=true
    * percent-encodes the password, so passwords containing @ : / [ ] work even when pasted raw
    """
    import re
    from urllib.parse import quote, unquote

    m = re.match(r"^(postgres(?:ql)?://)([^:/@]+):(.*)@([^@/]+)(/.*)?$", url.strip())
    if m:
        scheme, user, password, host, rest = m.groups()
        url = f"{scheme}{user}:{quote(unquote(password), safe='')}@{host}{rest or ''}"
    parts = urlsplit(url)
    query = [(k, v) for k, v in parse_qsl(parts.query) if k not in {"pgbouncer", "connection_limit", "schema"}]
    return urlunsplit(parts._replace(query=urlencode(query)))


_USER_COLS = ("id, name, email, phone, password_hash, role, state_district, lat, lng, provider, google_id, "
              "avatar_url, blood_group, emergency_contact, is_verified, onboarded, org_id, profile_data, "
              "muster_code, muster_issued_at, created_at, updated_at")
_VOL_SELECT = (
    "SELECT vp.id, vp.user_id, u.name, vp.skills, vp.current_lat AS lat, vp.current_lng AS lng, "
    "vp.location_name, vp.availability, u.is_verified AS verified, vp.missions_done, vp.total_hours, "
    "vp.equipment, vp.badge_level, vp.response_rate, "
    "(SELECT count(*) FROM tasks t WHERE t.assigned_to_id = vp.user_id "
    " AND t.status IN ('ASSIGNED','IN_PROGRESS'))::int AS active_missions "
    "FROM volunteer_profiles vp JOIN users u ON u.id = vp.user_id")
_DISASTER_COLS = ("id, code, title, category, severity, lat, lng, location, state, radius_km, polygon_geojson, "
                  "status, affected_pop, summary, wind_speed_kmh, rainfall_mm, surge_meters, org_id, "
                  "created_at, updated_at, source, source_url, external_id")
_TASK_COLS = ("id, code, title, description, urgency, required_skill, lat, lng, location_name, quantity_needed, "
              "status, disaster_id, created_by_id, assigned_to_id, created_at, updated_at, accepted_at, started_at, "
              "completed_at, start_lat, start_lng, people_helped, outcome_note")
_MESH_COLS = ("id, event_id, origin_node_id, disaster_id, type, priority, payload, lat, lng, observed_at, "
              "hop_count, ttl, received_at, review_status, promoted_task_id")
_NODE_COLS = "id, node_uuid, volunteer_id, last_lat, last_lng, battery_level, last_seen_at, created_at"


class PostgresStore:
    def __init__(self, dsn: str) -> None:
        self.dsn = _clean_dsn(dsn)

    def _conn(self):
        import psycopg
        from psycopg.rows import dict_row
        # prepare_threshold=None: Neon's pooled endpoint (PgBouncer, transaction mode) cannot share prepared
        # statements. connect_timeout=10 leaves room for a suspended Neon compute to wake up (typically 0.5–3 s).
        return psycopg.connect(self.dsn, row_factory=dict_row, connect_timeout=10,
                               prepare_threshold=None, autocommit=True)

    @staticmethod
    def _utc(row: Optional[dict]) -> Optional[dict]:
        # Prisma DateTime columns are `timestamp(3)` holding UTC; make them timezone-aware.
        if row:
            for key, value in row.items():
                if isinstance(value, datetime) and value.tzinfo is None:
                    row[key] = value.replace(tzinfo=timezone.utc)
        return row

    def _all(self, sql: str, params: tuple | dict = ()) -> list[dict]:
        with self._conn() as conn:
            return [self._utc(r) for r in conn.execute(sql, params).fetchall()]  # type: ignore[misc]

    def _one(self, sql: str, params: tuple | dict = ()) -> Optional[dict]:
        with self._conn() as conn:
            return self._utc(conn.execute(sql, params).fetchone())

    @staticmethod
    def _json(value: Any):
        from psycopg.types.json import Jsonb
        return Jsonb(value)

    def ping(self) -> None:
        self._one("SELECT 1 AS ok")

    @staticmethod
    def _disaster(row: Optional[dict]) -> Optional[dict]:
        if row and isinstance(row.get("polygon_geojson"), str):
            try:
                row["polygon_geojson"] = json.loads(row["polygon_geojson"])
            except ValueError:
                row["polygon_geojson"] = None
        return row

    # users
    def get_user(self, user_id: str) -> Optional[dict]:
        return self._one(f"SELECT {_USER_COLS} FROM users WHERE id = %s", (user_id,))

    def get_user_by_email(self, email: str) -> Optional[dict]:
        return self._one(f"SELECT {_USER_COLS} FROM users WHERE email = %s", (email.lower(),))

    def get_user_by_google(self, google_id: str) -> Optional[dict]:
        return self._one(f"SELECT {_USER_COLS} FROM users WHERE google_id = %s", (google_id,))

    def create_user(self, user: dict) -> dict:
        import psycopg
        data = dict(user, profile_data=self._json(user.get("profile_data") or {}))
        cols = ", ".join(data)
        vals = ", ".join(f"%({k})s" for k in data)
        try:
            return self._one(f"INSERT INTO users ({cols}) VALUES ({vals}) RETURNING {_USER_COLS}", data)
        except psycopg.errors.UniqueViolation as exc:
            raise ValueError("email already registered") from exc

    def update_user(self, user_id: str, fields: dict) -> Optional[dict]:
        data = dict(fields)
        if "profile_data" in data:
            data["profile_data"] = self._json(data["profile_data"])
        sets = ", ".join(f"{k} = %({k})s" for k in data)
        data["_id"] = user_id
        return self._one(f"UPDATE users SET {sets}, updated_at = now() WHERE id = %(_id)s RETURNING {_USER_COLS}",
                         data)

    def list_users(self, limit: int = 200) -> list[dict]:
        return self._all(f"SELECT {_USER_COLS} FROM users ORDER BY created_at DESC LIMIT %s", (limit,))

    # volunteers
    def upsert_volunteer_profile(self, user_id: str, fields: dict) -> dict:
        mapping = {"lat": "current_lat", "lng": "current_lng"}
        data = {mapping.get(k, k): v for k, v in fields.items()
                if k in {"skills", "lat", "lng", "location_name", "availability", "equipment", "badge_level"}}
        data.setdefault("current_lat", 20.59)
        data.setdefault("current_lng", 78.96)
        from secrets import token_hex
        insert = dict(data, id=f"vol_{token_hex(8)}", user_id=user_id)
        cols = ", ".join(insert)
        vals = ", ".join(f"%({k})s" for k in insert)
        updates = ", ".join(f"{k} = EXCLUDED.{k}" for k in data)
        self._one(f"INSERT INTO volunteer_profiles ({cols}, updated_at) VALUES ({vals}, now()) "
                  f"ON CONFLICT (user_id) DO UPDATE SET {updates}, updated_at = now() RETURNING id", insert)
        return self.get_volunteer_by_user(user_id)  # type: ignore[return-value]

    def get_volunteer_by_user(self, user_id: str) -> Optional[dict]:
        return self._one(f"{_VOL_SELECT} WHERE vp.user_id = %s", (user_id,))

    def list_volunteers(self, availability: Optional[str] = None) -> list[dict]:
        if availability:
            return self._all(f"{_VOL_SELECT} WHERE vp.availability = %s", (availability,))
        return self._all(_VOL_SELECT)

    def set_availability(self, volunteer_id: str, availability: str) -> Optional[dict]:
        row = self._one("UPDATE volunteer_profiles SET availability = %s, updated_at = now() WHERE id = %s "
                        "RETURNING user_id", (availability, volunteer_id))
        return self.get_volunteer_by_user(row["user_id"]) if row else None

    # disasters & evidence
    def list_disasters(self, include_closed: bool = False) -> list[dict]:
        where = "" if include_closed else "WHERE status <> 'CLOSED' "
        rows = self._all(f"SELECT {_DISASTER_COLS} FROM disasters {where}ORDER BY "
                         "array_position(ARRAY['CRITICAL','HIGH','MODERATE','LOW'], severity::text), title")
        return [self._disaster(r) for r in rows]  # type: ignore[misc]

    def upsert_live(self, rows: list[dict], evidence: list[dict], sources_ok: list[str]) -> None:
        """Upsert live-feed incidents and their evidence in one round trip per statement; close dropped ones."""
        cols = ", ".join(rows[0]) if rows else ""
        with self._conn() as conn, conn.transaction():
            if rows:
                vals = ", ".join(f"%({k})s" for k in rows[0])
                updates = ", ".join(f"{k} = EXCLUDED.{k}" for k in rows[0] if k not in {"id", "created_at"})
                with conn.cursor() as cur:
                    cur.executemany(f"INSERT INTO disasters ({cols}) VALUES ({vals}) "
                                    f"ON CONFLICT (id) DO UPDATE SET {updates}", rows)
            if evidence:
                ecols = ", ".join(evidence[0])
                evals = ", ".join(f"%({k})s" for k in evidence[0])
                with conn.cursor() as cur:
                    cur.executemany(f"INSERT INTO evidence ({ecols}) VALUES ({evals}) ON CONFLICT (id) DO NOTHING",
                                    evidence)
            if sources_ok:
                conn.execute("UPDATE disasters SET status = 'CLOSED', updated_at = now() WHERE status = 'ACTIVE' "
                             "AND source = ANY(%s) AND NOT (id = ANY(%s))",
                             (list(sources_ok), [r["id"] for r in rows]))

    def claim_feed(self, feed: str, max_age_s: int) -> bool:
        """True when this instance should refresh `feed` now (it was stale and nobody else has claimed it)."""
        row = self._one("INSERT INTO feed_state (feed, synced_at) VALUES (%s, now()) ON CONFLICT (feed) DO UPDATE "
                        "SET synced_at = now() WHERE feed_state.synced_at < now() - make_interval(secs => %s) "
                        "RETURNING feed", (feed, max_age_s))
        return row is not None

    def mark_feed(self, feed: str, status: dict) -> None:
        self._one("UPDATE feed_state SET synced_at = now(), status = %s WHERE feed = %s RETURNING feed",
                  (self._json(status), feed))

    def feed_status(self, feed: str) -> Optional[dict]:
        return self._one("SELECT feed, synced_at, status FROM feed_state WHERE feed = %s", (feed,))

    def cache_get(self, key: str, max_age_s: Optional[float]) -> Optional[Any]:
        if max_age_s is None:
            row = self._one("SELECT payload FROM feed_cache WHERE key = %s", (key,))
        else:
            row = self._one("SELECT payload FROM feed_cache WHERE key = %s "
                            "AND fetched_at > now() - make_interval(secs => %s)", (key, max_age_s))
        return row["payload"] if row else None

    def cache_put(self, key: str, value: Any) -> None:
        self._one("INSERT INTO feed_cache (key, payload, fetched_at) VALUES (%s, %s, now()) ON CONFLICT (key) "
                  "DO UPDATE SET payload = EXCLUDED.payload, fetched_at = now() RETURNING key",
                  (key, self._json(value)))

    def get_disaster(self, disaster_id: str) -> Optional[dict]:
        return self._disaster(self._one(f"SELECT {_DISASTER_COLS} FROM disasters WHERE id = %s OR code = %s",
                                        (disaster_id, disaster_id)))

    def list_evidence(self, disaster_id: str) -> list[dict]:
        return self._all("SELECT id, disaster_id, author_id, source, source_type, claim_text, relation, confidence, "
                         "language, created_at FROM evidence WHERE disaster_id = %s ORDER BY created_at DESC",
                         (disaster_id,))

    def add_evidence(self, evidence: dict) -> dict:
        cols = ", ".join(evidence)
        vals = ", ".join(f"%({k})s" for k in evidence)
        self._one(f"INSERT INTO evidence ({cols}) VALUES ({vals}) RETURNING id", evidence)
        return evidence

    # tasks
    def list_tasks(self, status: Optional[str] = None, disaster_id: Optional[str] = None,
                   assigned_to: Optional[str] = None) -> list[dict]:
        clauses, params = [], []
        for col, val in (("status", status), ("disaster_id", disaster_id), ("assigned_to_id", assigned_to)):
            if val:
                clauses.append(f"{col} = %s")
                params.append(val)
        where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
        return self._all(f"SELECT {_TASK_COLS} FROM tasks {where} ORDER BY created_at DESC LIMIT 500", tuple(params))

    def get_task(self, task_id: str) -> Optional[dict]:
        return self._one(f"SELECT {_TASK_COLS} FROM tasks WHERE id = %s", (task_id,))

    def create_task(self, task: dict) -> dict:
        cols = ", ".join(task)
        vals = ", ".join(f"%({k})s" for k in task)
        return self._one(f"INSERT INTO tasks ({cols}) VALUES ({vals}) RETURNING {_TASK_COLS}", task)  # type: ignore

    def update_task(self, task_id: str, fields: dict) -> Optional[dict]:
        sets = ", ".join(f"{k} = %({k})s" for k in fields)
        data = dict(fields, _id=task_id)
        return self._one(f"UPDATE tasks SET {sets}, updated_at = now() WHERE id = %(_id)s RETURNING {_TASK_COLS}", data)

    # alerts & organisations
    def list_alerts(self, limit: int = 100) -> list[dict]:
        return self._all("SELECT id, code, title, category, level, location, state, description, advisory, "
                         "disaster_id, sender_id, created_at FROM alerts ORDER BY created_at DESC LIMIT %s", (limit,))

    def create_alert(self, alert: dict) -> dict:
        cols = ", ".join(alert)
        vals = ", ".join(f"%({k})s" for k in alert)
        self._one(f"INSERT INTO alerts ({cols}) VALUES ({vals}) RETURNING id", alert)
        return alert

    def list_organizations(self) -> list[dict]:
        return self._all("SELECT id, name, category, state, district, contact_email, contact_phone, "
                         "registration_no, verified FROM organizations ORDER BY name")

    # mesh
    def upsert_node(self, node_uuid: str, fields: dict) -> dict:
        from uuid import uuid4
        data = {k: v for k, v in fields.items() if v is not None}
        sets = "".join(f", {k} = EXCLUDED.{k}" for k in data)
        insert = dict(data, id=str(uuid4()), node_uuid=node_uuid)
        cols = ", ".join(insert)
        vals = ", ".join(f"%({k})s" for k in insert)
        return self._one(f"INSERT INTO mesh_nodes ({cols}) VALUES ({vals}) ON CONFLICT (node_uuid) DO UPDATE "
                         f"SET last_seen_at = now(){sets} RETURNING {_NODE_COLS}", insert)  # type: ignore

    def insert_mesh_event(self, event: dict) -> bool:
        data = dict(event, payload=self._json(event["payload"]))
        cols = ", ".join(data)
        vals = ", ".join(f"%({k})s" for k in data)
        row = self._one(f"INSERT INTO mesh_events ({cols}) VALUES ({vals}) "
                        "ON CONFLICT (event_id) DO NOTHING RETURNING id", data)
        return row is not None

    def get_mesh_event(self, event_id: str) -> Optional[dict]:
        return self._one(f"SELECT {_MESH_COLS} FROM mesh_events WHERE event_id = %s", (event_id,))

    def update_mesh_event(self, event_id: str, fields: dict) -> Optional[dict]:
        sets = ", ".join(f"{k} = %({k})s" for k in fields)
        data = dict(fields, _id=event_id)
        return self._one(f"UPDATE mesh_events SET {sets} WHERE event_id = %(_id)s RETURNING {_MESH_COLS}", data)

    def list_mesh_events(self, disaster_id: Optional[str] = None, priority: Optional[str] = None,
                         type_: Optional[str] = None, since: Optional[datetime] = None,
                         limit: int = 50) -> list[dict]:
        clauses, params = [], []
        for col, val in (("disaster_id", disaster_id), ("priority", priority), ("type", type_)):
            if val:
                clauses.append(f"{col} = %s")
                params.append(val)
        if since:
            clauses.append("observed_at >= %s")
            params.append(since)
        where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
        params.append(limit)
        return self._all(f"SELECT {_MESH_COLS} FROM mesh_events {where} ORDER BY observed_at DESC LIMIT %s",
                         tuple(params))

    def list_mesh_nodes(self) -> list[dict]:
        return self._all(f"SELECT {_NODE_COLS} FROM mesh_nodes ORDER BY last_seen_at DESC LIMIT 500")


    # cross-instance rate limits (sign-in attempts, registrations)
    def hit_rate(self, key: str, window_s: int, increment: bool = True) -> int:
        if not increment:
            row = self._one("SELECT hits FROM rate_limits WHERE key = %s AND window_start >= now() - make_interval(secs => %s)",
                            (key, window_s))
            return int(row["hits"]) if row else 0
        row = self._one(
            "INSERT INTO rate_limits (key, window_start, hits) VALUES (%(k)s, now(), 1) ON CONFLICT (key) DO UPDATE SET "
            "hits = CASE WHEN rate_limits.window_start < now() - make_interval(secs => %(w)s) THEN 1 ELSE rate_limits.hits + 1 END, "
            "window_start = CASE WHEN rate_limits.window_start < now() - make_interval(secs => %(w)s) THEN now() "
            "ELSE rate_limits.window_start END RETURNING hits", {"k": key, "w": window_s})
        return int(row["hits"]) if row else 0

    def prune_rate_limits(self) -> None:
        self._one("DELETE FROM rate_limits WHERE window_start < now() - interval '1 day' RETURNING 1")

    # quarantined nodes & data minimisation
    def list_blocked_nodes(self) -> list[dict]:
        return self._all("SELECT node_uuid, reason, blocked_by, created_at FROM blocked_nodes ORDER BY created_at DESC")

    def blocked_among(self, node_uuids: list[str]) -> set[str]:
        if not node_uuids:
            return set()
        return {r["node_uuid"] for r in self._all("SELECT node_uuid FROM blocked_nodes WHERE node_uuid = ANY(%s)",
                                                  (list(node_uuids),))}

    def block_node(self, node_uuid: str, reason: str, blocked_by: Optional[str]) -> dict:
        self._one("INSERT INTO blocked_nodes (node_uuid, reason, blocked_by) VALUES (%s, %s, %s) "
                  "ON CONFLICT (node_uuid) DO NOTHING RETURNING node_uuid", (node_uuid, reason, blocked_by))
        return self._one("SELECT node_uuid, reason, blocked_by, created_at FROM blocked_nodes WHERE node_uuid = %s",
                         (node_uuid,))  # type: ignore[return-value]

    def unblock_node(self, node_uuid: str) -> bool:
        return self._one("DELETE FROM blocked_nodes WHERE node_uuid = %s RETURNING node_uuid", (node_uuid,)) is not None

    def minimise_mesh_events(self, before: datetime) -> int:
        with self._conn() as conn:
            cur = conn.execute(
                "UPDATE mesh_events SET payload = jsonb_strip_nulls(jsonb_build_object('minimised', true, "
                "'count', payload->'count', 'needs', payload->'needs', 'count_band', payload->'count_band')), "
                "lat = round(lat::numeric, 2)::double precision, lng = round(lng::numeric, 2)::double precision "
                "WHERE observed_at < %s AND NOT (payload ? 'minimised') AND (disaster_id IS NULL OR disaster_id IN "
                "(SELECT id FROM disasters WHERE status = 'CLOSED'))", (before,))
            return cur.rowcount or 0

    # volunteers: profile & mission bookkeeping
    def get_volunteer(self, volunteer_id: str) -> Optional[dict]:
        return self._one(f"{_VOL_SELECT} WHERE vp.id = %s", (volunteer_id,))

    def set_volunteer_location(self, user_id: str, lat: float, lng: float, location_name: Optional[str]) -> None:
        self._one("UPDATE volunteer_profiles SET current_lat = %s, current_lng = %s, "
                  "location_name = COALESCE(%s, location_name), updated_at = now() WHERE user_id = %s RETURNING id",
                  (lat, lng, location_name, user_id))

    def record_mission_completion(self, user_id: str, hours: float) -> None:
        self._one("UPDATE volunteer_profiles SET missions_done = missions_done + 1, "
                  "total_hours = total_hours + %s, updated_at = now() WHERE user_id = %s RETURNING id", (hours, user_id))

    def release_stale_assignments(self, cutoff: datetime) -> list[dict]:
        return self._all(
            "WITH stale AS (SELECT id, assigned_to_id FROM tasks WHERE status = 'ASSIGNED' "
            "AND COALESCE(accepted_at, updated_at) < %s FOR UPDATE SKIP LOCKED) "
            "UPDATE tasks t SET status = 'OPEN', assigned_to_id = NULL, accepted_at = NULL, updated_at = now() "
            "FROM stale WHERE t.id = stale.id RETURNING t.id, t.code, stale.assigned_to_id AS released_from",
            (cutoff,))

    # reviews
    def upsert_review(self, review: dict) -> dict:
        return self._one(
            "INSERT INTO volunteer_reviews (id, volunteer_user_id, author_id, task_id, rating, comment, created_at, "
            "updated_at) VALUES (%(id)s, %(volunteer_user_id)s, %(author_id)s, %(task_id)s, %(rating)s, %(comment)s, "
            "now(), now()) ON CONFLICT (volunteer_user_id, author_id) DO UPDATE SET rating = EXCLUDED.rating, "
            "comment = EXCLUDED.comment, task_id = COALESCE(EXCLUDED.task_id, volunteer_reviews.task_id), "
            "updated_at = now() RETURNING id, volunteer_user_id, author_id, task_id, rating, comment, created_at, "
            "updated_at", review)  # type: ignore[return-value]

    def list_reviews(self, volunteer_user_id: str) -> list[dict]:
        return self._all(
            "SELECT r.id, r.volunteer_user_id, r.author_id, r.task_id, r.rating, r.comment, r.created_at, "
            "r.updated_at, u.name AS author_name, u.role::text AS author_role, t.code AS task_code "
            "FROM volunteer_reviews r JOIN users u ON u.id = r.author_id LEFT JOIN tasks t ON t.id = r.task_id "
            "WHERE r.volunteer_user_id = %s ORDER BY r.updated_at DESC LIMIT 100", (volunteer_user_id,))

    # audit trail
    def add_audit(self, row: dict) -> dict:
        from .audit import chain_hash
        with self._conn() as conn, conn.transaction():
            conn.execute("SELECT pg_advisory_xact_lock(727276)")  # one writer at a time keeps the hash chain linear
            prev_row = conn.execute("SELECT hash FROM audit_log ORDER BY id DESC LIMIT 1").fetchone()
            prev = (prev_row or {}).get("hash") or ""
            data = dict(row, detail=self._json(row.get("detail") or {}), prev_hash=prev, hash=chain_hash(prev, row))
            cols = ", ".join(data)
            vals = ", ".join(f"%({k})s" for k in data)
            return self._utc(conn.execute(f"INSERT INTO audit_log ({cols}) VALUES ({vals}) RETURNING id, at, hash",
                                          data).fetchone())  # type: ignore[return-value]

    def list_audit(self, limit: int = 200, action: Optional[str] = None, actor: Optional[str] = None) -> list[dict]:
        clauses, params = [], []
        if action:
            clauses.append("action LIKE %s")
            params.append(action.replace("%", "") + "%")
        if actor:
            clauses.append("(actor_email ILIKE %s OR actor_id = %s)")
            params += [f"%{actor.replace('%', '')}%", actor]
        where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
        params.append(limit)
        return self._all("SELECT id, at, actor_id, actor_email, actor_role, action, target_type, target_id, detail, "
                         f"ip, prev_hash, hash FROM audit_log {where} ORDER BY id DESC LIMIT %s", tuple(params))

    # transparency: raw rows for engines/transparency.py (no personal data)
    def transparency_rows(self) -> dict[str, list[dict]]:
        queries = {
            "disasters": "SELECT source, category, status, severity::text AS severity, created_at FROM disasters",
            "alerts": "SELECT level::text AS level, category, created_at FROM alerts",
            "mesh": "SELECT type::text AS type, priority::text AS priority, review_status::text AS review_status, "
                    "observed_at, received_at, CASE WHEN jsonb_typeof(payload->'count') = 'number' "
                    "THEN (payload->>'count')::numeric::int END AS count, origin_node_id "
                    "FROM mesh_events ORDER BY observed_at DESC LIMIT 50000",
            "nodes": "SELECT last_seen_at FROM mesh_nodes",
            "tasks": "SELECT status::text AS status, urgency::text AS urgency, required_skill, created_at, accepted_at, "
                     "started_at, completed_at, people_helped, assigned_to_id FROM tasks",
            "volunteers": "SELECT vp.availability, vp.skills, u.is_verified AS verified FROM volunteer_profiles vp "
                          "JOIN users u ON u.id = vp.user_id",
            "users": "SELECT role::text AS role, is_verified, created_at FROM users",
            "reviews": "SELECT rating FROM volunteer_reviews",
            "audit": "SELECT action, at FROM audit_log WHERE at > now() - interval '180 days'",
            "blocked": "SELECT created_at FROM blocked_nodes",
        }
        with self._conn() as conn:
            return {key: [self._utc(r) for r in conn.execute(sql).fetchall()] for key, sql in queries.items()}


# ─── Routing between stores ─────────────────────────────────────────────────

MEMORY = MemoryStore()
_RETRY_AFTER_S = 30.0
_state = {"down_until": 0.0, "last_error": ""}
_pg: Optional[PostgresStore] = None


def _postgres() -> Optional[PostgresStore]:
    global _pg
    url = get_settings().database_url
    if not url or time.monotonic() < _state["down_until"]:
        return None
    if _pg is None:
        store = PostgresStore(url)
        try:
            bootstrap(store)
            migrate(store)
        except Exception as exc:  # noqa: BLE001
            if not _is_db_error(exc):
                raise
            _mark_down(exc)
            return None
        _pg = store
    return _pg


def bootstrap(store: PostgresStore) -> bool:
    """First connection to an empty database: create the schema. No sample rows are inserted.

    Guarded by a transaction-scoped advisory lock so concurrent serverless instances don't race. Returns True if it
    initialised the database.
    """
    from ..data import seed as seeding

    with store._conn() as conn:
        if conn.execute("SELECT to_regclass('public.mesh_events') AS t").fetchone()["t"]:
            return False
        # One transaction with a transaction-scoped lock: safe behind Neon's PgBouncer pooling.
        with conn.transaction():
            conn.execute("SELECT pg_advisory_xact_lock(727274)")
            if conn.execute("SELECT to_regclass('public.mesh_events') AS t").fetchone()["t"]:
                return False
            conn.execute(seeding.SCHEMA_SQL.read_text())
            return True


def migrate(store: PostgresStore) -> list[str]:
    """Apply pending migrations once per database (cheap no-op check on every cold start)."""
    from ..data import migrations

    with store._conn() as conn:
        return migrations.apply(conn)


def _mark_down(exc: Exception) -> None:
    _state["down_until"] = time.monotonic() + _RETRY_AFTER_S
    _state["last_error"] = describe_error(exc)


def describe_error(exc: Exception) -> str:
    """Operator-safe summary of a connection failure: first line, credentials stripped."""
    import re
    text = str(exc).strip().splitlines()[0] if str(exc).strip() else ""
    text = re.sub(r"postgres(?:ql)?://\S+", "postgresql://…", text)
    text = re.sub(r"password=\S+", "password=…", text)
    text = re.sub(r'"[^"]*"', '"…"', text)  # host names and identifiers quoted by libpq (public endpoint)
    return f"{type(exc).__name__}: {text[:200]}" if text else type(exc).__name__


def last_error() -> str:
    return _state["last_error"]


def _is_db_error(exc: Exception) -> bool:
    try:
        import psycopg
    except ImportError:  # pragma: no cover
        return False
    # Any driver error (unreachable host, bad credentials, malformed URL, missing table) degrades
    # to the fallback dataset instead of failing the request.
    return isinstance(exc, psycopg.Error)


def fallback_label() -> str:
    return "fallback" if get_settings().database_url else "memory"


def read(op: Callable[[Any], T]) -> tuple[T, str]:
    """Run a read against PostgreSQL, degrading to the fallback dataset on failure."""
    pg = _postgres()
    if pg is not None:
        try:
            return op(pg), "database"
        except Exception as exc:  # noqa: BLE001
            if not _is_db_error(exc):
                raise
            _mark_down(exc)
    return op(MEMORY), fallback_label()


def write(op: Callable[[Any], T], durable: bool = False) -> tuple[T, str]:
    """Run a write. With durable=True, refuse to fall back when a database is configured."""
    pg = _postgres()
    configured = bool(get_settings().database_url)
    if pg is not None:
        try:
            return op(pg), "database"
        except Exception as exc:  # noqa: BLE001
            if not _is_db_error(exc):
                raise
            _mark_down(exc)
    if durable and configured:
        raise DurabilityUnavailable("database unreachable")
    return op(MEMORY), fallback_label()


def database_status() -> str:
    """ONLINE | DEGRADED (configured but unreachable) | FALLBACK (not configured)."""
    if not get_settings().database_url:
        return "FALLBACK"
    pg = _postgres()
    if pg is None:
        return "DEGRADED"
    try:
        pg.ping()
        return "ONLINE"
    except Exception as exc:  # noqa: BLE001
        _mark_down(exc)
        return "DEGRADED"


def node_is_active(last_seen: datetime) -> bool:
    if last_seen.tzinfo is None:
        last_seen = last_seen.replace(tzinfo=timezone.utc)
    return utcnow() - last_seen <= NODE_LIVENESS
