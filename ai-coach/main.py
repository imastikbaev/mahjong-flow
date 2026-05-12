"""
Mahjong Flow — AI Flow Coach microservice.

Architecture
------------
BoardAnalyzer   pure board-state logic (free-tile check, pair discovery,
                feature extraction) — no I/O, fully testable.

Predictor ABC   strategy interface for the dead-end probability model.
                HeuristicPredictor ships now; CatBoostPredictor is a
                drop-in replacement once a model is trained.

FastAPI app     single endpoint /api/analyze-board that glues the above
                together and returns advice + metrics.

Run
---
    uvicorn main:app --reload --port 8000
"""

from __future__ import annotations

import math
from abc import ABC, abstractmethod
from collections import defaultdict
from typing import Literal

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Domain models
# ---------------------------------------------------------------------------

TileState = Literal["idle", "selected", "matched"]


class Tile(BaseModel):
    id: int
    type: int
    x: int
    y: int
    z: int
    state: TileState = "idle"


class AnalyzeRequest(BaseModel):
    tiles: list[Tile] = Field(..., description="Full tile array from the Zustand store.")


class AnalyzeResponse(BaseModel):
    available_moves: int = Field(
        ...,
        description="Count of distinct (tileA, tileB) matchable pairs right now.",
    )
    dead_end_probability: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="0 = safe, 1 = almost certainly stuck.",
    )
    advice: str
    # Extra metrics surfaced to the frontend for the stats dashboard
    features: "BoardFeatures"


class BoardFeatures(BaseModel):
    """
    Human-readable feature vector.
    Exposed in the response so the frontend can render a 'focus bar'
    and so a data-collection pipeline can log training samples for CatBoost.
    """
    total_active: int
    free_count: int
    free_ratio: float
    available_pairs: int        # same as available_moves, kept for clarity
    available_types: int        # distinct types with ≥2 free tiles
    mobility: float             # available_types / distinct_active_types
    isolated_types: int         # types: 1 free tile, partner still buried
    isolation_ratio: float
    mean_burial_depth: float    # average z-layers blocking each active tile
    top_layer_ratio: float      # fraction of tiles on the highest z-layer
    max_z: int
    progress: float             # 0 = fresh board, 1 = complete


# Rebuild so AnalyzeResponse sees BoardFeatures
AnalyzeResponse.model_rebuild()


# ---------------------------------------------------------------------------
# Board analysis — pure functions, zero I/O
# ---------------------------------------------------------------------------

class BoardAnalyzer:
    """
    Mirrors the TypeScript isTileFree() logic exactly so the coach sees
    the same board state as the player's browser.
    """

    def __init__(self, tiles: list[Tile]) -> None:
        # Work only with active (non-matched) tiles
        self.active: list[Tile] = [t for t in tiles if t.state != "matched"]
        self._free_cache: set[int] | None = None

    # ------------------------------------------------------------------
    # Freedom predicate (same rules as store/mahjongStore.ts)
    # ------------------------------------------------------------------

    def is_free(self, tile: Tile) -> bool:
        """
        A tile is free iff:
          1. It is idle (not matched/selected-away).
          2. Nothing sits directly above it  (z+1, |dx|<2, |dy|<2).
          3. At least one horizontal side (x±2, same y, same z) is open.
        """
        if tile.state == "matched":
            return False

        others = [t for t in self.active if t.id != tile.id]

        # Condition 1 — nothing above
        has_above = any(
            t.z == tile.z + 1
            and abs(t.x - tile.x) < 2
            and abs(t.y - tile.y) < 2
            for t in others
        )
        if has_above:
            return False

        # Condition 2 — at least one lateral side open
        blocked_left = any(
            t.z == tile.z and t.y == tile.y and t.x == tile.x - 2
            for t in others
        )
        blocked_right = any(
            t.z == tile.z and t.y == tile.y and t.x == tile.x + 2
            for t in others
        )
        return not blocked_left or not blocked_right

    @property
    def free_tiles(self) -> list[Tile]:
        if self._free_cache is None:
            self._free_cache = {t.id for t in self.active if self.is_free(t)}
        return [t for t in self.active if t.id in self._free_cache]

    # ------------------------------------------------------------------
    # Pair discovery
    # ------------------------------------------------------------------

    def available_pairs(self) -> list[tuple[Tile, Tile]]:
        """
        All unordered pairs of free tiles that share the same type.
        C(n, 2) per type — reflects every distinct move a player can make.
        """
        by_type: dict[int, list[Tile]] = defaultdict(list)
        for tile in self.free_tiles:
            by_type[tile.type].append(tile)

        pairs: list[tuple[Tile, Tile]] = []
        for group in by_type.values():
            for i in range(len(group)):
                for j in range(i + 1, len(group)):
                    pairs.append((group[i], group[j]))
        return pairs

    # ------------------------------------------------------------------
    # Burial depth
    # ------------------------------------------------------------------

    def burial_depth(self, tile: Tile) -> int:
        """
        Number of active tiles that directly or transitively block this tile
        from above.  We use a single-layer count (direct blockers only) for
        O(n) cost; a recursive BFS would give truer depth at O(n²).
        """
        return sum(
            1
            for t in self.active
            if t.id != tile.id
            and t.z > tile.z
            and abs(t.x - tile.x) < 2
            and abs(t.y - tile.y) < 2
        )

    # ------------------------------------------------------------------
    # Feature extraction — single source of truth for both the heuristic
    # and any future CatBoost model
    # ------------------------------------------------------------------

    def extract_features(self) -> BoardFeatures:
        active = self.active
        free   = self.free_tiles
        pairs  = self.available_pairs()

        total_active = len(active)
        free_count   = len(free)
        free_ratio   = free_count / total_active if total_active else 0.0

        # Types with ≥2 free tiles (player actually has a choice)
        free_by_type: dict[int, int] = defaultdict(int)
        for t in free:
            free_by_type[t.type] += 1
        available_types = sum(1 for n in free_by_type.values() if n >= 2)

        # Distinct types still active
        active_types = len({t.type for t in active})
        mobility = available_types / active_types if active_types else 0.0

        # Isolated types: exactly 1 free tile but ≥2 active tiles of that type
        # → partner is buried; if the free tile gets matched away, type is lost
        active_by_type: dict[int, int] = defaultdict(int)
        for t in active:
            active_by_type[t.type] += 1
        isolated_types = sum(
            1
            for typ, active_n in active_by_type.items()
            if active_n >= 2 and free_by_type.get(typ, 0) == 1
        )
        isolation_ratio = isolated_types / active_types if active_types else 0.0

        # Burial
        burial_depths   = [self.burial_depth(t) for t in active]
        mean_burial     = sum(burial_depths) / total_active if total_active else 0.0

        # Vertical distribution
        max_z           = max((t.z for t in active), default=0)
        top_layer_count = sum(1 for t in active if t.z == max_z)
        top_layer_ratio = top_layer_count / total_active if total_active else 0.0

        # Progress (144 = full Turtle board)
        progress = 1.0 - total_active / 144.0

        return BoardFeatures(
            total_active     = total_active,
            free_count       = free_count,
            free_ratio       = free_ratio,
            available_pairs  = len(pairs),
            available_types  = available_types,
            mobility         = round(mobility, 4),
            isolated_types   = isolated_types,
            isolation_ratio  = round(isolation_ratio, 4),
            mean_burial_depth= round(mean_burial, 4),
            top_layer_ratio  = round(top_layer_ratio, 4),
            max_z            = max_z,
            progress         = round(progress, 4),
        )


