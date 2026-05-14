"""
Unit tests for ai-coach/main.py — BoardAnalyzer logic.

Run with:
    cd ai-coach
    pytest test_analyzer.py -v

Fixtures build small, hand-crafted board states so assertions are easy to
reason about without running a full Mahjong simulation.
"""

import pytest
from main import BoardAnalyzer, Tile


# ---------------------------------------------------------------------------
# Fixtures — small hand-crafted boards
# ---------------------------------------------------------------------------

def make_tile(id: int, x: int, y: int, z: int, state: str = "idle", type_: int = 0) -> Tile:
    """Convenience constructor so tests stay concise."""
    return Tile(id=id, type=type_, x=x, y=y, z=z, state=state)  # type: ignore[call-arg]


def single_tile() -> list[Tile]:
    """One isolated idle tile — trivially free."""
    return [make_tile(0, 4, 4, 0)]


def covered_pair() -> list[Tile]:
    """
    Bottom tile (id=0) is covered by top tile (id=1).
    Layout:
        z=1:        [1] at (4,4,1)
        z=0:  [0] at (4,4,0)
    """
    return [
        make_tile(0, 4, 4, 0),  # bottom — blocked by tile above
        make_tile(1, 4, 4, 1),  # top — free
    ]


def side_by_side() -> list[Tile]:
    """
    Two tiles on the same layer next to each other.
    [0] at (2,4,0)  [1] at (4,4,0)
    Each blocks one side of the other but has an open side → both free.
    """
    return [
        make_tile(0, 2, 4, 0),
        make_tile(1, 4, 4, 0),
    ]


def sandwiched() -> list[Tile]:
    """
    Three tiles in a row.  The centre tile (id=1) has both sides blocked.
    [0](2,4,0)  [1](4,4,0)  [2](6,4,0)
    """
    return [
        make_tile(0, 2, 4, 0),
        make_tile(1, 4, 4, 0),
        make_tile(2, 6, 4, 0),
    ]


def matching_free_pair() -> list[Tile]:
    """Two side-by-side free tiles of the same type — one valid move."""
    return [
        make_tile(0, 2, 4, 0, type_=5),
        make_tile(1, 4, 4, 0, type_=5),
    ]


def three_layer_stack() -> list[Tile]:
    """
    A three-tile vertical stack: bottom ← mid ← top.
    burial_depth(bottom) should be 2 (mid and top block it).
    burial_depth(mid)    should be 1 (only top blocks it).
    burial_depth(top)    should be 0 (nothing above).
    """
    return [
        make_tile(0, 4, 4, 0),  # bottom
        make_tile(1, 4, 4, 1),  # mid — covers bottom
        make_tile(2, 4, 4, 2),  # top — covers mid
    ]


def diamond_block() -> list[Tile]:
    """
    Two tiles (A, B) each covered by the same tile (C).
    burial_depth(A) = 1 and burial_depth(B) = 1.
    C is directly free.
    """
    return [
        make_tile(0, 2, 4, 0),  # A — covered by C
        make_tile(1, 4, 4, 0),  # B — also covered by C (half-step overlap)
        make_tile(2, 3, 4, 1),  # C — covers both A and B (dx=1 < 2)
    ]


# ---------------------------------------------------------------------------
# is_free
# ---------------------------------------------------------------------------

class TestIsFree:
    def test_single_tile_is_free(self):
        analyzer = BoardAnalyzer(single_tile())
        tile = analyzer.active[0]
        assert analyzer.is_free(tile) is True

    def test_bottom_covered_is_not_free(self):
        tiles    = covered_pair()
        analyzer = BoardAnalyzer(tiles)
        bottom   = next(t for t in analyzer.active if t.z == 0)
        assert analyzer.is_free(bottom) is False

    def test_top_tile_is_free(self):
        tiles    = covered_pair()
        analyzer = BoardAnalyzer(tiles)
        top      = next(t for t in analyzer.active if t.z == 1)
        assert analyzer.is_free(top) is True

    def test_both_side_by_side_are_free(self):
        analyzer = BoardAnalyzer(side_by_side())
        for tile in analyzer.active:
            assert analyzer.is_free(tile) is True, f"tile {tile.id} should be free"

    def test_sandwiched_centre_is_not_free(self):
        analyzer = BoardAnalyzer(sandwiched())
        centre   = next(t for t in analyzer.active if t.id == 1)
        assert analyzer.is_free(centre) is False

    def test_sandwiched_ends_are_free(self):
        analyzer = BoardAnalyzer(sandwiched())
        ends     = [t for t in analyzer.active if t.id in (0, 2)]
        for tile in ends:
            assert analyzer.is_free(tile) is True

    def test_matched_tile_is_not_active(self):
        tiles    = [make_tile(0, 4, 4, 0, state="matched")]
        analyzer = BoardAnalyzer(tiles)
        assert len(analyzer.active) == 0

    def test_half_step_coverage(self):
        """
        A tile at z+1 with dx=1 (within the ±1 tolerance) should block
        the tile below — mirrors the TypeScript half-step support.
        """
        bottom   = make_tile(0, 4, 4, 0)
        top_half = make_tile(1, 5, 4, 1)  # dx=1 < 2 → covers bottom
        analyzer = BoardAnalyzer([bottom, top_half])
        assert analyzer.is_free(bottom) is False
        assert analyzer.is_free(top_half) is True


