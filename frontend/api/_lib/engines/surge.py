"""Storm-surge height and composite hazard probability (PRD §4.3).

When the trained cyclone models are present (ml/ pipeline → api/_lib/models), the 24-hour intensity
forecast drives the surge estimate and the severe-storm probability feeds P(hazard). The surge
itself is a calibrated physical estimator (no open surge-observation dataset exists for India):

    ŷ_surge = (inverse-barometer + saturating wind set-up + rain + tide) · exp(−d_coast / 8 km)
    P(hazard) = σ(α1·x1 + α2·x2 + α3·ŷ_surge + β)
"""

from __future__ import annotations

import math
import time
from functools import lru_cache
from typing import Any

from . import cyclone
from .geo import haversine_km

KMH_PER_KT = 1.852
ALPHA_WIND, ALPHA_RAIN, ALPHA_SURGE, BETA = 4.2, 5.0, 1.1, -3.0
WIND_MAX_KMH, RAIN_MAX_MM = 250.0, 500.0
COAST_DECAY_KM = 8.0

# Coarse mainland coastline (west coast → Kanyakumari → east coast → Bay of Bengal head).
_COAST = [
    (23.0, 68.4), (22.3, 69.0), (21.6, 69.6), (20.9, 70.4), (20.7, 71.0), (21.77, 72.15), (21.1, 72.65),
    (20.4, 72.83), (18.95, 72.82), (18.6, 72.87), (17.0, 73.27), (16.05, 73.46), (15.5, 73.82), (14.8, 74.12),
    (13.98, 74.55), (13.34, 74.7), (12.87, 74.84), (12.5, 74.98), (11.87, 75.35), (11.25, 75.77), (9.96, 76.24),
    (9.49, 76.32), (8.88, 76.59), (8.48, 76.92), (8.08, 77.55), (8.79, 78.13), (9.28, 79.31), (10.77, 79.84),
    (11.93, 79.83), (13.08, 80.29), (13.4, 80.32), (14.45, 80.15), (15.6, 80.2), (16.17, 81.14), (16.94, 82.25),
    (17.69, 83.29), (18.33, 84.12), (19.26, 84.91), (19.8, 85.83), (20.26, 86.67), (20.8, 86.95), (21.45, 87.05),
    (21.62, 87.51), (21.65, 88.05), (21.8, 88.9), (22.0, 89.5), (22.5, 91.4), (21.4, 92.0), (20.7, 92.4),
]


@lru_cache(maxsize=1)
def _coast_points(step_km: float = 4.0) -> list[tuple[float, float]]:
    pts: list[tuple[float, float]] = []
    for (a_lat, a_lng), (b_lat, b_lng) in zip(_COAST, _COAST[1:]):
        n = max(1, int(haversine_km(a_lat, a_lng, b_lat, b_lng) / step_km))
        pts.extend((a_lat + (b_lat - a_lat) * i / n, a_lng + (b_lng - a_lng) * i / n) for i in range(n))
    pts.append(_COAST[-1])
    return pts


def is_offshore(lat: float, lng: float) -> bool:
    """Coarse sea/land test against the coastline: west coast faces west, east coast east, Bengal head south."""
    pts = _coast_points()
    i = min(range(len(pts)), key=lambda k: haversine_km(lat, lng, *pts[k]))
    c_lat, c_lng = pts[i]
    if c_lat >= 21.5 and c_lng >= 86.9:
        return lat < c_lat
    if c_lng < 77.6 and c_lat > 8.0:
        return lng < c_lng
    return lng > c_lng or lat < 8.0


def coast_distance_km(lat: float, lng: float) -> float:
    return min(haversine_km(lat, lng, p_lat, p_lng) for p_lat, p_lng in _coast_points())


def pressure_deficit_from_wind(wind_kmh: float) -> float:
    """Atkinson–Holliday wind–pressure relation, V(kt) = 6.7·ΔP^0.644."""
    knots = wind_kmh / 1.852
    return (knots / 6.7) ** (1 / 0.644) if knots > 0 else 0.0