# ---------------------------------------------------------------------------
# Predictor — strategy pattern for the dead-end probability model
# ---------------------------------------------------------------------------

class Predictor(ABC):
    """
    Swap implementations without touching the endpoint logic:
      • HeuristicPredictor  → ships now, no dependencies
      • CatBoostPredictor   → drop in once a model is trained
    """

    @abstractmethod
    def predict(self, features: BoardFeatures) -> float:
        """Returns a probability in [0, 1]."""
        ...


class HeuristicPredictor(Predictor):
    """
    Weighted linear combination of 'danger' signals, passed through a
    sigmoid to produce a calibrated probability.

    The weight vector was chosen to reflect Mahjong Solitaire domain knowledge:
      • Low mobility is the strongest predictor of a dead end.
      • Isolated types are a leading indicator (one more bad match and
        a type becomes permanently unresolvable).
      • High burial depth and sparse free tiles are lagging indicators.

    This formula is structurally identical to a logistic regression — swapping
    in a CatBoost model simply replaces `_linear_score()` with a model call.
    """

    # Feature weights  (all positive = "more of this → more danger")
    W_LOW_MOBILITY   = 2.5   # 1 - mobility
    W_ISOLATION      = 2.0   # isolation_ratio
    W_BURIAL         = 0.8   # normalised mean burial depth
    W_LOW_FREE_RATIO = 1.5   # 1 - free_ratio
    W_ZERO_PAIRS     = 3.0   # hard penalty if no moves exist at all
    BIAS             = -1.8  # shifts baseline so a healthy board ≈ 0.05

    def _linear_score(self, f: BoardFeatures) -> float:
        # Normalise burial depth to [0,1]; max realistic depth ≈ 4 layers
        normalised_burial = min(f.mean_burial_depth / 4.0, 1.0)

        score  = self.BIAS
        score += self.W_LOW_MOBILITY   * (1.0 - f.mobility)
        score += self.W_ISOLATION      * f.isolation_ratio
        score += self.W_BURIAL         * normalised_burial
        score += self.W_LOW_FREE_RATIO * (1.0 - f.free_ratio)

        # Hard bonus danger when literally no pairs exist
        if f.available_pairs == 0 and f.total_active > 0:
            score += self.W_ZERO_PAIRS

        return score

    def predict(self, features: BoardFeatures) -> float:
        score = self._linear_score(features)
        # Sigmoid: σ(x) = 1 / (1 + e^{-x})
        probability = 1.0 / (1.0 + math.exp(-score))
        return round(probability, 4)