# ---------------------------------------------------------------------------
# available_pairs
# ---------------------------------------------------------------------------

class TestAvailablePairs:
    def test_no_pairs_when_single_tile(self):
        analyzer = BoardAnalyzer(single_tile())
        assert analyzer.available_pairs() == []

    def test_no_pairs_when_types_differ(self):
        tiles = [
            make_tile(0, 2, 4, 0, type_=1),
            make_tile(1, 4, 4, 0, type_=2),
        ]
        analyzer = BoardAnalyzer(tiles)
        assert analyzer.available_pairs() == []

    def test_one_pair_when_same_type_free(self):
        analyzer = BoardAnalyzer(matching_free_pair())
        pairs    = analyzer.available_pairs()
        assert len(pairs) == 1
        ids = {pairs[0][0].id, pairs[0][1].id}
        assert ids == {0, 1}

    def test_no_pairs_when_same_type_but_blocked(self):
        """Same type but one tile is covered — no valid pair."""
        tiles = [
            make_tile(0, 4, 4, 0, type_=5),  # covered
            make_tile(1, 4, 4, 1, type_=7),  # different type, covers tile 0
            make_tile(2, 4, 4, 2, type_=5),  # same type as 0 but also covered by nothing — free
        ]
        # tile 0 is covered by tile 1 → not free
        # tile 2 is free (nothing above, open sides? — only one column so both sides open)
        # tile 1 is free (nothing above) but type 7 — no partner
        # So: tile 2 (type 5) is free; tile 0 (type 5) is NOT free → no pair
        analyzer = BoardAnalyzer(tiles)
        pairs = analyzer.available_pairs()
        type5_pairs = [(a, b) for a, b in pairs if a.type == 5]
        assert type5_pairs == []

    def test_pair_count_for_four_same_type_free_tiles(self):
        """C(4,2) = 6 pairs from four free tiles of the same type.
        Step of 4 ensures no tile is laterally adjacent to another
        (the adjacency threshold is < 2 units, so spacing ≥ 4 is safe).
        """
        tiles = [
            make_tile(i, i * 4, 0, 0, type_=3)
            for i in range(4)
        ]
        analyzer = BoardAnalyzer(tiles)
        pairs    = analyzer.available_pairs()
        assert len(pairs) == 6


# ---------------------------------------------------------------------------
# burial_depth (BFS)
# ---------------------------------------------------------------------------

class TestBurialDepth:
    def test_free_tile_has_depth_zero(self):
        analyzer = BoardAnalyzer(single_tile())
        tile     = analyzer.active[0]
        assert analyzer.burial_depth(tile) == 0

    def test_one_direct_blocker(self):
        """Bottom tile in a two-tile stack has depth 1."""
        tiles    = covered_pair()
        analyzer = BoardAnalyzer(tiles)
        bottom   = next(t for t in analyzer.active if t.z == 0)
        assert analyzer.burial_depth(bottom) == 1

    def test_top_of_stack_has_depth_zero(self):
        tiles    = covered_pair()
        analyzer = BoardAnalyzer(tiles)
        top      = next(t for t in analyzer.active if t.z == 1)
        assert analyzer.burial_depth(top) == 0

    def test_three_layer_stack(self):
        """
        Stack: top(z=2) → mid(z=1) → bottom(z=0)
        bottom: blocked by mid and top → depth 2
        mid:    blocked by top only   → depth 1
        top:    nothing above          → depth 0
        """
        analyzer = BoardAnalyzer(three_layer_stack())
        by_z     = {t.z: t for t in analyzer.active}

        assert analyzer.burial_depth(by_z[0]) == 2
        assert analyzer.burial_depth(by_z[1]) == 1
        assert analyzer.burial_depth(by_z[2]) == 0

    def test_diamond_block(self):
        """
        C (z=1) covers both A and B (z=0) via half-step overlap.
        burial_depth(A) = 1  (only C blocks it)
        burial_depth(B) = 1  (only C blocks it)
        burial_depth(C) = 0  (nothing above)
        """
        analyzer = BoardAnalyzer(diamond_block())
        by_id    = {t.id: t for t in analyzer.active}

        assert analyzer.burial_depth(by_id[0]) == 1  # A
        assert analyzer.burial_depth(by_id[1]) == 1  # B
        assert analyzer.burial_depth(by_id[2]) == 0  # C

    def test_shared_blocker_counted_once(self):
        """
        If two tiles at z=1 both block a tile at z=0, and a tile at z=2
        blocks both of them, depth of z=0 tile should be 3 (not 4).
        """
        bottom = make_tile(0, 4, 4, 0)
        mid_a  = make_tile(1, 4, 4, 1)  # covers bottom
        mid_b  = make_tile(2, 5, 4, 1)  # also covers bottom (dx=1)
        top    = make_tile(3, 4, 4, 2)  # covers mid_a and mid_b
        analyzer = BoardAnalyzer([bottom, mid_a, mid_b, top])
        # Blockers of bottom: mid_a, mid_b, top → 3 unique tiles
        assert analyzer.burial_depth(bottom) == 3
