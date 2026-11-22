"""Public accountability figures for /transparency and /analytics, computed from the platform's own records.

Everything here is an aggregate: counts, medians and monthly totals. No names, contact details, report text or
exact locations leave this module. "People helped" comes from responders closing missions; "rescues reported" from
PERSON_RESCUED mesh reports, which are unverified field observations and are labelled as such.
"""

from __future__ import annotations

from collections import Counter
from datetime import datetime, timedelta, timezone
from statistics import median
from typing import Any, Iterable, Optional

from .rules import MISSION_START_MINUTES, RETENTION_DAYS

NODE_LIVENESS = timedelta(minutes=30)


def _aware(value: Any) -> Optional[datetime]:
    if not isinstance(value, datetime):
        return None
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


def _median_minutes(pairs: Iterable[tuple[Any, Any]]) -> Optional[float]:
    spans = []
    for start, end in pairs:
        a, b = _aware(start), _aware(end)
        if a and b and b >= a:
            spans.append((b - a).total_seconds() / 60)
    return round(median(spans), 1) if spans else None


def _months(now: datetime, n: int = 12) -> list[str]:
    out, y, m = [], now.year, now.month
    for _ in range(n):
        out.append(f"{y:04d}-{m:02d}")
        y, m = (y - 1, 12) if m == 1 else (y, m - 1)
    return list(reversed(out))


def _monthly(rows: Iterable[Any], months: list[str]) -> list[int]:
    counts = Counter(f"{d.year:04d}-{d.month:02d}" for d in (_aware(r) for r in rows) if d)
    return [counts.get(m, 0) for m in months]


