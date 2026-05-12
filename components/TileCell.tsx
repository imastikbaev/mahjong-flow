'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Tile } from '@/store/mahjongStore';
import { TILE_SYMBOLS } from './tileSymbols';

// ---------------------------------------------------------------------------
// Layout constants — UNCHANGED (game logic depends on these)
// ---------------------------------------------------------------------------

export const TILE_W       = 52;
export const TILE_H       = 56;
export const STEP_X       = TILE_W / 2;
export const STEP_Y       = TILE_H / 2;
export const LAYER_OFFSET = 4;

// ---------------------------------------------------------------------------
// Depth shadow — soft drop-shadow scales with z, no thick borders
// ---------------------------------------------------------------------------

function depthShadow(z: number): string {
  // Progressively deeper shadow as tiles stack higher.
  // All values use rgba(0,0,0,…) so they stay neutral and never tint.
  const shadows: string[] = [
    '0 2px 8px rgba(0,0,0,0.55), 0 1px 2px rgba(0,0,0,0.3)',           // z=0
    '0 4px 16px rgba(0,0,0,0.65), 0 2px 4px rgba(0,0,0,0.35)',          // z=1
    '0 8px 24px rgba(0,0,0,0.72), 0 3px 6px rgba(0,0,0,0.4)',           // z=2
    '0 12px 36px rgba(0,0,0,0.80), 0 4px 8px rgba(0,0,0,0.45)',         // z=3
    '0 16px 48px rgba(0,0,0,0.85), 0 6px 12px rgba(0,0,0,0.5)',         // z=4+
  ];
  return shadows[Math.min(z, shadows.length - 1)];
}

const SELECTED_SHADOW =
  '0 0 0 1px rgba(255,255,255,0.35), ' +
  '0 0 20px rgba(255,255,255,0.08), ' +
  '0 8px 30px rgba(0,0,0,0.6)';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface TileCellProps {
  tile: Tile;
  isFree: boolean;
  onClick: (id: number) => void;
}

export default function TileCell({ tile, isFree, onClick }: TileCellProps) {
  const symbol = TILE_SYMBOLS[tile.type % TILE_SYMBOLS.length];

  // ── Position — UNCHANGED logic ───────────────────────────────────────────
  const left   = tile.x * STEP_X + tile.z * LAYER_OFFSET;
  const top    = tile.y * STEP_Y - tile.z * LAYER_OFFSET;
  const zIndex = tile.z * 20 + (tile.state === 'selected' ? 200 : 0);

  const isSelected = tile.state === 'selected';
  const isMatched  = tile.state === 'matched';

  return (
    <AnimatePresence>
      {!isMatched && (
        <motion.button
          key={tile.id}
          // Match exit to the lighter, more refined feel
          exit={{
            scale:   [1, 1.05, 0.6],
            opacity: [1, 1,    0],
            y:       [0, -15,  -28],
            filter:  ['blur(0px)', 'blur(2px)', 'blur(12px)'],
            transition: { duration: 0.38, ease: 'easeOut', times: [0, 0.28, 1] },
          }}
          initial={{ scale: 0.88, opacity: 0 }}
          animate={{ scale: 1, opacity: 1, transition: { duration: 0.18, ease: [0, 0, 0.2, 1] } }}
          whileTap={isFree ? { scale: 0.95 } : {}}
          style={{
            position: 'absolute',
            left,
            top,
            width:  TILE_W,
            height: TILE_H,
            zIndex,
            boxShadow: isSelected ? SELECTED_SHADOW : depthShadow(tile.z),
          }}
          disabled={!isFree}
          onClick={() => isFree && onClick(tile.id)}
          aria-label={`Tile ${symbol} layer ${tile.z}`}
          className={[
            // Shape
            'rounded-md border select-none',
            'flex items-center justify-center',
            // Only CSS-transition colours — Framer Motion owns scale/opacity/filter
            'transition-colors duration-300 ease-out',
            // Frosted glass base — matte, not reflective
            'backdrop-blur-sm',

            // ── Surface ────────────────────────────────────────────────────
            isSelected
              ? 'bg-white/[0.10] border-white/[0.40] text-white'
              : 'bg-white/[0.03] border-white/[0.08] text-neutral-400',

            // ── Hover (free & not selected) ────────────────────────────────
            isFree && !isSelected
              ? 'cursor-pointer hover:bg-white/[0.06] hover:border-white/[0.15] hover:text-neutral-200'
              : '',

            // ── Locked ─────────────────────────────────────────────────────
            !isFree ? 'opacity-30 grayscale cursor-not-allowed' : '',
          ].join(' ')}
        >
          {/* Glyph — weight switches with state, colour is monochrome */}
          <span className="text-lg leading-none font-light tracking-tight select-none">
            {symbol}
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
