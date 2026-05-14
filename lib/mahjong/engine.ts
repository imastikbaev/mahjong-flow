// ---------------------------------------------------------------------------
// Mahjong Flow — tile freedom engine
//
// Single authoritative implementation of all board-state logic consumed by:
//   • store/mahjongStore.ts  (game mechanics, board generators)
//   • components/MahjongBoard.tsx  (render-time free-tile highlighting)
//
// The Python microservice (ai-coach/main.py) mirrors this logic in its
// BoardAnalyzer class and must be kept semantically in sync when the
// freedom predicate changes.
// ---------------------------------------------------------------------------

import type { Tile } from './types';

// ---------------------------------------------------------------------------
// Occupancy index
// ---------------------------------------------------------------------------

/**
 * Canonical string key for a tile position.
 * Using a plain string is consistently faster than Map<number, Map<...>> for
 * this dataset size (≤144 tiles) — string interning avoids nested lookups.
 */
export function posKey(x: number, y: number, z: number): string {
  return `${x},${y},${z}`;
}

/**
 * Build a Set of occupied positions from a tile array.
 * Excludes matched tiles — they have been removed from the board.
 * O(N) time and space.
 */
export function buildOccupancySet(tiles: readonly Tile[]): Set<string> {
  const occupied = new Set<string>();
  for (const t of tiles) {
    if (t.state !== 'matched') occupied.add(posKey(t.x, t.y, t.z));
  }
  return occupied;
}

// ---------------------------------------------------------------------------
// Freedom predicate
// ---------------------------------------------------------------------------

/**
 * O(1) freedom check given a pre-built occupancy set.
 *
 * A tile is free when ALL of the following hold:
 *   1. It is 'idle' (not matched or already selected away).
 *   2. No active tile occupies any cell at z+1 within ±1 unit on both the
 *      x and y axes — the ±1 tolerance is intentional: it supports the
 *      classic Turtle layout where some upper-layer tiles sit at half-step
 *      offsets relative to their lower neighbours.
 *   3. At least one horizontal side (left or right) is unobstructed.
 *      A neighbour blocks a side when it is within 2 x-units AND within
 *      1 y-unit (the y tolerance again handles half-row offsets).
 *
 * Caller is responsible for removing `tile` itself from `occupied` before
 * calling (use `computeFreeIds` which handles this automatically).
 */
export function isTileFreeWithSet(tile: Tile, occupied: Set<string>): boolean {
  if (tile.state !== 'idle') return false;

  // 1 — Coverage: nothing in the layer above within ±1 unit on both axes.
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (occupied.has(posKey(tile.x + dx, tile.y + dy, tile.z + 1))) {
        return false;
      }
    }
  }

  // 2 — Lateral freedom: at least one side must be open.
  //     Check both the exact-step (±2) and half-step (±1) neighbour cells
  //     to handle tiles positioned at non-integer grid offsets.
  let blockedLeft  = false;
  let blockedRight = false;

  for (let dy = -1; dy <= 1; dy++) {
    if (!blockedLeft && (
      occupied.has(posKey(tile.x - 2, tile.y + dy, tile.z)) ||
      occupied.has(posKey(tile.x - 1, tile.y + dy, tile.z))
    )) blockedLeft = true;

    if (!blockedRight && (
      occupied.has(posKey(tile.x + 2, tile.y + dy, tile.z)) ||
      occupied.has(posKey(tile.x + 1, tile.y + dy, tile.z))
    )) blockedRight = true;
  }

  return !blockedLeft || !blockedRight;
}

/**
 * O(N) convenience wrapper that builds the occupancy set internally.
 *
 * Use this in game-logic call sites that check a single tile against the
 * full board (e.g. `selectTile`, `getHint`). In tight loops that check
 * many tiles against the same board state, build the set once with
 * `buildOccupancySet` and call `isTileFreeWithSet` directly.
 */
export function isTileFree(tile: Tile, allTiles: readonly Tile[]): boolean {
  const occupied = buildOccupancySet(allTiles);
  // Exclude the tile itself so it does not block its own freedom check.
  occupied.delete(posKey(tile.x, tile.y, tile.z));
  return isTileFreeWithSet(tile, occupied);
}

// ---------------------------------------------------------------------------
// Batch operations (optimised for render path)
// ---------------------------------------------------------------------------

/**
 * Compute the complete set of free tile IDs in a single O(N) pass.
 *
 * Builds one occupancy set, then iterates tiles once — temporarily removing
 * each tile from the set before testing it and restoring it immediately after.
 * This avoids the O(N²) cost of calling `isTileFree` per tile naively.
 *
 * Used by MahjongBoard's `freeIds` useMemo on every state update.
 */
export function computeFreeIds(tiles: readonly Tile[]): Set<number> {
  const occupied = buildOccupancySet(tiles);
  const result   = new Set<number>();

  for (const tile of tiles) {
    if (tile.state !== 'idle') continue;

    const key = posKey(tile.x, tile.y, tile.z);
    occupied.delete(key);                           // exclude self
    if (isTileFreeWithSet(tile, occupied)) result.add(tile.id);
    occupied.add(key);                              // restore
  }

  return result;
}

/**
 * Returns true if at least one matching pair exists among currently free tiles.
 *
 * Also considers the selected tile as a potential first half of a pair —
 * a selected tile is still physically on the board and counts as a valid match
 * target for any free tile of the same type.
 *
 * Used for deadlock detection: when false, `reshuffleRemaining()` should fire.
 */
export function hasAvailableMoves(tiles: readonly Tile[]): boolean {
  const occupied   = buildOccupancySet(tiles);
  const seenTypes  = new Set<number>();

  const selected = tiles.find((t) => t.state === 'selected');
  if (selected) seenTypes.add(selected.type);

  for (const tile of tiles) {
    if (tile.state !== 'idle') continue;

    const key = posKey(tile.x, tile.y, tile.z);
    occupied.delete(key);
    const free = isTileFreeWithSet(tile, occupied);
    occupied.add(key);

    if (free) {
      if (seenTypes.has(tile.type)) return true;
      seenTypes.add(tile.type);
    }
  }

  return false;
}