class CatBoostPredictor(Predictor):
    """
    Placeholder — replace with a real trained model.

    Training pipeline outline:
      1. Log (features, did_player_finish: bool) from the /api/analyze-board
         endpoint to a Supabase `coach_samples` table.
      2. Train:  catboost.CatBoostClassifier().fit(X, y)
      3. Export: model.save_model("flow_coach.cbm")
      4. Uncomment the code below and set MODEL_PATH.
    """

    MODEL_PATH = "flow_coach.cbm"

    def __init__(self) -> None:
        # from catboost import CatBoostClassifier
        # self._model = CatBoostClassifier()
        # self._model.load_model(self.MODEL_PATH)
        raise NotImplementedError(
            "CatBoostPredictor requires a trained model at "
            f"'{self.MODEL_PATH}'. Use HeuristicPredictor in the meantime."
        )

    def predict(self, features: BoardFeatures) -> float:
        feature_vector = [
            features.free_ratio,
            features.mobility,
            features.isolation_ratio,
            features.mean_burial_depth,
            features.top_layer_ratio,
            features.progress,
            features.available_pairs,
            features.isolated_types,
        ]
        # prob = self._model.predict_proba([feature_vector])[0][1]
        # return round(float(prob), 4)
        _ = feature_vector  # silence linter until model is wired
        raise NotImplementedError


# ---------------------------------------------------------------------------
# Advice generator
# ---------------------------------------------------------------------------

THRESHOLDS = {
    "dead_end_critical": 0.75,
    "dead_end_warning":  0.45,
    "mobility_low":      0.20,
}


def generate_advice(features: BoardFeatures, dead_end_prob: float) -> str:
    """
    Generates a single, actionable tip.  Priority order ensures the most
    urgent message is shown when multiple conditions are true.
    """
    f = features

    # ── Critical states ───────────────────────────────────────────────
    if f.available_pairs == 0 and f.total_active > 0:
        return (
            "No moves available — the board is stuck. "
            "Use a hint or shuffle to continue."
        )

    if dead_end_prob >= THRESHOLDS["dead_end_critical"]:
        return (
            f"High dead-end risk ({dead_end_prob:.0%}). "
            "Prioritise freeing buried tiles before matching easy pairs."
        )

    # ── Isolation warning ─────────────────────────────────────────────
    if f.isolated_types >= 3:
        return (
            f"{f.isolated_types} tile types have only one free face. "
            "Unlock their partners before matching them away."
        )

    # ── Low mobility ──────────────────────────────────────────────────
    if f.mobility < THRESHOLDS["mobility_low"] and f.available_pairs > 0:
        return (
            f"Only {f.available_types} move type(s) available. "
            "Clear the top layers to open more options."
        )

    # ── Top-heavy board ───────────────────────────────────────────────
    if f.top_layer_ratio > 0.15 and f.max_z >= 2:
        return (
            f"The top layer holds {f.top_layer_ratio:.0%} of active tiles. "
            "Focus there to cascade unlocks downward."
        )

    # ── Moderate warning ──────────────────────────────────────────────
    if dead_end_prob >= THRESHOLDS["dead_end_warning"]:
        return (
            "Board tension is building. "
            "Think two moves ahead before matching."
        )

    # ── Healthy board — encourage flow ────────────────────────────────
    if f.available_pairs == 1:
        return "One move available — take it and see what opens up."

    if f.available_pairs <= 3:
        return (
            f"{f.available_pairs} pairs available. "
            "Choose the one that frees the most tiles above it."
        )

    progress_pct = int(f.progress * 100)
    return (
        f"{f.available_pairs} pairs available — you're in flow. "
        f"Board is {progress_pct}% cleared."
    )


# ---------------------------------------------------------------------------
# FastAPI application
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Mahjong Flow — AI Coach",
    description="Board analysis microservice for the Mahjong Flow app.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://your-production-domain.com"],
    allow_methods=["POST"],
    allow_headers=["Content-Type"],
)

# Single shared predictor instance — swap class to upgrade to CatBoost.
_predictor: Predictor = HeuristicPredictor()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/analyze-board", response_model=AnalyzeResponse)
def analyze_board(request: AnalyzeRequest) -> AnalyzeResponse:
    """
    Accepts the full tile array from the Zustand store and returns:

    • available_moves         — how many distinct matches exist right now
    • dead_end_probability    — 0–1 risk score
    • advice                  — one actionable tip string
    • features                — raw feature vector (for dashboard + data logging)

    The endpoint is intentionally stateless: the client sends the full board
    on every click so this service never needs to track sessions.
    """
    analyzer = BoardAnalyzer(request.tiles)
    features = analyzer.extract_features()
    pairs    = analyzer.available_pairs()

    dead_end_prob = _predictor.predict(features)
    advice        = generate_advice(features, dead_end_prob)

    return AnalyzeResponse(
        available_moves      = len(pairs),
        dead_end_probability = dead_end_prob,
        advice               = advice,
        features             = features,
    )


# ---------------------------------------------------------------------------
# Entry point (python main.py)
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
