"""Trained cyclone models (ml/ pipeline, IBTrACS North Indian Ocean).

Builds the feature vector defined in ml/volentify_ml/features.py from a single observation.
Returns None when the model files have not been trained/exported yet.
"""

from __future__ import annotations

import json
import math
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path
from typing import Any, Optional

from .treeinfer import Booster

MODEL_DIR = Path(__file__).resolve().parents[1] / "models"
KMH_PER_KT = 1.852


@lru_cache(maxsize=1)
def _models() -> Optional[tuple[Booster, Booster, dict]]:
    try:
        card = json.loads((MODEL_DIR / "model_card.json").read_text())
        return (Booster(MODEL_DIR / "cyclone_intensity_24h.json"), Booster(MODEL_DIR / "cyclone_severe_24h.json"), card)
    except (OSError, ValueError, KeyError):
        return None


@lru_cache(maxsize=1)
def dispatch_benchmark() -> Optional[dict]:
    """Measured dispatch performance written by ml/volentify_ml/dispatch_bench.py (weekly workflow)."""
    try:
        return json.loads((MODEL_DIR / "dispatch_benchmark.json").read_text())
    except (OSError, ValueError):
        return None


def model_card() -> Optional[dict]:
    loaded = _models()
    return loaded[2] if loaded else None


def vector(obs: dict[str, Any]) -> list[float]:
    nan = float("nan")
    when = obs.get("observed_at") or datetime.now(timezone.utc)
    direction = obs.get("storm_dir_deg")
    rad = math.radians(direction) if direction is not None else nan
    wind = obs["wind_kt"]

    def delta(key: str) -> float:
        past = obs.get(key)
        return wind - past if past is not None else nan

    return [
        wind, obs.get("pres_hpa") if obs.get("pres_hpa") is not None else nan, obs["lat"], obs["lng"],
        obs["dist2land_km"], obs.get("speed_kt") if obs.get("speed_kt") is not None else nan,
        math.sin(rad), math.cos(rad), math.sin(2 * math.pi * when.month / 12), math.cos(2 * math.pi * when.month / 12),
        delta("wind_kt_6h_ago"), delta("wind_kt_12h_ago"), delta("wind_kt_24h_ago"), 1.0 if obs["lng"] < 77.0 else 0.0,
    ]


def forecast(obs: dict[str, Any]) -> Optional[dict[str, Any]]:
    loaded = _models()
    if not loaded:
        return None
    intensity, severe, card = loaded
    x = vector(obs)
    delta = intensity.predict(x)
    wind_24h = max(0.0, obs["wind_kt"] + delta)
    return {"wind_24h_kt": round(wind_24h, 1), "wind_24h_kmh": round(wind_24h * KMH_PER_KT, 1),
            "severe_probability": round(severe.predict(x), 4), "model": f"{card['name']}@{card['version']}"}