def build(raw: dict[str, list[dict]], now: Optional[datetime] = None) -> dict[str, Any]:
    now = now or datetime.now(timezone.utc)
    months = _months(now)
    disasters, alerts, mesh, tasks = raw["disasters"], raw["alerts"], raw["mesh"], raw["tasks"]
    volunteers, users = raw["volunteers"], raw["users"]

    reports = [e for e in mesh if not (e["type"] == "DISASTER_STATUS")]
    review = Counter(e["review_status"] for e in mesh)
    statuses = Counter(t["status"] for t in tasks)
    completed = [t for t in tasks if t["status"] == "COMPLETED"]
    hours = sum(((_aware(t["completed_at"]) - _aware(t["started_at"])).total_seconds() / 3600)  # type: ignore[operator]
                for t in completed if _aware(t.get("started_at")) and _aware(t.get("completed_at"))
                and _aware(t["completed_at"]) >= _aware(t["started_at"]))  # type: ignore[operator]
    people_count = lambda kind: sum(e["count"] or 0 for e in mesh if e["type"] == kind)  # noqa: E731
    relay_delays = [((_aware(e["received_at"]) - _aware(e["observed_at"])).total_seconds() / 60)  # type: ignore[operator]
                    for e in mesh if _aware(e.get("received_at")) and _aware(e.get("observed_at"))
                    and _aware(e["received_at"]) >= _aware(e["observed_at"])]  # type: ignore[operator]
    ratings = [r["rating"] for r in raw["reviews"] if r.get("rating")]
    since_30 = now - timedelta(days=30)
    responders = {t["assigned_to_id"] for t in tasks if t.get("assigned_to_id") and t["status"] in
                  {"ASSIGNED", "IN_PROGRESS", "COMPLETED"}}

    return {
        "generated_at": now.isoformat(),
        "months": months,
        "incidents": {
            "total": len(disasters),
            "active": sum(1 for d in disasters if d.get("status") == "ACTIVE"),
            "closed": sum(1 for d in disasters if d.get("status") == "CLOSED"),
            "by_source": dict(Counter(d.get("source") or "Volentify" for d in disasters)),
            "by_category": dict(Counter(d.get("category") or "Other" for d in disasters)),
            "by_severity": dict(Counter(d.get("severity") or "LOW" for d in disasters)),
            "monthly": _monthly((d["created_at"] for d in disasters), months),
        },
        "alerts": {
            "broadcasts": len(alerts),
            "last_30_days": sum(1 for a in alerts if (_aware(a.get("created_at")) or now) >= since_30),
            "by_level": dict(Counter(a.get("level") for a in alerts)),
        },
        "mesh": {
            "events": len(mesh), "reports": len(reports), "messages": len(mesh) - len(reports),
            "unreviewed": review.get("UNREVIEWED", 0), "reviewed": review.get("REVIEWED", 0),
            "promoted": review.get("PROMOTED", 0), "rejected": review.get("REJECTED", 0),
            "by_type": dict(Counter(e["type"] for e in mesh)),
            "by_priority": dict(Counter(e["priority"] for e in mesh)),
            "nodes": len(raw["nodes"]),
            "nodes_active": sum(1 for n in raw["nodes"] if (_aware(n.get("last_seen_at")) or now - NODE_LIVENESS * 2)
                                >= now - NODE_LIVENESS),
            "phones_reporting": len({e["origin_node_id"] for e in mesh}),
            "median_relay_minutes": round(median(relay_delays), 1) if relay_delays else None,
            "blocked_nodes": len(raw["blocked"]),
            "monthly": _monthly((e["observed_at"] for e in mesh), months),
        },
        "missions": {
            "total": len(tasks), "open": statuses.get("OPEN", 0), "assigned": statuses.get("ASSIGNED", 0),
            "in_progress": statuses.get("IN_PROGRESS", 0), "completed": statuses.get("COMPLETED", 0),
            "cancelled": statuses.get("CANCELLED", 0),
            "dispatched": sum(1 for t in tasks if t.get("accepted_at") or t["status"] in {"ASSIGNED", "IN_PROGRESS",
                                                                                          "COMPLETED"}),
            "people_helped": sum(int(t.get("people_helped") or 0) for t in completed),
            "volunteer_hours": round(hours, 1),
            "responders_engaged": len(responders),
            "median_minutes_to_accept": _median_minutes((t["created_at"], t.get("accepted_at")) for t in tasks),
            "median_minutes_to_start": _median_minutes((t.get("accepted_at"), t.get("started_at")) for t in tasks),
            "median_minutes_to_complete": _median_minutes((t.get("started_at"), t.get("completed_at")) for t in tasks),
            "by_skill": dict(Counter(t.get("required_skill") for t in tasks)),
            "by_urgency": dict(Counter(t.get("urgency") for t in tasks)),
            "completed_monthly": _monthly((t.get("completed_at") for t in completed), months),
            "created_monthly": _monthly((t.get("created_at") for t in tasks), months),
        },
        "people": {
            "helped_by_missions": sum(int(t.get("people_helped") or 0) for t in completed),
            "rescues_reported": people_count("PERSON_RESCUED"),
            "trapped_reported": people_count("PERSON_TRAPPED"),
            "missing_reported": people_count("PERSON_MISSING"),
        },
        "volunteers": {
            "registered": len(volunteers),
            "verified": sum(1 for v in volunteers if v.get("verified")),
            "available": sum(1 for v in volunteers if v.get("availability") == "AVAILABLE"),
            "busy": sum(1 for v in volunteers if v.get("availability") == "BUSY"),
            "off_duty": sum(1 for v in volunteers if v.get("availability") == "OFFLINE"),
            "skills": dict(Counter(s for v in volunteers for s in (v.get("skills") or []))),
            "reviews": len(ratings), "average_rating": round(sum(ratings) / len(ratings), 2) if ratings else None,
        },
        "accounts": {
            "total": len(users), "by_role": dict(Counter(u.get("role") for u in users)),
            "verified_elevated": sum(1 for u in users if u.get("role") in {"INCIDENT_ADMIN", "NGO_MEMBER"}
                                     and u.get("is_verified")),
        },
        "governance": {
            "audit_entries_180d": len(raw["audit"]),
            "audit_by_action": dict(Counter(a["action"].split(".")[0] for a in raw["audit"])),
            "report_retention_days": RETENTION_DAYS,
            "audit_retention_days": 180,
            "mission_start_limit_minutes": MISSION_START_MINUTES,
        },
    }
