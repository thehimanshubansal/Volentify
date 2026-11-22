"""IBTrACS North Indian Ocean best tracks (NOAA NCEI, v04r01).

Wind is taken from RSMC New Delhi (IMD) where present — the agency of record for the basin —
then WMO, then JTWC (USA). All winds are 1-minute/3-minute sustained knots as reported.
"""

from __future__ import annotations

import io
import urllib.request
from pathlib import Path

import numpy as np
import pandas as pd

IBTRACS_NI_URL = ("https://www.ncei.noaa.gov/data/international-best-track-archive-for-climate-stewardship-ibtracs/"
                  "v04r01/access/csv/ibtracs.NI.list.v04r01.csv")
COLUMNS = ["SID", "ISO_TIME", "LAT", "LON", "WMO_WIND", "WMO_PRES", "USA_WIND", "NEWDELHI_WIND", "NEWDELHI_PRES",
           "DIST2LAND", "STORM_SPEED", "STORM_DIR"]


def download(dest: Path, url: str = IBTRACS_NI_URL) -> Path:
    dest.parent.mkdir(parents=True, exist_ok=True)
    with urllib.request.urlopen(url, timeout=120) as resp:  # noqa: S310 — fixed public NOAA URL
        dest.write_bytes(resp.read())
    return dest


def _num(s: pd.Series) -> pd.Series:
    return pd.to_numeric(s.astype(str).str.strip().replace({"": np.nan}), errors="coerce")


def load(path: Path | str, since: int = 1980) -> pd.DataFrame:
    """Load raw IBTrACS CSV (or the compact sample) into a clean 6-hourly track table."""
    raw = Path(path).read_bytes()
    text = raw.decode("utf-8", errors="replace")
    lines = text.splitlines()
    # Full IBTrACS files carry a units row under the header; drop it.
    if len(lines) > 1 and lines[1].lstrip().startswith(","):
        lines.pop(1)
    df = pd.read_csv(io.StringIO("\n".join(lines)), usecols=lambda c: c.strip() in COLUMNS, dtype=str,
                     keep_default_na=False)
    df.columns = [c.strip() for c in df.columns]
    out = pd.DataFrame({
        "sid": df["SID"].str.strip(),
        "time": pd.to_datetime(df["ISO_TIME"].str.strip(), errors="coerce"),
        "lat": _num(df["LAT"]),
        "lon": _num(df["LON"]),
        "dist2land": _num(df["DIST2LAND"]),
        "speed": _num(df["STORM_SPEED"]),
        "dir": _num(df["STORM_DIR"]),
    })
    out["wind"] = _num(df["NEWDELHI_WIND"]).fillna(_num(df["WMO_WIND"])).fillna(_num(df["USA_WIND"]))
    out["pres"] = _num(df["NEWDELHI_PRES"]).fillna(_num(df["WMO_PRES"]))
    out = out.dropna(subset=["time", "lat", "lon", "wind"])
    out = out[out["time"].dt.year >= since]
    out = out[out["time"].dt.hour.isin([0, 6, 12, 18]) & (out["time"].dt.minute == 0)]
    return out.sort_values(["sid", "time"]).drop_duplicates(["sid", "time"]).reset_index(drop=True)