def _sigmoid(z: float) -> float:
    return 1.0 / (1.0 + math.exp(-z))


def predict(req: dict[str, Any]) -> dict[str, Any]:
    started = time.perf_counter()
    wind, rain = float(req["wind_speed"]), float(req["rainfall_mm"])
    defaulted = 0

    if req.get("pressure_hpa") is not None:
        deficit = max(0.0, 1013.25 - float(req["pressure_hpa"]))
    else:
        deficit, defaulted = pressure_deficit_from_wind(wind), defaulted + 1
    if req.get("coast_distance_km") is not None:
        d_coast = float(req["coast_distance_km"])
    else:
        d_coast = coast_distance_km(req["lat"], req["lng"])
    if req.get("elevation_m") is not None:
        elevation = float(req["elevation_m"])
    else:
        elevation, defaulted = (2.0 if d_coast < 3 else 10.0), defaulted + 1
    tide = float(req["tidal_phase"]) if req.get("tidal_phase") is not None else 0.0

    features = {
        "x1_wind_norm": round(min(1.5, wind / WIND_MAX_KMH), 4),
        "x2_rain_norm": round(min(1.5, rain / RAIN_MAX_MM), 4),
        "x3_pressure_deficit_hpa": round(deficit, 2),
        "x4_lat": req["lat"], "x5_lng": req["lng"],
        "x6_coast_distance_km": round(d_coast, 2),
        "x7_elevation_m": round(elevation, 2),
        "x8_tidal_phase": tide,
    }

    model_name = "volentify-surge-analytic-v1"
    peak_wind = wind
    trained = cyclone.forecast({
        "wind_kt": wind / KMH_PER_KT, "pres_hpa": req.get("pressure_hpa"), "lat": req["lat"], "lng": req["lng"],
        "dist2land_km": d_coast if is_offshore(req["lat"], req["lng"]) else 0.0,
        "speed_kt": req["storm_speed_kmh"] / KMH_PER_KT if req.get("storm_speed_kmh") is not None else None,
        "storm_dir_deg": req.get("storm_dir_deg"),
        "wind_kt_24h_ago": req["wind_speed_24h_ago"] / KMH_PER_KT if req.get("wind_speed_24h_ago") is not None else None,
    })
    if trained:
        peak_wind = max(wind, trained["wind_24h_kmh"])
        model_name = f"{trained['model']} + surge-analytic-v1"
    at_coast = (deficit / 100.0 + 6.5 * (1 - math.exp(-((peak_wind / 150.0) ** 2)))
                + min(0.6, 0.002 * rain) + 0.4 * tide)
    surge = max(0.0, at_coast) * math.exp(-d_coast / COAST_DECAY_KM)

    if trained:
        # Trained probability of a severe cyclonic storm, combined with the rainfall and surge terms.
        p_rain_surge = _sigmoid(ALPHA_RAIN * features["x2_rain_norm"] + ALPHA_SURGE * surge + BETA)
        p = 1 - (1 - trained["severe_probability"]) * (1 - p_rain_surge)
    else:
        p = _sigmoid(ALPHA_WIND * features["x1_wind_norm"] + ALPHA_RAIN * features["x2_rain_norm"]
                     + ALPHA_SURGE * surge + BETA)
    risk = "CRITICAL" if p > 0.80 or surge > 3.0 else "HIGH" if p >= 0.50 else "MODERATE"
    confidence = max(0.5, min(0.97, 0.62 + 0.33 * abs(2 * p - 1) - 0.04 * defaulted))
    return {
        "hazard_probability": round(p, 3),
        "risk_level": risk,
        "predicted_surge_m": round(surge, 2),
        "confidence_score": round(confidence, 3),
        "model": model_name,
        "latency_ms": round((time.perf_counter() - started) * 1000, 3),
        "features": features,
        "wind_24h_kmh": trained["wind_24h_kmh"] if trained else None,
        "severe_probability": trained["severe_probability"] if trained else None,
    }
