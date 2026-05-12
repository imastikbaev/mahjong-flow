/**
 * 36 abstract geometric glyphs — heavy, angular, vibrant.
 * Grouped by visual weight so adjacent tile types read as distinct.
 */
export const TILE_SYMBOLS: string[] = [
  // Solid geometric (heavy presence)
  '▲', '▼', '◆', '●', '■', '▶', '◀', '▸', '◂',
  // Stars & sparks (high-energy)
  '✦', '✧', '❖', '✴', '❋', '✺', '✹', '✸', '✷',
  // Abstract / faceted
  '◈', '◉', '⬡', '⬟', '◮', '⬠', '◭', '⬣', '⟁',
  // Rings & halos (open, airy)
  '◎', '⊙', '⊛', '○', '◌', '⊚', '◍', '⊘', '⊗',
];

/**
 * Vibrant palette — maps 1-to-1 with tile types (0-35).
 * Pulls from teal, rose, yellow, fuchsia, cyan, violet, emerald,
 * orange, purple, lime, pink, sky — the full neon spectrum.
 */
export const TILE_COLORS: string[] = [
  // Teal / Turquoise (0-2)
  'text-teal-400',
  'text-teal-300',
  'text-teal-500',
  // Rose / Coral (3-5)
  'text-rose-400',
  'text-rose-300',
  'text-rose-500',
  // Yellow / Lemon (6-8)
  'text-yellow-300',
  'text-yellow-400',
  'text-yellow-200',
  // Fuchsia / Magenta (9-11)
  'text-fuchsia-400',
  'text-fuchsia-500',
  'text-fuchsia-300',
  // Cyan / Sky (12-14)
  'text-cyan-400',
  'text-sky-400',
  'text-cyan-300',
  // Violet / Indigo (15-17)
  'text-violet-400',
  'text-indigo-400',
  'text-violet-300',
  // Emerald / Green (18-20)
  'text-emerald-400',
  'text-emerald-300',
  'text-green-400',
  // Orange / Amber (21-23)
  'text-orange-400',
  'text-orange-300',
  'text-amber-400',
  // Purple (24-26)
  'text-purple-400',
  'text-purple-300',
  'text-purple-500',
  // Lime (27-29)
  'text-lime-400',
  'text-lime-300',
  'text-lime-500',
  // Pink (30-32)
  'text-pink-400',
  'text-pink-300',
  'text-pink-500',
  // Accent wrap-around (33-35)
  'text-cyan-500',
  'text-sky-300',
  'text-rose-400',
];
