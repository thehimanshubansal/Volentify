"""Shared geodesy helpers."""

from __future__ import annotations

import math

EARTH_RADIUS_KM = 6371.0


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Great-circle distance in kilometres."""
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (math.sin(dlat / 2) ** 2
         + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2)
    return 2 * EARTH_RADIUS_KM * math.asin(math.sqrt(a))


def bbox_around(lat: float, lng: float, radius_km: float) -> tuple[float, float, float, float]:
    """(min_lng, min_lat, max_lng, max_lat) square that contains a circle of radius_km."""
    dlat = radius_km / 111.32
    dlng = radius_km / (111.32 * max(0.01, math.cos(math.radians(lat))))
    return (round(lng - dlng, 5), round(lat - dlat, 5), round(lng + dlng, 5), round(lat + dlat, 5))
