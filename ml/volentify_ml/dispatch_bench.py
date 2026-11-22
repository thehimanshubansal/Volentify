"""Dispatch benchmark: the live Sperling engine against exact optimisation and a manual-style baseline.

Runs inside the weekly ML workflow and writes frontend/api/_lib/models/dispatch_benchmark.json, which the API
serves and the website shows. Every figure quoted about dispatch performance should come from this file.

Scenarios are synthetic but shaped like a real muster: responders scattered around active incidents, generic
skills common and specialist skills rare, and more specialist demand than specialist supply.

Methods (all respect the same eligibility rule: specialist missions never go to untrained responders):
  sperling   the production engine, frontend/api/_lib/engines/dispatch.py (greedy, lexicographic by urgency)
  nearest    manual-style baseline: missions in arrival order, nearest eligible free responder
  optimum    exact maximum of total score C(i,j) (Hungarian algorithm), ignoring urgency order
  milp_lex   exact lexicographic optimum (HiGHS MILP): critical slots first, then high, …, then total score;
             solved with a time limit to measure whether exact optimisation is practical at crisis scale
"""

from __future__ import annotations

import argparse
import json
import math
import statistics
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "frontend"))
from api._lib.engines import dispatch as D  # noqa: E402  (the production engine, unmodified)

DEFAULT_OUT = ROOT / "frontend" / "api" / "_lib" / "models" / "dispatch_benchmark.json"
CENTRES = [(26.14, 91.74), (19.81, 85.83), (9.50, 76.34), (22.57, 88.36)]  # Guwahati, Puri, Kuttanad, Kolkata
SKILL_FREQ = {  # share of responders holding each skill (generic common, specialist rare)
    "Manual Packing": 0.35, "Food & Shelter Logistics": 0.25, "Transport & Driving": 0.20,
    "Rescue & Search": 0.12, "Medical & First Aid": 0.10, "Communications": 0.05, "Blood Donor": 0.06,
    "Boat Rescue": 0.04, "Paramedic": 0.03, "Chainsaw & Debris": 0.03, "Drone Operation": 0.02,
}
TASK_SKILLS = {  # required skill mix by urgency
    "CRITICAL": {"Rescue & Search": 0.35, "Boat Rescue": 0.25, "Paramedic": 0.25, "Medical & First Aid": 0.15},
    "HIGH": {"Medical & First Aid": 0.3, "Rescue & Search": 0.2, "Chainsaw & Debris": 0.15, "Blood Donor": 0.1,
             "Communications": 0.1, "Drone Operation": 0.05, "Transport & Driving": 0.1},
    "MODERATE": {"Food & Shelter Logistics": 0.45, "Transport & Driving": 0.3, "Communications": 0.1,
                 "Medical & First Aid": 0.15},
    "LOW": {"Manual Packing": 0.6, "Food & Shelter Logistics": 0.4},
}
URGENCY_MIX = {"CRITICAL": 0.15, "HIGH": 0.25, "MODERATE": 0.35, "LOW": 0.25}
SIZES = [(40, 18), (150, 66), (500, 220), (1000, 440)]  # (responders, missions): ~1.1 slots per responder
MILP_TIME_LIMIT_S = 10.0


def _pick(rng, dist: dict) -> str:
    keys = list(dist)
    p = np.array([dist[k] for k in keys], float)
    return keys[rng.choice(len(keys), p=p / p.sum())]


def scenario(n_vol: int, n_task: int, seed: int) -> tuple[list[dict], list[dict]]:
    rng = np.random.default_rng(seed)
    c = CENTRES[seed % len(CENTRES)]  # one incident area per scenario, as in a real muster
    vols = []
    for i in range(n_vol):
        skills = [s for s, f in SKILL_FREQ.items() if rng.random() < f] or [_pick(rng, SKILL_FREQ)]
        vols.append({"id": f"v{i}", "name": f"Responder {i}", "skills": skills, "availability": "AVAILABLE",
                     "lat": c[0] + rng.normal(0, 0.15), "lng": c[1] + rng.normal(0, 0.15),
                     "active_missions": int(rng.choice([0, 0, 0, 1, 2]))})
    tasks = []
    for j in range(n_task):
        urgency = _pick(rng, URGENCY_MIX)
        tasks.append({"id": f"t{j}", "code": f"T{j}", "title": f"Mission {j}", "status": "OPEN", "urgency": urgency,
                      "required_skill": _pick(rng, TASK_SKILLS[urgency]), "quantity_needed": int(rng.integers(1, 5)),
                      "lat": c[0] + rng.normal(0, 0.1), "lng": c[1] + rng.normal(0, 0.1),
                      "created_at": f"2026-01-01T00:{j // 60:02d}:{j % 60:02d}"})
    return vols, tasks


# ─── Shared evaluation ──────────────────────────────────────────────────────

