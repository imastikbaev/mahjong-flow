import { create } from 'zustand';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TileState  = 'idle' | 'selected' | 'matched';
export type GameMode   = 'daily' | 'practice';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Tile {
  id: number;
  type: number;
  x: number;
  y: number;
  z: number;
  state: TileState;
}

export const DAILY_DATE = new Date().toISOString().slice(0, 10);
export const DAILY_SEED = dateToSeed(DAILY_DATE);

interface MahjongState {
  tiles: Tile[];
  selectedId: number | null;
  gameMode: GameMode;
  difficulty: Difficulty;
  elapsedSeconds: number;
  isComplete: boolean;
  isPro: boolean;
  history: Tile[][];
  hintedId: number | null;

  initBoard: (mode?: GameMode) => void;
  selectTile: (id: number) => void;
  resetBoard: () => void;
  tickSecond: () => void;
  activatePro: () => void;
  deactivatePro: () => void;
  undoMove: () => void;
  setDifficulty: (d: Difficulty) => void;
  getHint: () => void;
  reshuffleRemaining: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TILE_TYPE_COUNT = 36;

const TURTLE_LAYOUT: [number, number, number][] = [
  // --- Layer 0 (ground) ---
  [0, 4, 0], [2, 4, 0],
  [2, 0, 0], [4, 0, 0], [6, 0, 0], [8, 0, 0], [10, 0, 0], [12, 0, 0],
  [14, 0, 0], [16, 0, 0],
  [0, 2, 0], [2, 2, 0], [4, 2, 0], [6, 2, 0], [8, 2, 0], [10, 2, 0],
  [12, 2, 0], [14, 2, 0], [16, 2, 0], [18, 2, 0],
  [2, 4, 0], [4, 4, 0], [6, 4, 0], [8, 4, 0], [10, 4, 0], [12, 4, 0],
  [14, 4, 0], [16, 4, 0],
  [0, 6, 0], [2, 6, 0], [4, 6, 0], [6, 6, 0], [8, 6, 0], [10, 6, 0],
  [12, 6, 0], [14, 6, 0], [16, 6, 0], [18, 6, 0],
  [2, 8, 0], [4, 8, 0], [6, 8, 0], [8, 8, 0], [10, 8, 0], [12, 8, 0],
  [14, 8, 0], [16, 8, 0],
  [0, 4, 0], [20, 4, 0],
  [2, 10, 0], [4, 10, 0], [6, 10, 0], [8, 10, 0], [10, 10, 0], [12, 10, 0],
  [14, 10, 0], [16, 10, 0],
  [0, 8, 0], [2, 8, 0], [4, 8, 0], [6, 8, 0], [8, 8, 0], [10, 8, 0],
  [12, 8, 0], [14, 8, 0], [16, 8, 0], [18, 8, 0],
  // --- Layer 1 ---
  [4, 2, 1], [6, 2, 1], [8, 2, 1], [10, 2, 1], [12, 2, 1], [14, 2, 1],
  [4, 4, 1], [6, 4, 1], [8, 4, 1], [10, 4, 1], [12, 4, 1], [14, 4, 1],
  [4, 6, 1], [6, 6, 1], [8, 6, 1], [10, 6, 1], [12, 6, 1], [14, 6, 1],
  [4, 8, 1], [6, 8, 1], [8, 8, 1], [10, 8, 1], [12, 8, 1], [14, 8, 1],
  // --- Layer 2 ---
  [6, 4, 2], [8, 4, 2], [10, 4, 2], [12, 4, 2],
  [6, 6, 2], [8, 6, 2], [10, 6, 2], [12, 6, 2],
  // --- Layer 3 ---
  [8, 4, 3], [10, 4, 3],
  [8, 6, 3], [10, 6, 3],
  // --- Layer 4 (apex) ---
  [9, 5, 4],
];

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
// Free-tile predicate (exported for AI coach + board component)
// ---------------------------------------------------------------------------

export function isTileFree(tile: Tile, allTiles: Tile[]): boolean {
  if (tile.state !== 'idle') return false;
  const active = allTiles.filter((t) => t.state === 'idle' && t.id !== tile.id);

  const hasAbove = active.some(
    (t) =>
      t.z === tile.z + 1 &&
      Math.abs(t.x - tile.x) < 2 &&
      Math.abs(t.y - tile.y) < 2,
  );
  if (hasAbove) return false;

  const blockedLeft  = active.some((t) => t.z === tile.z && t.y === tile.y && t.x === tile.x - 2);
  const blockedRight = active.some((t) => t.z === tile.z && t.y === tile.y && t.x === tile.x + 2);
  return !blockedLeft || !blockedRight;
}

/**
 * Returns true if at least one matching pair exists among currently free tiles.
 * Used for deadlock detection — when false, reshuffleRemaining() should be offered.
 */
export function hasAvailableMoves(tiles: Tile[]): boolean {
  const free = tiles.filter((t) => isTileFree(t, tiles));
  const seen = new Set<number>();
  for (const t of free) {
    if (seen.has(t.type)) return true;
    seen.add(t.type);
  }
  return false;
}

// ---------------------------------------------------------------------------
// Board generators
// ---------------------------------------------------------------------------

/**
 * Guaranteed-solvable layout.
 *
 * Phase 1 — simulate a full solve: repeatedly pick two random free tiles
 * and "remove" them, recording each pair. This gives a valid removal order.
 *
 * Phase 2 — assign types: each pair in the removal order receives a type
 * drawn from a shuffled pool, so matching tiles are always reachable.
 *
 * typeCount controls variety:
 *   36 (easy)   → full variety, each type appears in exactly 2 pairs
 *   18 (medium) → half variety, each type appears in 4 pairs → more visible matches
 */
function buildSolvableLayout(seed: number, typeCount = TILE_TYPE_COUNT): Tile[] {
  const rng       = createRng(seed);
  const positions = TURTLE_LAYOUT.slice(0, 144);

  // Phase 1 — simulate solve
  let simTiles: Tile[] = positions.map(([x, y, z], index) => ({
    id: index, type: 0, x, y, z, state: 'idle' as TileState,
  }));

  const pairOrder: [number, number][] = [];

  while (true) {
    const free = simTiles.filter((t) => isTileFree(t, simTiles));
    if (free.length < 2) break;

    const pool = [...free];
    const a    = pool.splice(Math.floor(rng() * pool.length), 1)[0];
    const b    = pool[Math.floor(rng() * pool.length)];

    pairOrder.push([a.id, b.id]);
    simTiles = simTiles.map((t) =>
      t.id === a.id || t.id === b.id ? { ...t, state: 'matched' as TileState } : t,
    );
  }

  // Phase 2 — assign types
  const pairsPerType = Math.round(144 / typeCount / 2);
  const pairTypes: number[] = [];
  for (let t = 0; t < typeCount; t++) {
    for (let p = 0; p < pairsPerType; p++) pairTypes.push(t);
  }
  shuffle(pairTypes, rng);

  const typeMap = new Map<number, number>();
  pairOrder.forEach(([id1, id2], idx) => {
    const type = pairTypes[idx] ?? idx % typeCount;
    typeMap.set(id1, type);
    typeMap.set(id2, type);
  });

  return positions.map(([x, y, z], index) => ({
    id: index,
    type: typeMap.get(index) ?? 0,
    x, y, z,
    state: 'idle' as TileState,
  }));
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

const PRO_KEY = 'mahjong_flow_pro';

export const useMahjongStore = create<MahjongState>((set, get) => ({
  tiles:          [],
  selectedId:     null,
  gameMode:       'daily',
  difficulty:     'easy',
  elapsedSeconds: 0,
  isComplete:     false,
  isPro:          typeof window !== 'undefined' && localStorage.getItem(PRO_KEY) === '1',
  history:        [],
  hintedId:       null,

  initBoard(mode: GameMode = get().gameMode ?? 'daily') {
    const { difficulty } = get();
    const seed =
      mode === 'daily'
        ? DAILY_SEED
        : dateToSeed(String(Date.now()));

    const tiles =
      difficulty === 'hard'
        ? buildShuffledLayout(seed)
        : buildSolvableLayout(seed, difficulty === 'medium' ? 18 : TILE_TYPE_COUNT);

    set({ tiles, selectedId: null, gameMode: mode, elapsedSeconds: 0, isComplete: false, history: [], hintedId: null });
  },

  tickSecond() {
    if (!get().isComplete) set((s) => ({ elapsedSeconds: s.elapsedSeconds + 1 }));
  },

  selectTile(id: number) {
    const { tiles, selectedId } = get();
    const clicked = tiles.find((t) => t.id === id);
    if (!clicked) return;
    if (!isTileFree(clicked, tiles)) return;

    // Always clear hint on any interaction
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

  activatePro() {
    if (typeof window !== 'undefined') localStorage.setItem(PRO_KEY, '1');
    set({ isPro: true });
  },

  deactivatePro() {
    if (typeof window !== 'undefined') localStorage.removeItem(PRO_KEY);
    set({ isPro: false, history: [] });
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

  reshuffleRemaining() {
    const { tiles } = get();
    const idleTiles = tiles.filter((t) => t.state === 'idle');
    if (idleTiles.length === 0) return;

    // Extract types and shuffle with Math.random (in-session, not seed-based)
    const types = idleTiles.map((t) => t.type);
    for (let i = types.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [types[i], types[j]] = [types[j], types[i]];
    }

    // Re-assign shuffled types back to the same positions
    let idx = 0;
    const newTiles = tiles.map((t) =>
      t.state === 'idle' ? { ...t, type: types[idx++] } : t,
    );

    set({ tiles: newTiles, selectedId: null, hintedId: null });
  },

  getHint() {
    const { tiles, hintedId } = get();

    // Toggle off if already showing
    if (hintedId !== null) { set({ hintedId: null }); return; }

    const free = tiles.filter((t) => isTileFree(t, tiles));

    // Group free tiles by type
    const byType = new Map<number, number[]>();
    for (const t of free) {
      const ids = byType.get(t.type) ?? [];
      ids.push(t.id);
      byType.set(t.type, ids);
    }

    // Pick the first type that has a free pair
    for (const ids of byType.values()) {
      if (ids.length >= 2) {
        set({ hintedId: ids[0] });
        return;
      }
    }
    // No free pairs available (deadlock) — do nothing
  },
}));
