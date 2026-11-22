"""Dependency-free inference for XGBoost models saved with `Booster.save_model('*.json')`.

Keeps the serverless bundle small: no xgboost/numpy needed at runtime. Verified against
xgboost's own predictions in ml/tests.
"""

from __future__ import annotations

import json
import math
import struct
from pathlib import Path
from typing import Sequence


def f32(v: float) -> float:
    """XGBoost compares features in float32; round the same way so boundary cases agree."""
    return struct.unpack("f", struct.pack("f", v))[0]


class Tree:
    __slots__ = ("left", "right", "feature", "threshold", "default_left")

    def __init__(self, raw: dict) -> None:
        self.left = raw["left_children"]
        self.right = raw["right_children"]
        self.feature = raw["split_indices"]
        self.threshold = [f32(t) for t in raw["split_conditions"]]
        self.default_left = raw["default_left"]

    def leaf(self, x: Sequence[float]) -> float:
        node = 0
        while self.left[node] != -1:
            v = x[self.feature[node]]
            if v is None or math.isnan(v):
                node = self.left[node] if self.default_left[node] else self.right[node]
            else:
                node = self.left[node] if v < self.threshold[node] else self.right[node]
        return self.threshold[node]


def _base_score(raw: object) -> float:
    if isinstance(raw, str):
        raw = raw.strip("[]").split(",")[0]
    return float(raw)  # type: ignore[arg-type]


class Booster:
    def __init__(self, path: Path) -> None:
        model = json.loads(Path(path).read_text())["learner"]
        self.objective = model["objective"]["name"]
        self.base = _base_score(model["learner_model_param"]["base_score"])
        trees = model["gradient_booster"]["model"]["trees"]
        self.trees = [Tree(t) for t in trees]
        self.n_features = int(model["learner_model_param"]["num_feature"])

    def margin(self, x: Sequence[float | None]) -> float:
        x = [None if v is None or math.isnan(v) else f32(v) for v in x]
        if self.objective == "binary:logistic":
            p = min(max(self.base, 1e-7), 1 - 1e-7)
            start = math.log(p / (1 - p))
        else:
            start = self.base
        return start + sum(t.leaf(x) for t in self.trees)

    def predict(self, x: Sequence[float | None]) -> float:
        m = self.margin(x)
        return 1.0 / (1.0 + math.exp(-m)) if self.objective == "binary:logistic" else m
