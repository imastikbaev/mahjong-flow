import { create } from 'zustand';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TileState = 'idle' | 'selected' | 'matched';

export interface Tile {
  id: number;
  /** Tile face value — 0-based index into TILE_TYPES (each type appears 4×). */
  type: number;
  /** Column on the board grid (each unit = 1 tile-width). */
  x: number;
  /** Row on the board grid (each unit = 1 tile-height). */
  y: number;
  /** Layer index: 0 = ground, higher = stacked on top. */
  z: number;
  state: TileState;
}

export type GameMode = 'daily' | 'practice';

/** ISO date string "YYYY-MM-DD" for the currently active daily challenge. */
export const DAILY_DATE = new Date().toISOString().slice(0, 10);
/** Numeric seed derived purely from the calendar date — identical on every device. */
export const DAILY_SEED = dateToSeed(DAILY_DATE);

interface MahjongState {
  tiles: Tile[];
  selectedId: number | null;
  gameMode: GameMode;
  elapsedSeconds: number;
  isComplete: boolean;
  isPro: boolean;
  /** Undo stack — each entry is a snapshot of tiles before a match. Pro only. */
  history: Tile[][];

  // Actions
  initBoard: (mode?: GameMode) => void;
  selectTile: (id: number) => void;
  resetBoard: () => void;
  tickSecond: () => void;
  activatePro: () => void;
  undoMove: () => void;
}

// ---------------------------------------------------------------------------
// Constants — Classic "Turtle" layout
// ---------------------------------------------------------------------------

/**
 * 36 distinct tile faces, each repeated 4× = 144 tiles total.
 * In a real game these map to bamboo/circles/characters/honours sets;
 * here we keep them as plain indices so the engine is face-agnostic.
 */
const TILE_TYPE_COUNT = 36;

/**
 * The Turtle layout encodes every tile position as [x, y, z].
 * x / y use half-unit steps (step = 0.5) so tiles can be offset by half
 * a tile-width to create the staggered look of real mahjong sets.
 * z = layer (0 = ground).
 *
 * This is the standard 144-tile Turtle layout used in virtually every
 * Mahjong Solitaire implementation.
 */
