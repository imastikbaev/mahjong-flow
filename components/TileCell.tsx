'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Tile } from '@/store/mahjongStore';
import { TILE_SYMBOLS, TILE_COLORS } from './tileSymbols';

// ---------------------------------------------------------------------------
// Layout constants (pixels)
// ---------------------------------------------------------------------------

/** Rendered width of one tile in px. */
export const TILE_W = 52;
/** Rendered height of one tile in px. */
export const TILE_H = 56;
/** Horizontal spacing between grid columns (x-step = 2 units). */
export const STEP_X = TILE_W / 2; // each grid unit = 26px
/** Vertical spacing between grid rows (y-step = 2 units). */
export const STEP_Y = TILE_H / 2; // each grid unit = 28px
/** How many extra pixels each z-layer shifts the tile up and to the right. */
export const LAYER_OFFSET = 4;

// ---------------------------------------------------------------------------
// Shadow & depth helpers
// ---------------------------------------------------------------------------

/**
 * Returns a Tailwind box-shadow class that grows with the z-layer.
 * Ground tiles get a subtle shadow; high tiles look more "lifted".
 */
function shadowClass(z: number): string {
  if (z === 0) return 'shadow-md';
  if (z === 1) return 'shadow-lg';
  if (z === 2) return 'shadow-xl';
  return 'shadow-2xl';
}

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
  const color  = TILE_COLORS[tile.type % TILE_COLORS.length];

  // Pixel position: each grid unit is STEP px; z shifts tile up-right
  const left = tile.x * STEP_X + tile.z * LAYER_OFFSET;
  const top  = tile.y * STEP_Y - tile.z * LAYER_OFFSET;

  // z-index so higher layers render on top of lower ones
  const zIndex = tile.z * 20 + (tile.state === 'selected' ? 200 : 0);

  const isSelected = tile.state === 'selected';
  const isMatched  = tile.state === 'matched';

  return (
    <AnimatePresence>
      {!isMatched && (
        <motion.button
          key={tile.id}
          // --- Exit animation: matched tiles shrink and fade ---
          exit={{ scale: 0.4, opacity: 0, transition: { duration: 0.28, ease: 'easeIn' } }}
          // --- Entrance: subtle pop-in on first render ---
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1, transition: { duration: 0.18 } }}
          // --- Selection spring ---
          whileTap={isFree ? { scale: 0.93 } : {}}
          style={{
            position: 'absolute',
            left,
            top,
            width: TILE_W,
            height: TILE_H,
            zIndex,
          }}
          disabled={!isFree}
          onClick={() => isFree && onClick(tile.id)}
          aria-label={`Tile ${symbol} at layer ${tile.z}`}
          className={[
            // Base shape
            'rounded-lg border select-none',
            'flex items-center justify-center',
            'transition-colors duration-150',

            // 3-D face — light top surface with a darker right/bottom bevel
            'bg-gradient-to-br',

            // Dark mode / light mode surface colours
            isSelected
              ? 'from-amber-100 to-amber-200 border-amber-400 dark:from-amber-800 dark:to-amber-700 dark:border-amber-500'
              : 'from-slate-50 to-slate-100 border-slate-300 dark:from-slate-700 dark:to-slate-800 dark:border-slate-600',

            // Depth shadow scales with z
            shadowClass(tile.z),

            // Free / locked cursor
            isFree
              ? 'cursor-pointer hover:from-white hover:to-slate-50 dark:hover:from-slate-600 dark:hover:to-slate-700 hover:border-slate-400'
              : 'cursor-not-allowed opacity-80',

            // Selected ring
            isSelected ? 'ring-2 ring-amber-400 dark:ring-amber-500' : '',
          ].join(' ')}
        >
          {/* Tile symbol */}
          <span className={`text-xl leading-none font-light ${color}`}>
            {symbol}
          </span>

          {/* Bottom-right bevel to sell the 3-D illusion */}
          <span
            aria-hidden
            className={[
              'absolute bottom-0 right-0 w-full h-full rounded-lg pointer-events-none',
              'border-b-4 border-r-4',
              isSelected
                ? 'border-amber-300/50 dark:border-amber-600/50'
                : 'border-slate-300/60 dark:border-slate-900/60',
            ].join(' ')}
          />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
