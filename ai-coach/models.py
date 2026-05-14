"""
ai-coach/models.py — ML model implementations for the dead-end predictor.

Only import this module when you are ready to wire up a trained CatBoost model.
The application uses HeuristicPredictor (defined in main.py) by default.

Training outline
----------------
1. Add a `coach_samples` table to Supabase and log
   (features JSON, did_player_finish BOOL) from /api/analyze-board.
2. Export rows → pandas DataFrame; build feature matrix X, label vector y.
3. Train:
       from catboost import CatBoostClassifier
       model = CatBoostClassifier(iterations=500, learning_rate=0.05)
       model.fit(X, y, eval_set=(X_val, y_val))
       model.save_model("flow_coach.cbm")
4. Set MODEL_PATH below, uncomment the body of predict(), and swap in
   CatBoostPredictor as the _predictor in main.py.
"""

from __future__ import annotations

from main import BoardFeatures, Predictor

MODEL_PATH = "flow_coach.cbm"

FEATURE_ORDER = [
    "free_ratio",
    "mobility",
    "isolation_ratio",
    "mean_burial_depth",
    "top_layer_ratio",
    "progress",
    "available_pairs",
    "isolated_types",
]


class CatBoostPredictor(Predictor):
    """
    Drop-in replacement for HeuristicPredictor once a model is trained.

    Usage
    -----
    In main.py, replace::

        _predictor: Predictor = HeuristicPredictor()

    with::

        from models import CatBoostPredictor
        _predictor: Predictor = CatBoostPredictor()
    """

    def __init__(self) -> None:
        from catboost import CatBoostClassifier  # noqa: PLC0415

        self._model = CatBoostClassifier()
        self._model.load_model(MODEL_PATH)

    def predict(self, features: BoardFeatures) -> float:
        from catboost import CatBoostClassifier  # noqa: PLC0415  # type: ignore[assignment]

        vector = [[getattr(features, name) for name in FEATURE_ORDER]]
        prob: float = self._model.predict_proba(vector)[0][1]  # type: ignore[attr-defined]
        return round(float(prob), 4)
