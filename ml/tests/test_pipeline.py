"""Pipeline tests on a 3-storm IBTrACS sample (Mocha, Tej, Michaung — 2023). Run: python -m pytest tests -q"""

import json
import math
import sys
from pathlib import Path

import numpy as np
import pytest
import xgboost as xgb

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT.parent / "frontend"))

from volentify_ml import data, features, train  # noqa: E402
from api._lib.engines import cyclone  # noqa: E402
from api._lib.engines.treeinfer import Booster  # noqa: E402

SAMPLE = Path(__file__).parent / "ibtracs_ni_2023_sample.csv"


@pytest.fixture(scope="module")
def table():
    return features.build(data.load(SAMPLE))


def test_load_prefers_imd_wind_and_synoptic_hours():
    t = data.load(SAMPLE)
    assert t["sid"].nunique() == 3 and set(t["time"].dt.hour) <= {0, 6, 12, 18}
    mocha_peak = t[t["sid"] == "2023129N08091"]["wind"].max()
    assert mocha_peak == 115  # RSMC New Delhi value, not JTWC's 145


def test_targets_look_ahead_24h(table):
    row = table[(table["sid"] == "2023129N08091") & (table["time"] == "2023-05-12T00")].iloc[0]
    assert row["wind_kt"] == 65 and row["wind_24h"] == 100 and row["rapid_24h"] == 1.0
    assert row["dwind_24h"] == 65 - 35


def test_history_masking_duplicates_rows(table):
    masked = features.mask_history(table, fraction=0.5)
    assert len(masked) > len(table) and masked[features.HISTORY].isna().any().all()


def test_train_export_and_pure_python_inference_match(table, tmp_path):
    metrics = train.evaluate(table, folds=3)
    assert metrics["intensity_24h"]["n"] > 0 and 0 <= metrics["severe_24h"]["base_rate"] <= 1
    card = train.fit_and_export(table, tmp_path, metrics, data.load(SAMPLE))
    assert card["features"] == features.FEATURES
    x = table[features.FEATURES].to_numpy(dtype=float)
    x[::3, 10:13] = np.nan  # missing history
    for name in ("cyclone_intensity_24h.json", "cyclone_severe_24h.json"):
        ref = xgb.Booster()
        ref.load_model(str(tmp_path / name))
        expected = ref.predict(xgb.DMatrix(x, missing=np.nan, feature_names=features.FEATURES))
        ours = Booster(tmp_path / name)
        got = [ours.predict([None if math.isnan(v) else float(v) for v in row]) for row in x]
        assert np.allclose(got, expected, atol=1e-4), name


def test_api_forecast_uses_exported_models(table, tmp_path, monkeypatch):
    train.fit_and_export(table, tmp_path, train.evaluate(table, folds=3), data.load(SAMPLE))
    monkeypatch.setattr(cyclone, "MODEL_DIR", tmp_path)
    cyclone._models.cache_clear()
    out = cyclone.forecast({"wind_kt": 60, "lat": 15.0, "lng": 88.0, "dist2land_km": 500, "pres_hpa": 985})
    assert out and 0 <= out["severe_probability"] <= 1 and out["wind_24h_kt"] >= 0
    assert json.loads((tmp_path / "model_card.json").read_text())["data"]["storms"] == 3
    cyclone._models.cache_clear()


def test_dispatch_benchmark_quick():
    """Sperling must never fill fewer critical slots than the nearest-responder baseline, and the
    exact priority MILP is an upper bound on critical coverage."""
    from volentify_ml import dispatch_bench as B
    report = B.benchmark(sizes=[(40, 18)], seeds=(1, 2))
    m = report["results"][0]["methods"]
    assert set(m) == {"sperling", "nearest", "optimum", "milp_lex"}
    assert m["optimum"]["score_vs_optimum"] == 1.0
    assert m["sperling"]["critical_fill"] >= m["nearest"]["critical_fill"]
    assert m["milp_lex"]["critical_fill"] >= m["sperling"]["critical_fill"] - 1e-9
    assert m["sperling"]["specialists_on_generic"] <= m["nearest"]["specialists_on_generic"]
