/**
 * 36 ultra-minimal geometric glyphs — weight and shape vary,
 * colour does not. Monochrome identity through form, not hue.
 */
export const TILE_SYMBOLS: string[] = [
  // Micro punctuation / dots
  '·', '◦', '∘', '•', '⊙', '◎', '○', '◌', '⊚',
  // Thin lines & crosses
  '—', '/', '×', '+', '≡', '∷', '∶', '⟐', '⟁',
  // Open geometry
  '□', '△', '◇', '▷', '◁', '▽', '⬡', '⬟', '◈',
  // Filled / partial fills
  '▫', '▴', '◆', '▸', '▾', '▿', '◂', '⊕', '⊠',
];

/**
 * Monochromatic — all tiles share the same neutral-400 base.
 * TileCell overrides to text-white on selected state.
 * Keeping this array lets callers stay structurally consistent
 * without a code change if per-type colour is ever re-introduced.
 */
export const TILE_COLORS: string[] = Array(36).fill('text-neutral-400');
