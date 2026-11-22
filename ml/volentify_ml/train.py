"""Train and evaluate the cyclone models, then export them for the API.

    python -m volentify_ml.train --data data/ibtracs.NI.list.v04r01.csv --out ../frontend/api/_lib/models

Evaluation is storm-grouped 5-fold cross-validation: a storm's fixes never appear in both train
and test, so scores reflect performance on unseen cyclones. Baselines: persistence for 24-hour
intensity, base-rate climatology for the severe-storm probability.
"""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.metrics import brier_score_loss, mean_absolute_error, roc_auc_score
from sklearn.model_selection import GroupKFold

from . import data, features
from .features import FEATURES, SEVERE_KT

PARAMS = {"n_estimators": 300, "max_depth": 5, "learning_rate": 0.05, "subsample": 0.85,
          "colsample_bytree": 0.85, "min_child_weight": 3, "tree_method": "hist", "random_state": 7}


def _regressor() -> xgb.XGBRegressor:
    return xgb.XGBRegressor(objective="reg:squarederror", **PARAMS)


def _classifier() -> xgb.XGBClassifier:
    return xgb.XGBClassifier(objective="binary:logistic", eval_metric="logloss", **PARAMS)


def _safe_auc(y: np.ndarray, p: np.ndarray) -> float | None:
    return float(roc_auc_score(y, p)) if len(np.unique(y)) == 2 else None


def evaluate(df: pd.DataFrame, folds: int = 5) -> dict:
    reg = df.dropna(subset=["delta_24h"])
    cls = df.dropna(subset=["severe_24h"])
    groups_r, groups_c = reg["sid"].to_numpy(), cls["sid"].to_numpy()
    k = max(2, min(folds, reg["sid"].nunique(), cls["sid"].nunique()))

    def run(frame, groups, target, make, predict):
        out = {"full": np.full(len(frame), np.nan), "single": np.full(len(frame), np.nan)}
        for tr, te in GroupKFold(n_splits=k).split(frame, groups=groups):
            train = features.mask_history(frame.iloc[tr])
            model = make().fit(train[FEATURES], train[target])
            test = frame.iloc[te]
            out["full"][te] = predict(model, test[FEATURES])
            single = test[FEATURES].copy()
            single[features.HISTORY] = np.nan
            out["single"][te] = predict(model, single)
        return out

    wind = run(reg, groups_r, "delta_24h", _regressor, lambda m, x: m.predict(x))
    sev = run(cls, groups_c, "severe_24h", _classifier, lambda m, x: m.predict_proba(x)[:, 1])

    actual = reg["wind_24h"].to_numpy()
    persistence = mean_absolute_error(actual, reg["wind_kt"])
    y = cls["severe_24h"].to_numpy()
    base = float(y.mean())
    clim_brier = brier_score_loss(y, np.full(len(y), base))
    below = cls["wind_kt"].to_numpy() < SEVERE_KT
    metrics = {
        "folds": k,
        "intensity_24h": {
            "n": int(len(reg)),
            "mae_kt_with_history": round(mean_absolute_error(actual, reg["wind_kt"] + wind["full"]), 2),
            "mae_kt_single_report": round(mean_absolute_error(actual, reg["wind_kt"] + wind["single"]), 2),
            "mae_kt_persistence": round(persistence, 2),
        },
        "severe_24h": {
            "n": int(len(cls)), "base_rate": round(base, 3), "threshold_kt": SEVERE_KT,
            "auc_with_history": _safe_auc(y, sev["full"]),
            "auc_single_report": _safe_auc(y, sev["single"]),
            "brier_with_history": round(brier_score_loss(y, sev["full"]), 4),
            "brier_climatology": round(clim_brier, 4),
            "auc_below_threshold": _safe_auc(y[below], sev["full"][below]),
            "accuracy_at_0_5": round(float(((sev["full"] >= 0.5) == (y == 1)).mean()), 4),
        },
    }
    for key in ("auc_with_history", "auc_single_report", "auc_below_threshold"):
        if metrics["severe_24h"][key] is not None:
            metrics["severe_24h"][key] = round(metrics["severe_24h"][key], 4)
    metrics["intensity_24h"]["skill_vs_persistence"] = round(
        1 - metrics["intensity_24h"]["mae_kt_with_history"] / persistence, 4) if persistence else None
    metrics["severe_24h"]["brier_skill_score"] = round(
        1 - metrics["severe_24h"]["brier_with_history"] / clim_brier, 4) if clim_brier else None
    return metrics


def fit_and_export(df: pd.DataFrame, out: Path, metrics: dict, tracks: pd.DataFrame) -> dict:
    out.mkdir(parents=True, exist_ok=True)
    reg = features.mask_history(df.dropna(subset=["delta_24h"]))
    cls = features.mask_history(df.dropna(subset=["severe_24h"]))
    wind_model = _regressor().fit(reg[FEATURES], reg["delta_24h"])
    sev_model = _classifier().fit(cls[FEATURES], cls["severe_24h"])
    wind_model.get_booster().save_model(str(out / "cyclone_intensity_24h.json"))
    sev_model.get_booster().save_model(str(out / "cyclone_severe_24h.json"))
    card = {
        "name": "volentify-cyclone-ni",
        "version": datetime.now(timezone.utc).strftime("%Y.%m.%d"),
        "trained_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "data": {
            "source": "NOAA NCEI IBTrACS v04r01, North Indian Ocean (RSMC New Delhi winds preferred)",
            "storms": int(tracks["sid"].nunique()), "fixes": int(len(tracks)),
            "first": str(tracks["time"].min().date()), "last": str(tracks["time"].max().date()),
        },
        "features": FEATURES,
        "targets": {"intensity_24h": "change in max sustained wind (kt) over the next 24 h",
                    "severe_24h": f"storm reaches ≥{SEVERE_KT} kt (IMD severe cyclonic storm) within 24 h"},
        "evaluation": "storm-grouped cross-validation",
        "metrics": metrics,
        "xgboost": xgb.__version__,
    }
    (out / "model_card.json").write_text(json.dumps(card, indent=2))
    return card


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", type=Path, default=Path("data/ibtracs.NI.list.v04r01.csv"))
    ap.add_argument("--out", type=Path, default=Path("../frontend/api/_lib/models"))
    ap.add_argument("--download", action="store_true", help="fetch the latest IBTrACS file first")
    ap.add_argument("--since", type=int, default=1980)
    args = ap.parse_args()
    if args.download or not args.data.exists():
        print(f"Downloading {data.IBTRACS_NI_URL}")
        data.download(args.data)
    tracks = data.load(args.data, since=args.since)
    table = features.build(tracks)
    print(f"{tracks['sid'].nunique()} storms, {len(tracks)} fixes, {len(table)} samples")
    metrics = evaluate(table)
    card = fit_and_export(table, args.out, metrics, tracks)
    print(json.dumps(card["metrics"], indent=2))


if __name__ == "__main__":
    main()
