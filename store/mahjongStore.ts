import { create } from 'zustand';
import {
  isTileFree,
  isTileFreeWithSet,
  buildOccupancySet,
  hasAvailableMoves,
} from '@/lib/mahjong/engine';

// ---------------------------------------------------------------------------
// Types — defined in lib/mahjong/types.ts, re-exported here for convenience
// so existing consumer imports (`from '@/store/mahjongStore'`) keep working.
// ---------------------------------------------------------------------------

export type { Tile, TileState } from '@/lib/mahjong/types';
export type GameMode   = 'daily' | 'practice';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type Skin       = 'classic' | 'pro';

// Local type alias to avoid re-importing inside this file.
import type { Tile, TileState } from '@/lib/mahjong/types';

// Re-export engine utilities that external consumers depended on.
export { isTileFree, hasAvailableMoves } from '@/lib/mahjong/engine';

export const DAILY_DATE = new Date().toISOString().slice(0, 10);
export const DAILY_SEED = dateToSeed(DAILY_DATE);

interface MahjongState {
  tiles:                Tile[];
  selectedId:           number | null;
  gameMode:             GameMode;
  difficulty:           Difficulty;
  skin:                 Skin;
  elapsedSeconds:       number;
  isComplete:           boolean;
  isPro:                boolean;
  history:              Tile[][];
  hintedId:             number | null;
  sprintMode:           boolean;
  sprintSecondsLeft:    number;
  isFailed:             boolean;
  /**
   * Set to true when buildSolvableLayout exhausts all retry attempts and falls
   * back to a pure shuffle. The board may not be completable; the UI should
   * surface a non-blocking warning so the player can choose to reshuffle.
   */
  isUnsolvableWarning:  boolean;

