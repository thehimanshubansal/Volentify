"""Feature engineering shared — by contract — with the API's inference code.

The order of FEATURES is the model input order. api/_lib/engines/cyclone.py builds the same
vector from a single observation (history features may be missing; the models are trained with
history randomly masked so they degrade gracefully).
"""

from __future__ import annotations

import numpy as np
import pandas as pd

FEATURES = [
    "wind_kt", "pres_hpa", "lat", "lon", "dist2land_km", "speed_kt", "dir_sin", "dir_cos",
    "month_sin", "month_cos", "dwind_6h", "dwind_12h", "dwind_24h", "arabian_sea",
]
HISTORY = ["dwind_6h", "dwind_12h", "dwind_24h"]
SEVERE_KT = 48       # IMD Severe Cyclonic Storm threshold
RAPID_KT = 30        # rapid intensification over 24 h
HORIZON_H = 24


def build(tracks: pd.DataFrame) -> pd.DataFrame:
    """One row per synoptic fix with features and 24-hour-ahead targets."""
    rows = []
    for sid, g in tracks.groupby("sid", sort=False):
        g = g.set_index("time").sort_index()
        wind = g["wind"]
        lagged = {h: wind.reindex(g.index - pd.Timedelta(hours=h)).to_numpy() for h in (6, 12, 24)}
        ahead = wind.reindex(g.index + pd.Timedelta(hours=HORIZON_H)).to_numpy()
        future_max = np.array([
            wind[(wind.index > t) & (wind.index <= t + pd.Timedelta(hours=HORIZON_H))].max() for t in g.index])
        rad = np.deg2rad(g["dir"].to_numpy(dtype=float))
        month = g.index.month.to_numpy()
        frame = pd.DataFrame({
            "sid": sid, "time": g.index,
            "wind_kt": wind.to_numpy(), "pres_hpa": g["pres"].to_numpy(),
            "lat": g["lat"].to_numpy(), "lon": g["lon"].to_numpy(),
            "dist2land_km": g["dist2land"].to_numpy(), "speed_kt": g["speed"].to_numpy(),
            "dir_sin": np.sin(rad), "dir_cos": np.cos(rad),
            "month_sin": np.sin(2 * np.pi * month / 12), "month_cos": np.cos(2 * np.pi * month / 12),
            "dwind_6h": wind.to_numpy() - lagged[6], "dwind_12h": wind.to_numpy() - lagged[12],
            "dwind_24h": wind.to_numpy() - lagged[24],
            "arabian_sea": (g["lon"].to_numpy() < 77.0).astype(float),
            "wind_24h": ahead, "future_max_24h": future_max,
        })
        rows.append(frame)
    df = pd.concat(rows, ignore_index=True) if rows else pd.DataFrame(columns=FEATURES)
    df["severe_24h"] = (df["future_max_24h"] >= SEVERE_KT).astype(float)
    df.loc[df["future_max_24h"].isna(), "severe_24h"] = np.nan
    df["delta_24h"] = df["wind_24h"] - df["wind_kt"]
    df["rapid_24h"] = (df["delta_24h"] >= RAPID_KT).astype(float)
    df.loc[df["wind_24h"].isna(), "rapid_24h"] = np.nan
    return df


def mask_history(df: pd.DataFrame, fraction: float = 0.5, seed: int = 7) -> pd.DataFrame:
    """Duplicate rows with storm history hidden, as at inference time from a single report."""
    rng = np.random.default_rng(seed)
    masked = df.sample(frac=fraction, random_state=int(rng.integers(1e9))).copy()
    masked[HISTORY] = np.nan
    pres_drop = masked.sample(frac=0.5, random_state=int(rng.integers(1e9))).index
    masked.loc[pres_drop, "pres_hpa"] = np.nan
    return pd.concat([df, masked], ignore_index=True)