def _slots(tasks):
    return [(t, s) for t in tasks for s in range(max(1, int(t["quantity_needed"])))]


def evaluate(tasks, vols, pairs) -> dict:
    """pairs: list of (task, volunteer). Scores use the production formula with initial workload."""
    pool = D.skill_pool(vols)
    requested = {u: 0 for u in D.URGENCY_WEIGHT}
    filled = {u: 0 for u in D.URGENCY_WEIGHT}
    for t, _ in _slots(tasks):
        requested[t["urgency"]] += 1
    total = dist = 0.0
    squander = rare_used = 0
    for t, v in pairs:
        c = D.score(t, v, pool, int(v.get("active_missions", 0)))
        filled[t["urgency"]] += 1
        total += c.score
        dist += c.distance_km
        if D.is_rare_specialist(v, pool):
            rare_used += 1
            squander += t["required_skill"] in D.GENERIC_SKILLS
    w = D.URGENCY_WEIGHT
    req_all = sum(requested.values())
    return {
        "completeness": sum(filled.values()) / req_all if req_all else 1.0,
        "critical_fill": filled["CRITICAL"] / requested["CRITICAL"] if requested["CRITICAL"] else 1.0,
        "high_fill": filled["HIGH"] / requested["HIGH"] if requested["HIGH"] else 1.0,
        "weighted_fill": sum(w[u] * filled[u] for u in w) / max(1e-9, sum(w[u] * requested[u] for u in w)),
        "total_score": total,
        "mean_distance_km": dist / len(pairs) if pairs else 0.0,
        "specialists_on_generic": squander / rare_used if rare_used else 0.0,
    }


# ─── Methods ────────────────────────────────────────────────────────────────

def run_sperling(tasks, vols):
    started = time.perf_counter()
    out = D.dispatch_batch(tasks, vols)
    ms = (time.perf_counter() - started) * 1000
    tby, vby = {t["id"]: t for t in tasks}, {v["id"]: v for v in vols}
    return [(tby[a["task_id"]], vby[a["volunteer_id"]]) for a in out["assignments"]], ms, False


def run_nearest(tasks, vols):
    started = time.perf_counter()
    free = {v["id"]: v for v in vols}
    pairs = []
    for t in sorted(tasks, key=lambda t: t["created_at"]):
        for _ in range(max(1, int(t["quantity_needed"]))):
            best, best_d = None, math.inf
            for v in free.values():
                if not D.eligible(t["required_skill"], D.similarity(t["required_skill"], v["skills"])):
                    continue
                d = D.haversine_km(t["lat"], t["lng"], v["lat"], v["lng"])
                if d < best_d:
                    best, best_d = v, d
            if best is None:
                break
            pairs.append((t, free.pop(best["id"])))
    return pairs, (time.perf_counter() - started) * 1000, False


def _matrix(tasks, vols):
    pool = D.skill_pool(vols)
    slots = _slots(tasks)
    S = np.zeros((len(slots), len(vols)))
    E = np.zeros_like(S, dtype=bool)
    for j, v in enumerate(vols):
        w = int(v.get("active_missions", 0))
        for i, (t, _) in enumerate(slots):
            c = D.score(t, v, pool, w)
            S[i, j], E[i, j] = c.score, D.eligible(t["required_skill"], c.sim)
    return slots, S, E


def run_optimum(tasks, vols, prepared=None):
    from scipy.optimize import linear_sum_assignment
    started = time.perf_counter()
    slots, S, E = prepared or _matrix(tasks, vols)
    W = np.where(E, S, -1e6)
    rows, cols = linear_sum_assignment(W, maximize=True)
    pairs = [(slots[i][0], vols[j]) for i, j in zip(rows, cols) if E[i, j]]
    return pairs, (time.perf_counter() - started) * 1000, False


def run_milp_lex(tasks, vols, prepared=None):
    from scipy.optimize import Bounds, LinearConstraint, milp
    from scipy.sparse import coo_matrix
    started = time.perf_counter()
    slots, S, E = prepared or _matrix(tasks, vols)
    ii, jj = np.nonzero(E)
    if len(ii) == 0:
        return [], (time.perf_counter() - started) * 1000, False
    # Lexicographic weights on scores normalised to [0, 1]: with base = slots + 1, one filled slot of a tier is
    # worth more than every slot of all lower tiers combined; the score only breaks ties within a tier pattern.
    n = len(slots)
    tier = np.array([D.URGENCY_RANK[slots[i][0]["urgency"]] for i in ii])
    weight = S[ii, jj] / max(S.max(), 1e-12) + np.power(n + 1.0, 3 - tier)
    m = len(ii)
    a_rows = np.concatenate([ii, n + jj])
    A = coo_matrix((np.ones(2 * m), (a_rows, np.concatenate([np.arange(m), np.arange(m)]))),
                   shape=(n + len(vols), m)).tocsr()
    res = milp(-weight, constraints=LinearConstraint(A, 0, 1), integrality=np.ones(m),
               bounds=Bounds(0, 1), options={"time_limit": MILP_TIME_LIMIT_S, "disp": False, "mip_rel_gap": 1e-9})
    ms = (time.perf_counter() - started) * 1000
    timed_out = res.status == 1 or res.x is None
    if res.x is None:
        return [], ms, True
    chosen = np.nonzero(res.x > 0.5)[0]
    return [(slots[ii[k]][0], vols[jj[k]]) for k in chosen], ms, timed_out


