/**
 * Unit tests for lib/mahjong/engine.ts
 *
 * Board fixtures use integer coordinates matching the real TURTLE_LAYOUT
 * grid (step 2 on x and y, z from 0 upward).
 */

import { describe, it, expect } from 'vitest';
import {
  buildOccupancySet,
  isTileFree,
  isTileFreeWithSet,
  computeFreeIds,
  hasAvailableMoves,
} from '../engine';
import type { Tile } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTile(
  id: number,
  x: number,
  y: number,
  z: number,
  state: Tile['state'] = 'idle',
  type = 0,
): Tile {
  return { id, type, x, y, z, state };
}

// ---------------------------------------------------------------------------
// buildOccupancySet
// ---------------------------------------------------------------------------

describe('buildOccupancySet', () => {
  it('includes idle and selected tiles, excludes matched', () => {
    const tiles: Tile[] = [
      makeTile(0, 0, 0, 0, 'idle'),
      makeTile(1, 2, 0, 0, 'selected'),
      makeTile(2, 4, 0, 0, 'matched'),
    ];
    const set = buildOccupancySet(tiles);
    expect(set.has('0,0,0')).toBe(true);
    expect(set.has('2,0,0')).toBe(true);
    expect(set.has('4,0,0')).toBe(false);
    expect(set.size).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// isTileFree / isTileFreeWithSet
// ---------------------------------------------------------------------------

describe('isTileFree', () => {
  it('returns false for a matched tile', () => {
    const tile = makeTile(0, 0, 0, 0, 'matched');
    expect(isTileFree(tile, [tile])).toBe(false);
  });

  it('returns true for a completely isolated tile', () => {
    const tile = makeTile(0, 4, 4, 0);
    expect(isTileFree(tile, [tile])).toBe(true);
  });

  it('returns false when a tile directly above covers it', () => {
    const bottom = makeTile(0, 4, 4, 0);
    const top    = makeTile(1, 4, 4, 1); // same x,y — directly above
    expect(isTileFree(bottom, [bottom, top])).toBe(false);
  });

  it('returns false when a tile at z+1 with ±1 offset covers it (half-step)', () => {
    const bottom = makeTile(0, 4, 4, 0);
    const top    = makeTile(1, 5, 4, 1); // dx=1 < 2 — half-step overlap
    expect(isTileFree(bottom, [bottom, top])).toBe(false);
  });

  it('is NOT covered by a tile at z+1 with offset ≥ 2', () => {
    const bottom = makeTile(0, 4, 4, 0);
    const far    = makeTile(1, 6, 4, 1); // dx=2 — NOT < 2, should not cover
    expect(isTileFree(bottom, [bottom, far])).toBe(true);
  });

  it('returns false when both lateral sides are blocked', () => {
    const center = makeTile(0, 4, 4, 0);
    const left   = makeTile(1, 2, 4, 0); // x = center.x - 2
    const right  = makeTile(2, 6, 4, 0); // x = center.x + 2
    expect(isTileFree(center, [center, left, right])).toBe(false);
  });

  it('returns true when only the left side is blocked (right is open)', () => {
    const center = makeTile(0, 4, 4, 0);
    const left   = makeTile(1, 2, 4, 0);
    expect(isTileFree(center, [center, left])).toBe(true);
  });

  it('lateral blocker within y-tolerance (dy=1) still blocks', () => {
    const center  = makeTile(0, 4, 4, 0);
    const leftOff = makeTile(1, 2, 5, 0); // dy=1 < 2 — within tolerance
    const right   = makeTile(2, 6, 4, 0);
    expect(isTileFree(center, [center, leftOff, right])).toBe(false);
  });

  it('lateral blocker beyond y-tolerance (dy=2) does NOT block', () => {
    const center  = makeTile(0, 4, 4, 0);
    const farLeft = makeTile(1, 2, 6, 0); // dy=2, NOT < 2 — misses tolerance
    const right   = makeTile(2, 6, 4, 0);
    expect(isTileFree(center, [center, farLeft, right])).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// computeFreeIds
// ---------------------------------------------------------------------------

describe('computeFreeIds', () => {
  it('returns empty set for an empty board', () => {
    expect(computeFreeIds([])).toEqual(new Set());
  });

  it('marks a single idle tile as free', () => {
    const tile = makeTile(0, 2, 2, 0);
    expect(computeFreeIds([tile])).toEqual(new Set([0]));
  });

  it('does not include matched tiles', () => {
    const tiles: Tile[] = [
      makeTile(0, 2, 2, 0, 'matched'),
      makeTile(1, 4, 2, 0, 'idle'),
    ];
    const ids = computeFreeIds(tiles);
    expect(ids.has(0)).toBe(false);
    expect(ids.has(1)).toBe(true);
  });

  it('excludes a tile fully blocked from above', () => {
    const bottom = makeTile(0, 4, 4, 0);
    const top    = makeTile(1, 4, 4, 1);
    const ids    = computeFreeIds([bottom, top]);
    expect(ids.has(0)).toBe(false);
    expect(ids.has(1)).toBe(true); // top is not covered by anything
  });

  it('two side-by-side tiles are both free (open lateral sides)', () => {
    const a = makeTile(0, 2, 2, 0);
    const b = makeTile(1, 4, 2, 0); // right of a — but a's right is open, b's left is blocked
    // a: left open, right blocked by b → free (left open)
    // b: left blocked by a, right open → free (right open)
    const ids = computeFreeIds([a, b]);
    expect(ids.has(0)).toBe(true);
    expect(ids.has(1)).toBe(true);
  });

  it('sandwiched tile (blocked left and right) is not free', () => {
    const left   = makeTile(0, 2, 4, 0);
    const center = makeTile(1, 4, 4, 0);
    const right  = makeTile(2, 6, 4, 0);
    const ids    = computeFreeIds([left, center, right]);
    expect(ids.has(1)).toBe(false);  // center is sandwiched
    expect(ids.has(0)).toBe(true);   // left has open left side
    expect(ids.has(2)).toBe(true);   // right has open right side
  });
});

// ---------------------------------------------------------------------------
// hasAvailableMoves
// ---------------------------------------------------------------------------

describe('hasAvailableMoves', () => {
  it('returns false for an empty board', () => {
    expect(hasAvailableMoves([])).toBe(false);
  });

  it('returns false when only one free tile of each type exists', () => {
    const tiles: Tile[] = [
      makeTile(0, 2, 2, 0, 'idle', 0),
      makeTile(1, 4, 2, 0, 'idle', 1), // different types — no matching pair
    ];
    expect(hasAvailableMoves(tiles)).toBe(false);
  });

  it('returns true when two free tiles share a type', () => {
    const tiles: Tile[] = [
      makeTile(0, 2, 2, 0, 'idle', 5),
      makeTile(1, 4, 2, 0, 'idle', 5), // same type — valid pair
    ];
    expect(hasAvailableMoves(tiles)).toBe(true);
  });

  it('considers selected tile as a potential pair partner', () => {
    // selected tile (id=0, type=3) + free idle tile (id=1, type=3) → move exists
    const tiles: Tile[] = [
      makeTile(0, 2, 2, 0, 'selected', 3),
      makeTile(1, 4, 2, 0, 'idle', 3),
    ];
    expect(hasAvailableMoves(tiles)).toBe(true);
  });

  it('returns false when matching tiles exist but are all blocked', () => {
    // top tiles block the bottom ones; top tiles have no match partner among free
    const bottomA = makeTile(0, 4, 4, 0, 'idle', 7);
    const bottomB = makeTile(1, 6, 4, 0, 'idle', 7);
    const topA    = makeTile(2, 4, 4, 1, 'idle', 8); // covers bottomA
    const topB    = makeTile(3, 6, 4, 1, 'idle', 9); // covers bottomB
    // bottomA and bottomB are covered → not free; topA/topB have different types
    expect(hasAvailableMoves([bottomA, bottomB, topA, topB])).toBe(false);
  });
});
