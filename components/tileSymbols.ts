/**
 * 36 abstract symbols mapped to tile type indices.
 *
 * Grouped conceptually but rendered as pure glyphs — no dragons, no kanji.
 * We use geometric shapes, arrows, and minimal Unicode to keep the Zen aesthetic.
 */
export const TILE_SYMBOLS: string[] = [
  // Circles (0-8)
  '◎', '○', '●', '◉', '⊙', '◌', '◍', '◎', '⊚',
  // Lines / grids (9-17)
  '▪', '▫', '▬', '▭', '▮', '▯', '▰', '▱', '▲',
  // Arrows / flow (18-26)
  '→', '←', '↑', '↓', '↗', '↙', '↔', '↕', '⇌',
  // Minimal nature (27-35)
  '◇', '◆', '△', '▽', '◁', '▷', '✦', '✧', '⬡',
];

/**
 * Pastel hue per tile type — cycles through 6 palette groups
 * so nearby types get distinct-enough colours without being garish.
 */
export const TILE_COLORS: string[] = [
  'text-rose-400',      // 0
  'text-orange-400',    // 1
  'text-amber-400',     // 2
  'text-lime-500',      // 3
  'text-emerald-400',   // 4
  'text-teal-400',      // 5
  'text-cyan-400',      // 6
  'text-sky-400',       // 7
  'text-indigo-400',    // 8
  'text-violet-400',    // 9
  'text-purple-400',    // 10
  'text-pink-400',      // 11
  'text-rose-300',      // 12
  'text-orange-300',    // 13
  'text-amber-300',     // 14
  'text-lime-400',      // 15
  'text-emerald-300',   // 16
  'text-teal-300',      // 17
  'text-cyan-300',      // 18
  'text-sky-300',       // 19
  'text-indigo-300',    // 20
  'text-violet-300',    // 21
  'text-purple-300',    // 22
  'text-pink-300',      // 23
  'text-rose-500',      // 24
  'text-orange-500',    // 25
  'text-amber-500',     // 26
  'text-lime-600',      // 27
  'text-emerald-500',   // 28
  'text-teal-500',      // 29
  'text-cyan-500',      // 30
  'text-sky-500',       // 31
  'text-indigo-500',    // 32
  'text-violet-500',    // 33
  'text-purple-500',    // 34
  'text-pink-500',      // 35
];