METHODS = {"sperling": run_sperling, "nearest": run_nearest, "optimum": run_optimum, "milp_lex": run_milp_lex}


def benchmark(sizes=SIZES, seeds=(1, 2, 3, 4, 5)) -> dict:
    results = []
    for n_vol, n_task in sizes:
        runs: dict[str, list[dict]] = {m: [] for m in METHODS}
        for seed in seeds:
            vols, tasks = scenario(n_vol, n_task, seed * 1000 + n_vol)
            t0 = time.perf_counter()
            prepared = _matrix(tasks, vols)
            build_ms = (time.perf_counter() - t0) * 1000
            for name, fn in METHODS.items():
                pairs, ms, timed_out = (fn(tasks, vols, prepared) if name in ("optimum", "milp_lex")
                                        else fn(tasks, vols))
                if name in ("optimum", "milp_lex"):
                    ms += build_ms  # exact methods must also score every pair first
                runs[name].append({**evaluate(tasks, vols, pairs), "latency_ms": ms, "timed_out": timed_out})
        opt_scores = [r["total_score"] for r in runs["optimum"]]
        row = {"responders": n_vol, "missions": n_task,
               "slots": int(statistics.mean(len(_slots(scenario(n_vol, n_task, s * 1000 + n_vol)[1]))
                                            for s in seeds)),
               "methods": {}}
        for name, rs in runs.items():
            # Quality is averaged over runs that returned an answer; a timed-out run has none to score.
            ok = [(r, o) for r, o in zip(rs, opt_scores) if not r["timed_out"]]
            mean = (lambda f: round(statistics.mean(f(r, o) for r, o in ok), 4) if ok else None)
            row["methods"][name] = {
                "latency_ms_median": round(statistics.median(r["latency_ms"] for r in rs), 2),
                "timeout_rate": round(sum(r["timed_out"] for r in rs) / len(rs), 3),
                "score_vs_optimum": mean(lambda r, o: r["total_score"] / o if o else 1.0),
                **{k: mean(lambda r, o, k=k: r[k]) for k in ("completeness", "critical_fill", "high_fill",
                                                            "weighted_fill", "mean_distance_km",
                                                            "specialists_on_generic")},
            }
        results.append(row)
        print(f"  {n_vol:>5} responders × {n_task:>4} missions: " + ", ".join(
            f"{m} {v['latency_ms_median']}ms crit {v['critical_fill']}" for m, v in row["methods"].items()))
    return {
        "name": "volentify-dispatch-benchmark",
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "engine": "frontend/api/_lib/engines/dispatch.py",
        "engine_constants": {"urgency_weight": D.URGENCY_WEIGHT, "similarity": {
            "exact": D.SIM_EXACT, "adjacent": D.SIM_ADJACENT, "generic": D.SIM_GENERIC},
            "squander_penalty": D.SQUANDER_PENALTY, "d0_km": D.D0_KM, "beta_fatigue": D.BETA_FATIGUE,
            "rare_pool_size": D.RARE_POOL_SIZE},
        "design": {"seeds_per_size": len(seeds), "milp_time_limit_s": MILP_TIME_LIMIT_S,
                   "scenario": "synthetic responders and missions around one Indian incident area per scenario (four areas rotate by seed); skill and urgency "
                               "mixes in dispatch_bench.py; specialist demand exceeds specialist supply",
                   "metrics": {
                       "critical_fill": "share of critical mission slots filled",
                       "weighted_fill": "filled slots weighted by urgency (10/5/2/1) over requested",
                       "score_vs_optimum": "total C(i,j) relative to the Hungarian maximum",
                       "specialists_on_generic": "share of rare specialists used who were sent to generic work",
                       "latency_ms_median": "wall-clock per cycle, single CPU core, Python; exact methods include "
                                            "building the score matrix"}},
        "results": results,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    parser.add_argument("--quick", action="store_true", help="two small sizes, two seeds (tests)")
    args = parser.parse_args()
    print("Dispatch benchmark")
    report = benchmark(SIZES[:2], (1, 2)) if args.quick else benchmark()
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(report, indent=2))
    print(f"Wrote {args.out}")


if __name__ == "__main__":
    main()
