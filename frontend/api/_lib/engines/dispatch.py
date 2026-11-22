"""Priority-Driven Heuristic Dispatch Engine (Sperling, 2026) — PRD §4.6 and §5.

Greedy lexicographic allocation in O(T log T + T·V):

    C(i,j) = W_urgency(T_i) · S_k · Sim(v_j, T_i) · Π_squander
             × 1 / (1 + d(v_j, T_i) / d0)
             × 1 / (1 + β · H_work(v_j))
"""

from __future__ import annotations

import math
import time
from collections import Counter
from dataclasses import dataclass

from .geo import haversine_km

URGENCY_WEIGHT = {"CRITICAL": 10.0, "HIGH": 5.0, "MODERATE": 2.0, "LOW": 1.0}
URGENCY_RANK = {"CRITICAL": 0, "HIGH": 1, "MODERATE": 2, "LOW": 3}
SIM_EXACT, SIM_ADJACENT, SIM_GENERIC = 1.0, 0.55, 0.10
SQUANDER_PENALTY = 0.12
D0_KM = 15.0
BETA_FATIGUE = 0.15
RARE_POOL_SIZE = 3  # a specialist skill held by ≤ 3 available responders counts as rare

GENERIC_SKILLS = {"Manual Packing", "Food & Shelter Logistics", "Transport & Driving"}

SKILL_ADJACENCY: dict[str, set[str]] = {
    "Paramedic": {"Medical & First Aid"},
    "Medical & First Aid": {"Paramedic"},
    "Blood Donor": set(),
    "Rescue & Search": {"Boat Rescue", "Chainsaw & Debris"},
    "Boat Rescue": {"Rescue & Search"},
    "Chainsaw & Debris": {"Rescue & Search"},
    "Drone Operation": {"Communications"},
    "Communications": {"Drone Operation"},
    "Food & Shelter Logistics": {"Manual Packing", "Transport & Driving"},
    "Manual Packing": {"Food & Shelter Logistics"},
    "Transport & Driving": {"Food & Shelter Logistics"},
}


@dataclass
class Candidate:
    volunteer: dict
    score: float
    distance_km: float
    sim: float
    squander: bool

    @property
    def tier(self) -> str:
        return "EXACT" if self.sim == SIM_EXACT else "ADJACENT" if self.sim == SIM_ADJACENT else "GENERIC"


def skill_pool(volunteers: list[dict]) -> Counter:
    pool: Counter = Counter()
    for v in volunteers:
        for skill in set(v["skills"]):
            pool[skill] += 1
    return pool


def scarcity_index(pool: Counter, skill: str) -> float:
    return 1.0 / math.sqrt(max(1, pool.get(skill, 0)))


def similarity(required: str, skills: list[str]) -> float:
    if required in skills:
        return SIM_EXACT
    if SKILL_ADJACENCY.get(required, set()) & set(skills):
        return SIM_ADJACENT
    return SIM_GENERIC


def is_rare_specialist(volunteer: dict, pool: Counter) -> bool:
    return any(s not in GENERIC_SKILLS and pool.get(s, 0) <= RARE_POOL_SIZE for s in volunteer["skills"])


def eligible(required: str, sim: float) -> bool:
    """Specialist missions never fall back to untrained responders."""
    return sim >= SIM_ADJACENT or required in GENERIC_SKILLS


def score(task: dict, volunteer: dict, pool: Counter, workload: int) -> Candidate:
    required = task["required_skill"]
    sim = similarity(required, volunteer["skills"])
    # PRD §4.6: a rare specialist is protected from generic work even if they also hold the generic skill.
    squander = required in GENERIC_SKILLS and is_rare_specialist(volunteer, pool)
    distance = haversine_km(task["lat"], task["lng"], volunteer["lat"], volunteer["lng"])
    value = (URGENCY_WEIGHT[task["urgency"]] * scarcity_index(pool, required) * sim
             * (SQUANDER_PENALTY if squander else 1.0)
             * (1.0 / (1.0 + distance / D0_KM))
             * (1.0 / (1.0 + BETA_FATIGUE * workload)))
    return Candidate(volunteer, value, distance, sim, squander)