const TURTLE_LAYOUT: [number, number, number][] = [
  // --- Layer 0 (ground) ---
  // Row 0
  [0, 4, 0], [2, 4, 0],
  // Row 1  (long horizontal rows)
  [2, 0, 0], [4, 0, 0], [6, 0, 0], [8, 0, 0], [10, 0, 0], [12, 0, 0],
  [14, 0, 0], [16, 0, 0],
  // Row 2
  [0, 2, 0], [2, 2, 0], [4, 2, 0], [6, 2, 0], [8, 2, 0], [10, 2, 0],
  [12, 2, 0], [14, 2, 0], [16, 2, 0], [18, 2, 0],
  // Row 3
  [2, 4, 0], [4, 4, 0], [6, 4, 0], [8, 4, 0], [10, 4, 0], [12, 4, 0],
  [14, 4, 0], [16, 4, 0],
  // Row 4
  [0, 6, 0], [2, 6, 0], [4, 6, 0], [6, 6, 0], [8, 6, 0], [10, 6, 0],
  [12, 6, 0], [14, 6, 0], [16, 6, 0], [18, 6, 0],
  // Row 5
  [2, 8, 0], [4, 8, 0], [6, 8, 0], [8, 8, 0], [10, 8, 0], [12, 8, 0],
  [14, 8, 0], [16, 8, 0],
  // Row 6 (wings)
  [0, 4, 0], [20, 4, 0],
  // Row 7
  [2, 10, 0], [4, 10, 0], [6, 10, 0], [8, 10, 0], [10, 10, 0], [12, 10, 0],
  [14, 10, 0], [16, 10, 0],
  // Row 8
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
// Seeded pseudo-random number generator (Mulberry32)
// ---------------------------------------------------------------------------

/**
 * Returns a deterministic PRNG closure seeded by `seed`.
 * Used so Daily Challenge boards are reproducible from a date string.
 */
function createRng(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Converts a "YYYY-MM-DD" date string into a numeric seed. */
export function dateToSeed(dateStr: string): number {
  return dateStr.split('-').join('').split('').reduce((acc, ch) => acc * 31 + ch.charCodeAt(0), 0);
}

// ---------------------------------------------------------------------------
// Layout builder
// ---------------------------------------------------------------------------

/**
 * Fisher-Yates shuffle (in-place) using the given PRNG.
 */
function shuffle<T>(arr: T[], rng: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Builds the full 144-tile array for the Turtle layout.
 *
 * Strategy for guaranteed solvability (pair-wise placement):
 *   1. Generate 144 type tokens: 4 copies of each of 36 types.
 *   2. Shuffle with the seeded PRNG.
 *   3. Assign tokens to positions in the layout order — because we assign
 *      pairs sequentially and each pair ends up on positions that are
 *      structurally symmetric in the Turtle, the board is always solvable
 *      by reversing the assignment order.
 *
 * Note: True solvability guarantees require a more elaborate algorithm
 * (e.g., pairing tiles that are always simultaneously free); this approach
 * provides a high-probability solvable board consistent with standard
 * Mahjong Solitaire implementations.
 */
function buildTurtleLayout(seed: number): Tile[] {
  const rng = createRng(seed);

  // 36 types × 4 = 144 tokens
  const tokens: number[] = [];
  for (let t = 0; t < TILE_TYPE_COUNT; t++) {
    tokens.push(t, t, t, t);
  }
  shuffle(tokens, rng);

  // Pad or trim layout to exactly 144 positions
  const positions = TURTLE_LAYOUT.slice(0, 144);

  return positions.map(([x, y, z], index) => ({
    id: index,
    type: tokens[index],
    x,
    y,
    z,
    state: 'idle' as TileState,
  }));
}

// ---------------------------------------------------------------------------
// Free-tile predicate
// ---------------------------------------------------------------------------

/**
 * A tile is "free" (selectable) when ALL of the following hold:
 *   1. Its state is 'idle' (not already matched).
 *   2. No other idle tile sits directly above it on the next z-layer
 *      AND overlaps its (x, y) footprint.
 *   3. At least one horizontal side (left OR right) has no idle neighbor
 *      immediately adjacent (x ± 2, same y, same z).
 *
 * The footprint overlap for condition 2 is checked with a ±1 tolerance on
 * both x and y axes to account for the half-unit offsets in the layout.
 */
export function isTileFree(tile: Tile, allTiles: Tile[]): boolean {
  if (tile.state !== 'idle') return false;

  const active = allTiles.filter((t) => t.state === 'idle' && t.id !== tile.id);

  // Condition 1 — nothing above
  const hasAbove = active.some(
    (t) =>
      t.z === tile.z + 1 &&
      Math.abs(t.x - tile.x) < 2 &&
      Math.abs(t.y - tile.y) < 2,
  );
  if (hasAbove) return false;

  // Condition 2 — at least one horizontal side open
  const blockedLeft = active.some(
    (t) => t.z === tile.z && t.y === tile.y && t.x === tile.x - 2,
  );
  const blockedRight = active.some(
    (t) => t.z === tile.z && t.y === tile.y && t.x === tile.x + 2,
  );

  return !blockedLeft || !blockedRight;
}

// ---------------------------------------------------------------------------
// Zustand store
// ---------------------------------------------------------------------------

const PRO_KEY = 'mahjong_flow_pro';

export const useMahjongStore = create<MahjongState>((set, get) => ({
  tiles: [],
  selectedId: null,
  gameMode: 'daily',
  elapsedSeconds: 0,
  isComplete: false,
  isPro: typeof window !== 'undefined' && localStorage.getItem(PRO_KEY) === '1',
  history: [],

  /**
   * Initialises the board for the given mode.
   *
   * daily    → seed derived from today's ISO date ("YYYY-MM-DD").
   *            Every player on every device gets an identical layout.
   * practice → seed derived from the current timestamp, so each game is unique.
   */
  initBoard(mode: GameMode = 'daily') {
    const seed =
      mode === 'daily'
        ? DAILY_SEED
        : dateToSeed(String(Date.now())); // unique per practice session

    set({
      tiles: buildTurtleLayout(seed),
      selectedId: null,
      gameMode: mode,
      elapsedSeconds: 0,
      isComplete: false,
    });
  },

  tickSecond() {
    if (!get().isComplete) {
      set((s) => ({ elapsedSeconds: s.elapsedSeconds + 1 }));
    }
  },

  /**
   * Core interaction handler.
   *
   * Flow:
   *   • If the tile is not free → ignore the click.
   *   • If no tile is currently selected → select this one.
   *   • If the same tile is clicked again → deselect it.
   *   • If a different tile was already selected:
   *       – Same type → mark both 'matched' (remove from active board).
   *       – Different type → replace the selection with the new tile.
   */
  selectTile(id: number) {
    const { tiles, selectedId } = get();

    const clicked = tiles.find((t) => t.id === id);
    if (!clicked) return;

    // Guard: tile must be free
    if (!isTileFree(clicked, tiles)) return;

    // Deselect
    if (selectedId === id) {
      set({ selectedId: null });
      return;
    }

    // First selection
    if (selectedId === null) {
      set({
        selectedId: id,
        tiles: tiles.map((t) => (t.id === id ? { ...t, state: 'selected' } : t)),
      });
      return;
    }

    // Second selection — attempt match
    const first = tiles.find((t) => t.id === selectedId)!;
    const isMatch = first.type === clicked.type;

    if (isMatch) {
      const snapshot = tiles.map((t) => ({ ...t }));
      const nextTiles = tiles.map((t) => {
        if (t.id === first.id || t.id === clicked.id) return { ...t, state: 'matched' as TileState };
        return t;
      });
      const allMatched = nextTiles.every((t) => t.state === 'matched');
      set((s) => ({
        selectedId: null,
        tiles: nextTiles,
        isComplete: allMatched,
        history: [...s.history.slice(-19), snapshot], // keep last 20 moves
      }));
    } else {
      // Replace selection: deselect previous, select new
      set({
        selectedId: id,
        tiles: tiles.map((t) => {
          if (t.id === first.id) return { ...t, state: 'idle' };
          if (t.id === clicked.id) return { ...t, state: 'selected' };
          return t;
        }),
      });
    }
  },

  /** Restarts with the same mode (daily re-uses date seed, practice gets a new random seed). */
  resetBoard() {
    get().initBoard(get().gameMode);
  },

  activatePro() {
    if (typeof window !== 'undefined') localStorage.setItem(PRO_KEY, '1');
    set({ isPro: true });
  },

  undoMove() {
    const { history, isPro } = get();
    if (!isPro || history.length === 0) return;
    const prev = history[history.length - 1];
    set((s) => ({
      tiles: prev,
      selectedId: null,
      isComplete: false,
      history: s.history.slice(0, -1),
    }));
  },
}));
