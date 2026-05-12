'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Tile } from '@/store/mahjongStore';
import { TILE_SYMBOLS, TILE_COLORS } from './tileSymbols';

// ---------------------------------------------------------------------------
// Layout constants (pixels) — unchanged from game engine
// ---------------------------------------------------------------------------

export const TILE_W      = 52;
export const TILE_H      = 56;
export const STEP_X      = TILE_W / 2;
export const STEP_Y      = TILE_H / 2;
export const LAYER_OFFSET = 4;

// ---------------------------------------------------------------------------
// Depth shadow — scales with z-layer for a convincing stacked-tile look
// against the dark background.
// ---------------------------------------------------------------------------

function shadowClass(z: number, isSelected: boolean): string {
  if (isSelected) return ''; // selected state uses an inline neon glow instead
  if (z === 0) return 'shadow-[0_4px_14px_rgba(0,0,0,0.6)]';
  if (z === 1) return 'shadow-[0_6px_20px_rgba(0,0,0,0.7)]';
  if (z === 2) return 'shadow-[0_8px_26px_rgba(0,0,0,0.75)]';
  return        'shadow-[0_10px_34px_rgba(0,0,0,0.85)]';
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
          exit={{ scale: 0.35, opacity: 0, transition: { duration: 0.25, ease: 'easeIn' } }}
          initial={{ scale: 0.82, opacity: 0 }}
          animate={{ scale: 1, opacity: 1, transition: { duration: 0.16 } }}
          whileTap={isFree ? { scale: 0.91 } : {}}
          style={{
            position: 'absolute',
            left,
            top,
            width:  TILE_W,
            height: TILE_H,
            zIndex,
            // Neon glow injected as inline style so Tailwind's JIT doesn't need
            // to scan the dynamic string — keeps the class list clean.
            boxShadow: isSelected
              ? '0 0 20px rgba(45,212,191,0.55), 0 0 40px rgba(45,212,191,0.2), 0 6px 20px rgba(0,0,0,0.7)'
              : undefined,
          }}
          disabled={!isFree}
          onClick={() => isFree && onClick(tile.id)}
          aria-label={`Tile ${symbol} layer ${tile.z}`}
          className={[
            'rounded-lg border select-none',
            'flex items-center justify-center',
            'transition-all duration-150',
            'bg-gradient-to-br',

            // ── Surface ──────────────────────────────────────────────────────
            isSelected
              ? [
                  'from-teal-500 to-emerald-400',
                  'border-teal-300',
                ].join(' ')
              : [
                  'from-slate-800 to-slate-900',
                  'border-slate-700',
                  shadowClass(tile.z, false),
                ].join(' '),

            // ── Hover (free tiles only) ───────────────────────────────────
            isFree && !isSelected
              ? 'cursor-pointer hover:from-slate-700 hover:to-slate-800 hover:border-teal-500/50'
              : '',

            // ── Locked ───────────────────────────────────────────────────
            !isFree ? 'cursor-not-allowed opacity-50' : '',
          ].join(' ')}
        >
          {/* Symbol — white on selected (dark glyph on light fill), coloured otherwise */}
          <span
            className={[
              'text-xl leading-none font-medium',
              isSelected ? 'text-slate-900' : color,
            ].join(' ')}
          >
            {symbol}
          </span>

          {/* 3-D bevel — bottom-right darker edge */}
          <span
            aria-hidden
            className={[
              'absolute bottom-0 right-0 w-full h-full rounded-lg pointer-events-none',
              'border-b-4 border-r-4',
              isSelected
                ? 'border-teal-700/50'
                : 'border-slate-950/80',
            ].join(' ')}
          />

          {/* Top-left highlight streak — simulates a light source from top-left */}
          <span
            aria-hidden
            className={[
              'absolute top-0 left-0 w-full h-full rounded-lg pointer-events-none',
              'border-t border-l',
              isSelected
                ? 'border-teal-300/40'
                : 'border-slate-600/50',
            ].join(' ')}
          />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