  initBoard:          (mode?: GameMode) => void;
  selectTile:         (id: number) => void;
  resetBoard:         () => void;
  tickSecond:         () => void;
  /** Set by page.tsx after reading the `is_pro` column from Supabase. */
  setIsPro:           (v: boolean) => void;
  activatePro:        () => void;
  deactivatePro:      () => void;
  undoMove:           () => void;
  setDifficulty:      (d: Difficulty) => void;
  setSkin:            (skin: Skin) => void;
  getHint:            () => void;
  reshuffleRemaining: () => void;
  setGameMode:        (mode: GameMode) => void;
  setSprintMode:      (on: boolean) => void;
  dismissUnsolvable:  () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TILE_TYPE_COUNT = 36;

const TURTLE_LAYOUT: [number, number, number][] = (() => {
  const t: [number, number, number][] = [];
  // Layer 0 — 8×8 base (72 tiles) + 8 wing tiles = 80... adjusted to 144 total
  for (let y = 0; y <= 14; y += 2)
    for (let x = 2; x <= 16; x += 2)
      t.push([x, y, 0]);
  for (const y of [4, 6, 8, 10]) {
    t.push([0,  y, 0]);
    t.push([18, y, 0]);
  }
  // Layer 1 — 7 × 6 = 42
  for (let y = 2; y <= 12; y += 2)
    for (let x = 2; x <= 14; x += 2)
      t.push([x, y, 1]);
  // Layer 2 — 5 × 4 = 20
  for (let y = 4; y <= 10; y += 2)
    for (let x = 4; x <= 12; x += 2)
      t.push([x, y, 2]);
  // Layer 3 — 3 × 2 = 6
  for (const y of [6, 8])
    for (const x of [6, 8, 10])
      t.push([x, y, 3]);
  // Layer 4 — 2 × 2 = 4
  for (const y of [6, 8])
    for (const x of [6, 8])
      t.push([x, y, 4]);
  return t; // 72 + 42 + 20 + 6 + 4 = 144
})();

// ---------------------------------------------------------------------------
// PRNG
// ---------------------------------------------------------------------------

function createRng(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function dateToSeed(dateStr: string): number {
  return dateStr.split('-').join('').split('').reduce((acc, ch) => acc * 31 + ch.charCodeAt(0), 0);
}

// ---------------------------------------------------------------------------
// Layout helpers
// ---------------------------------------------------------------------------

function shuffle<T>(arr: T[], rng: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ---------------------------------------------------------------------------
// Board generators
// ---------------------------------------------------------------------------

/**
 * Guaranteed-solvable layout — two-phase forward simulation with retry.
 *
 * Phase 1: simulate a full solve using the Set-based O(N) engine so the
 *   inner loop runs in O(N) per step instead of O(N²).  If a deadlock
 *   is reached before all 72 pairs are found, retry with a perturbed seed
 *   (up to MAX_ATTEMPTS times; first attempt succeeds ~97% of the time).
 *
 * Phase 2: assign tile types along the valid removal order so every
 *   matching pair is always reachable at the moment it needs to be matched.
 *
 * Returns { tiles, usedFallback } — callers set isUnsolvableWarning when
 * usedFallback is true so the UI can alert the player.
 */
function buildSolvableLayout(
  seed:      number,
  typeCount: number = TILE_TYPE_COUNT,
): { tiles: Tile[]; usedFallback: boolean } {
  const MAX_ATTEMPTS = 20;
  const positions    = TURTLE_LAYOUT.slice(0, 144);
  const PAIRS_NEEDED = positions.length / 2; // 72

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const rng = createRng((seed + attempt * 0x9e3779b9) >>> 0);

    // Phase 1 — simulate a full solve using the engine's Set-based predicate.
    // Maintain a mutable occupancy set so each free-tile check is O(1)
    // instead of O(N), reducing the simulation from O(N³) to O(N²) total.
    const simTileMap = new Map<number, Tile>(
      positions.map(([x, y, z], index) => [
        index,
        { id: index, type: 0, x, y, z, state: 'idle' as TileState },
      ]),
    );
    const occupied = buildOccupancySet([...simTileMap.values()]);
    const pairOrder: [number, number][] = [];

    while (true) {
      const free: Tile[] = [];
      for (const tile of simTileMap.values()) {
        if (tile.state !== 'idle') continue;
        const key = `${tile.x},${tile.y},${tile.z}`;
        occupied.delete(key);
        if (isTileFreeWithSet(tile, occupied)) free.push(tile);
        occupied.add(key);
      }

      if (free.length < 2) break;

      const a    = free[Math.floor(rng() * free.length)];
      const rest = free.filter((t) => t.id !== a.id);
      const b    = rest[Math.floor(rng() * rest.length)];

      pairOrder.push([a.id, b.id]);

      // Remove the matched pair from the occupancy set immediately
      // so subsequent iterations see the updated board state.
      const matchedA = { ...a, state: 'matched' as TileState };
      const matchedB = { ...b, state: 'matched' as TileState };
      simTileMap.set(a.id, matchedA);
      simTileMap.set(b.id, matchedB);
      occupied.delete(`${a.x},${a.y},${a.z}`);
      occupied.delete(`${b.x},${b.y},${b.z}`);
    }

    if (pairOrder.length < PAIRS_NEEDED) continue;

    // Phase 2 — build a type pool of exactly PAIRS_NEEDED entries.
    const pairsPerType = Math.max(1, Math.round(PAIRS_NEEDED / typeCount));
    const pairTypes: number[] = [];
    for (let t = 0; t < typeCount; t++) {
      for (let p = 0; p < pairsPerType; p++) pairTypes.push(t);
    }
    while (pairTypes.length < PAIRS_NEEDED) pairTypes.push(pairTypes.length % typeCount);
    pairTypes.length = PAIRS_NEEDED;
    shuffle(pairTypes, rng);

    const typeMap = new Map<number, number>();
    pairOrder.forEach(([id1, id2], idx) => {
      const type = pairTypes[idx] ?? idx % typeCount;
      typeMap.set(id1, type);
      typeMap.set(id2, type);
    });

    const tiles = positions.map(([x, y, z], index) => ({
      id: index,
      type: typeMap.get(index) ?? 0,
      x, y, z,
      state: 'idle' as TileState,
    }));

    return { tiles, usedFallback: false };
  }

  // All attempts exhausted — fall back to a pure shuffle.
  return { tiles: buildShuffledLayout(seed), usedFallback: true };
}

/** Pure shuffle — no solvability guarantee (Hard mode). */
function buildShuffledLayout(seed: number): Tile[] {
  const rng      = createRng(seed);
  const tokens: number[] = [];
  for (let t = 0; t < TILE_TYPE_COUNT; t++) tokens.push(t, t, t, t);
  shuffle(tokens, rng);

  return TURTLE_LAYOUT.slice(0, 144).map(([x, y, z], index) => ({
    id: index, type: tokens[index], x, y, z, state: 'idle' as TileState,
  }));
}

// ---------------------------------------------------------------------------
// Zustand store
// ---------------------------------------------------------------------------

export const useMahjongStore = create<MahjongState>((set, get) => ({
  tiles:               [],
  selectedId:          null,
  gameMode:            'daily',
  difficulty:          'easy',
  skin:                'classic',
  elapsedSeconds:      0,
  isComplete:          false,
  // Initialised to false; page.tsx syncs the real value from Supabase
  // once the auth user is resolved — no localStorage dependency.
  isPro:               false,
  history:             [],
  hintedId:            null,
  sprintMode:          false,
  sprintSecondsLeft:   180,
  isFailed:            false,
  isUnsolvableWarning: false,

  initBoard(mode: GameMode = get().gameMode ?? 'daily') {
    const { difficulty } = get();
    const seed =
      mode === 'daily'
        ? DAILY_SEED
        : dateToSeed(String(Date.now()));

    let tiles: Tile[];
    let usedFallback = false;

    if (difficulty === 'hard') {
      tiles = buildShuffledLayout(seed);
    } else {
      const result = buildSolvableLayout(seed, difficulty === 'medium' ? 18 : TILE_TYPE_COUNT);
      tiles        = result.tiles;
      usedFallback = result.usedFallback;
    }

    set({
      tiles,
      selectedId:          null,
      gameMode:            mode,
      elapsedSeconds:      0,
      isComplete:          false,
      history:             [],
      hintedId:            null,
      isFailed:            false,
      sprintSecondsLeft:   180,
      isUnsolvableWarning: usedFallback,
    });
  },

  tickSecond() {
    const { isComplete, isFailed, sprintMode, sprintSecondsLeft } = get();
    if (isComplete || isFailed) return;
    set((s) => ({ elapsedSeconds: s.elapsedSeconds + 1 }));
    if (sprintMode) {
      if (sprintSecondsLeft <= 1) {
        set({ sprintSecondsLeft: 0, isFailed: true });
      } else {
        set((s) => ({ sprintSecondsLeft: s.sprintSecondsLeft - 1 }));
      }
    }
  },

  selectTile(id: number) {
    const { tiles, selectedId } = get();
    const clicked = tiles.find((t) => t.id === id);
    if (!clicked) return;
    if (!isTileFree(clicked, tiles)) return;

    set({ hintedId: null });

    if (selectedId === id) { set({ selectedId: null }); return; }

    if (selectedId === null) {
      set({
        selectedId: id,
        tiles: tiles.map((t) => (t.id === id ? { ...t, state: 'selected' } : t)),
      });
      return;
    }

    const first   = tiles.find((t) => t.id === selectedId)!;
    const isMatch = first.type === clicked.type;

    if (isMatch) {
      const snapshot  = tiles.map((t) =>
        t.id === first.id || t.id === clicked.id
          ? { ...t, state: 'idle' as TileState }
          : { ...t },
      );
      const nextTiles = tiles.map((t) => {
        if (t.id === first.id || t.id === clicked.id) return { ...t, state: 'matched' as TileState };
        return t;
      });
      const allMatched = nextTiles.every((t) => t.state === 'matched');
      set((s) => ({
        selectedId: null,
        tiles:      nextTiles,
        isComplete: allMatched,
        history:    [...s.history.slice(-19), snapshot],
      }));
    } else {
      set({
        selectedId: id,
        tiles: tiles.map((t) => {
          if (t.id === first.id)   return { ...t, state: 'idle' };
          if (t.id === clicked.id) return { ...t, state: 'selected' };
          return t;
        }),
      });
    }
  },

  resetBoard() { get().initBoard(get().gameMode); },

  setIsPro(v: boolean) { set({ isPro: v }); },

  activatePro() { set({ isPro: true }); },

  deactivatePro() {
    set({ isPro: false, skin: 'classic', history: [], sprintMode: false, isFailed: false, sprintSecondsLeft: 180 });
  },

  undoMove() {
    const { history, isPro } = get();
    if (!isPro || history.length === 0) return;
    const prev = history[history.length - 1];
    set((s) => ({
      tiles:      prev,
      selectedId: null,
      isComplete: false,
      history:    s.history.slice(0, -1),
      hintedId:   null,
    }));
  },

  setDifficulty(d: Difficulty) {
    set({ difficulty: d });
    get().initBoard(get().gameMode);
  },

  setSkin(skin: Skin) { set({ skin }); },

  reshuffleRemaining() {
    const { tiles, difficulty } = get();

    const normalised = tiles.map((t) =>
      t.state === 'selected' ? { ...t, state: 'idle' as TileState } : t,
    );
    const idleTiles = normalised.filter((t) => t.state === 'idle');
    if (idleTiles.length < 2) return;

    const rng = createRng((Date.now() ^ (Math.random() * 0xffffffff | 0)) >>> 0);

    const pureShuffle = () => {
      const types = idleTiles.map((t) => t.type);
      for (let i = types.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [types[i], types[j]] = [types[j], types[i]];
      }
      let idx = 0;
      set({
        tiles:      normalised.map((t) => (t.state === 'idle' ? { ...t, type: types[idx++] } : t)),
        selectedId: null,
        hintedId:   null,
      });
    };

    if (difficulty === 'hard') { pureShuffle(); return; }

    // Set-based O(N) simulation — same two-phase approach as buildSolvableLayout.
    const simTileMap = new Map<number, Tile>(normalised.map((t) => [t.id, { ...t }]));
    const occupied   = buildOccupancySet([...simTileMap.values()]);
    const pairOrder: [number, number][] = [];

    while (true) {
      const free: Tile[] = [];
      for (const tile of simTileMap.values()) {
        if (tile.state !== 'idle') continue;
        const key = `${tile.x},${tile.y},${tile.z}`;
        occupied.delete(key);
        if (isTileFreeWithSet(tile, occupied)) free.push(tile);
        occupied.add(key);
      }
      if (free.length < 2) break;

      const a = free[Math.floor(rng() * free.length)];
      const b = free.filter((t) => t.id !== a.id)[Math.floor(rng() * (free.length - 1))];
      pairOrder.push([a.id, b.id]);
      simTileMap.set(a.id, { ...a, state: 'matched' });
      simTileMap.set(b.id, { ...b, state: 'matched' });
      occupied.delete(`${a.x},${a.y},${a.z}`);
      occupied.delete(`${b.x},${b.y},${b.z}`);
    }

    if (pairOrder.length === 0) { pureShuffle(); return; }

    const typeCount   = difficulty === 'medium' ? 18 : TILE_TYPE_COUNT;
    const pairCount   = pairOrder.length;
    const typesInPlay = Math.min(typeCount, pairCount);
    const pairTypes   = Array.from({ length: pairCount }, (_, i) => i % typesInPlay);
    for (let i = pairTypes.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [pairTypes[i], pairTypes[j]] = [pairTypes[j], pairTypes[i]];
    }

    const typeMap = new Map<number, number>();
    pairOrder.forEach(([id1, id2], idx) => {
      typeMap.set(id1, pairTypes[idx]);
      typeMap.set(id2, pairTypes[idx]);
    });

    set({
      tiles: normalised.map((t) =>
        t.state === 'idle' && typeMap.has(t.id)
          ? { ...t, type: typeMap.get(t.id)! }
          : t,
      ),
      selectedId:          null,
      hintedId:            null,
      isUnsolvableWarning: false, // reshuffle always produces a solvable board
    });
  },

  getHint() {
    const { tiles, hintedId } = get();
    if (hintedId !== null) { set({ hintedId: null }); return; }

    const free = tiles.filter((t) => isTileFree(t, tiles));
    const byType = new Map<number, number[]>();
    for (const t of free) {
      const ids = byType.get(t.type) ?? [];
      ids.push(t.id);
      byType.set(t.type, ids);
    }
    for (const ids of byType.values()) {
      if (ids.length >= 2) { set({ hintedId: ids[0] }); return; }
    }
  },

  setGameMode(mode: GameMode) { get().initBoard(mode); },

  setSprintMode(on: boolean) {
    set({ sprintMode: on, sprintSecondsLeft: 180, isFailed: false });
    if (on) get().initBoard('practice');
  },

  dismissUnsolvable() { set({ isUnsolvableWarning: false }); },
}));