def _reason(task: dict, c: Candidate) -> str:
    parts = [f"{task['urgency'].title()} urgency", f"{c.tier.lower()} skill match", f"{c.distance_km:.1f} km away"]
    if c.squander:
        parts.append("specialist protected (×0.12)")
    if c.volunteer.get("active_missions"):
        parts.append(f"{c.volunteer['active_missions']} active mission(s)")
    return " · ".join(parts)


def rank_volunteers(task: dict, volunteers: list[dict]) -> list[dict]:
    """POST /api/match — score one task against the available pool."""
    available = [v for v in volunteers if v["availability"] == "AVAILABLE"]
    pool = skill_pool(available)
    ranked = []
    for v in available:
        c = score(task, v, pool, int(v.get("active_missions", 0)))
        if not eligible(task["required_skill"], c.sim):
            continue
        ranked.append({
            "volunteer_id": v["id"], "name": v["name"], "score": round(c.score, 4),
            "distance_km": round(c.distance_km, 2), "skill_match": c.sim,
            "scarcity": round(scarcity_index(pool, task["required_skill"]), 3),
            "squander_penalised": c.squander, "reason": _reason(task, c),
        })
    return sorted(ranked, key=lambda r: r["score"], reverse=True)


def dispatch_batch(tasks: list[dict], volunteers: list[dict], max_per_volunteer: int = 1) -> dict:
    """POST /api/match/dispatch-batch — one full rolling-horizon cycle."""
    started = time.perf_counter()
    open_tasks = sorted((t for t in tasks if t["status"] == "OPEN"),
                        key=lambda t: (URGENCY_RANK[t["urgency"]], str(t.get("created_at", ""))))
    available = [v for v in volunteers if v["availability"] == "AVAILABLE"]
    pool = skill_pool(available)
    workload = {v["id"]: int(v.get("active_missions", 0)) for v in available}
    assigned_count: Counter = Counter()

    assignments, bottlenecks = [], []
    tiers: Counter = Counter()
    requested = filled = 0

    for task in open_tasks:
        slots = max(1, int(task.get("quantity_needed", 1)))
        requested += slots
        got = 0
        for slot in range(1, slots + 1):
            best: Candidate | None = None
            for v in available:
                if assigned_count[v["id"]] >= max_per_volunteer:
                    continue
                c = score(task, v, pool, workload[v["id"]])
                if eligible(task["required_skill"], c.sim) and (best is None or c.score > best.score):
                    best = c
            if best is None:
                break
            vid = best.volunteer["id"]
            assigned_count[vid] += 1
            workload[vid] += 1
            tiers[best.tier] += 1
            got += 1
            assignments.append({
                "task_id": task["id"], "task_code": task["code"], "task_title": task["title"],
                "urgency": task["urgency"], "slot": slot, "volunteer_id": vid,
                "volunteer_name": best.volunteer["name"], "score": round(best.score, 4),
                "distance_km": round(best.distance_km, 2), "tier": best.tier, "reason": _reason(task, best),
            })
        filled += got
        if got < slots:
            bottlenecks.append({"task_id": task["id"], "task_code": task["code"], "skill": task["required_skill"],
                                "requested": slots, "filled": got, "deficit": slots - got})

    return {
        "assignments": assignments,
        "bottlenecks": bottlenecks,
        "scarcity": {skill: round(scarcity_index(pool, skill), 3)
                     for skill in sorted({t["required_skill"] for t in open_tasks})},
        "tiers": {"EXACT": tiers["EXACT"], "ADJACENT": tiers["ADJACENT"], "GENERIC": tiers["GENERIC"]},
        "completeness": round(filled / requested, 4) if requested else 1.0,
        "latency_ms": round((time.perf_counter() - started) * 1000, 3),
        "tasks_evaluated": len(open_tasks),
        "volunteers_evaluated": len(available),
    }
