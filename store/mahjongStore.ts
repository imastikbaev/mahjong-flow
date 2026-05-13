import { create } from 'zustand';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TileState  = 'idle' | 'selected' | 'matched';
export type GameMode   = 'daily' | 'practice';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type Skin       = 'classic' | 'pro';

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
  skin: Skin;
  elapsedSeconds: number;
  isComplete: boolean;
  isPro: boolean;
  history: Tile[][];
  hintedId: number | null;
  sprintMode: boolean;
  sprintSecondsLeft: number;
  isFailed: boolean;

  initBoard: (mode?: GameMode) => void;
  selectTile: (id: number) => void;
  resetBoard: () => void;
  tickSecond: () => void;
  activatePro: () => void;
  deactivatePro: () => void;
  undoMove: () => void;
  setDifficulty: (d: Difficulty) => void;
  setSkin: (skin: Skin) => void;
  getHint: () => void;
  reshuffleRemaining: () => void;
  setGameMode: (mode: GameMode) => void;
  setSprintMode: (on: boolean) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TILE_TYPE_COUNT = 36;

const TURTLE_LAYOUT: [number, number, number][] = (() => {
  const t: [number, number, number][] = [];
  // Layer 0 — 8×8 base (64) + 8 wing tiles = 72
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
// Free-tile predicate (exported for AI coach + board component)
// ---------------------------------------------------------------------------

export function isTileFree(tile: Tile, allTiles: Tile[]): boolean {
  if (tile.state !== 'idle') return false;
  // Both 'idle' and 'selected' tiles are physically on the board and must block neighbours.
  // Only 'matched' tiles have been removed.
  const active = allTiles.filter((t) => t.state !== 'matched' && t.id !== tile.id);

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

  // A selected tile is still on the board — if a free tile shares its type, that IS a move.
  const selectedTile = tiles.find((t) => t.state === 'selected');
  if (selectedTile) seen.add(selectedTile.type);

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
  tiles:             [],
  selectedId:        null,
  gameMode:          'daily',
  difficulty:        'easy',
  skin:              'classic',
  elapsedSeconds:    0,
  isComplete:        false,
  isPro:             typeof window !== 'undefined' && localStorage.getItem(PRO_KEY) === '1',
  history:           [],
  hintedId:          null,
  sprintMode:        false,
  sprintSecondsLeft: 180,
  isFailed:          false,

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

    set({ tiles, selectedId: null, gameMode: mode, elapsedSeconds: 0, isComplete: false, history: [], hintedId: null, isFailed: false, sprintSecondsLeft: 180 });
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

    // Treat 'selected' as 'idle' for the reshuffle — deselect before everything.
    const normalised = tiles.map((t) =>
      t.state === 'selected' ? { ...t, state: 'idle' as TileState } : t,
    );
    const idleTiles = normalised.filter((t) => t.state === 'idle');
    if (idleTiles.length < 2) return;

    // Mix Date.now with Math.random for enough entropy between rapid calls
    const rng = createRng((Date.now() ^ (Math.random() * 0xffffffff | 0)) >>> 0);

    // Helper: pure type-shuffle (hard mode and fallback)
    const pureShuffle = () => {
      const types = idleTiles.map((t) => t.type);
      for (let i = types.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [types[i], types[j]] = [types[j], types[i]];
      }
      let idx = 0;
      set({
        tiles: normalised.map((t) => (t.state === 'idle' ? { ...t, type: types[idx++] } : t)),
        selectedId: null,
        hintedId:   null,
      });
    };

    if (difficulty === 'hard') { pureShuffle(); return; }

    // Easy / Medium — two-phase solvable reshuffle.
    // Use normalised so the selected tile is treated as idle in the simulation.
    let simTiles = normalised.map((t) => ({ ...t }));
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

    // If Phase 1 failed to find any pairs, fall back to pure shuffle
    if (pairOrder.length === 0) { pureShuffle(); return; }

    // Assign types: cycle through type range so each type appears evenly
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
      selectedId: null,
      hintedId:   null,
    });
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

  setGameMode(mode: GameMode) {
    get().initBoard(mode);
  },

  setSprintMode(on: boolean) {
    set({ sprintMode: on, sprintSecondsLeft: 180, isFailed: false });
    if (on) get().initBoard('practice');
  },
}));
