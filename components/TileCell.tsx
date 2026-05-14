'use client';

import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import { Tile, useMahjongStore } from '@/store/mahjongStore';
import { TILE_ICONS, GROUP_COLORS, CLASSIC_SYMBOLS } from './tileSymbols';

// ---------------------------------------------------------------------------
// Layout constants — UNCHANGED (game logic depends on these)
// ---------------------------------------------------------------------------

export const TILE_W       = 52;
export const TILE_H       = 56;
export const STEP_X       = TILE_W / 2;
export const STEP_Y       = TILE_H / 2;
export const LAYER_OFFSET = 4;

// ---------------------------------------------------------------------------
// Element glow — neon ring by suit for free Pro tiles
// ---------------------------------------------------------------------------

// rgba values matching GROUP_COLORS: emerald-400, blue-400, orange-500, slate-300
const ELEMENT_GLOW_DARK = [
  '0 0 0 1px rgba(52,211,153,0.45), 0 0 12px rgba(52,211,153,0.20)',   // Earth
  '0 0 0 1px rgba(96,165,250,0.45), 0 0 12px rgba(96,165,250,0.20)',   // Water
  '0 0 0 1px rgba(249,115,22,0.50), 0 0 12px rgba(249,115,22,0.22)',   // Fire
  '0 0 0 1px rgba(203,213,225,0.35), 0 0 10px rgba(203,213,225,0.15)', // Air
] as const;

const ELEMENT_GLOW_LIGHT = [
  '0 0 0 1.5px rgba(16,185,129,0.50), 0 0 10px rgba(16,185,129,0.15)',  // Earth
  '0 0 0 1.5px rgba(59,130,246,0.50), 0 0 10px rgba(59,130,246,0.15)',  // Water
  '0 0 0 1.5px rgba(234,88,12,0.50),  0 0 10px rgba(234,88,12,0.15)',   // Fire
  '0 0 0 1.5px rgba(100,116,139,0.40), 0 0 8px rgba(100,116,139,0.12)', // Air
] as const;

// ---------------------------------------------------------------------------
// Depth shadow — soft drop-shadow scales with z, no thick borders
// ---------------------------------------------------------------------------

function depthShadow(z: number, dark: boolean): string {
  if (dark) {
    const shadows = [
      '0 2px 8px rgba(0,0,0,0.55), 0 1px 2px rgba(0,0,0,0.3)',
      '0 4px 16px rgba(0,0,0,0.65), 0 2px 4px rgba(0,0,0,0.35)',
      '0 8px 24px rgba(0,0,0,0.72), 0 3px 6px rgba(0,0,0,0.4)',
      '0 12px 36px rgba(0,0,0,0.80), 0 4px 8px rgba(0,0,0,0.45)',
      '0 16px 48px rgba(0,0,0,0.85), 0 6px 12px rgba(0,0,0,0.5)',
    ];
    return shadows[Math.min(z, shadows.length - 1)];
  }
  // Light mode — softer, warmer shadows so tiles read clearly on #f5f5f5
  const shadows = [
    '0 2px 6px rgba(0,0,0,0.10), 0 1px 2px rgba(0,0,0,0.06)',
    '0 4px 12px rgba(0,0,0,0.13), 0 2px 4px rgba(0,0,0,0.08)',
    '0 6px 18px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.09)',
    '0 8px 24px rgba(0,0,0,0.18), 0 4px 8px rgba(0,0,0,0.10)',
    '0 12px 32px rgba(0,0,0,0.20), 0 5px 10px rgba(0,0,0,0.11)',
  ];
  return shadows[Math.min(z, shadows.length - 1)];
}

const SELECTED_SHADOW_DARK =
  '0 0 0 2px rgba(250,204,21,0.9), ' +        // bright yellow ring
  '0 0 20px rgba(250,204,21,0.55), ' +         // neon outer glow
  '0 0 40px rgba(250,204,21,0.20), ' +         // wide diffuse halo
  '0 8px 30px rgba(0,0,0,0.6)';               // depth

const SELECTED_SHADOW_LIGHT =
  '0 0 0 2px rgba(234,179,8,0.70), ' +         // yellow ring, softer
  '0 0 10px rgba(253,224,71,0.30), ' +          // light pastel glow
  '0 4px 10px rgba(0,0,0,0.08)';               // gentle depth

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface TileCellProps {
  tile: Tile;
  isFree: boolean;
  onClick: (id: number) => void;
  isPro?: boolean;
  isHinted?: boolean;
}

// Light-mode element surfaces — applied only on free tiles in pro skin
const ELEMENT_SURFACE_LIGHT = [
  'bg-emerald-50  border-emerald-200',   // Earth
  'bg-blue-50     border-blue-200',      // Water
  'bg-orange-50   border-orange-200',    // Fire
  'bg-slate-50    border-slate-200',     // Air
] as const;

const ELEMENT_HOVER_LIGHT = [
  '[@media(hover:hover)]:hover:bg-emerald-100 [@media(hover:hover)]:hover:border-emerald-300',  // Earth
  '[@media(hover:hover)]:hover:bg-blue-100    [@media(hover:hover)]:hover:border-blue-300',      // Water
  '[@media(hover:hover)]:hover:bg-orange-100  [@media(hover:hover)]:hover:border-orange-300',    // Fire
  '[@media(hover:hover)]:hover:bg-slate-100   [@media(hover:hover)]:hover:border-slate-300',     // Air
] as const;

export default function TileCell({ tile, isFree, onClick, isPro = false, isHinted = false }: TileCellProps) {
  const { resolvedTheme } = useTheme();
  const isDark        = resolvedTheme !== 'light';
  const skin          = useMahjongStore((s) => s.skin);
  const IconComponent = TILE_ICONS[tile.type % TILE_ICONS.length];
  const groupIndex    = Math.floor((tile.type % 36) / 9);
  const themeColor    = GROUP_COLORS[groupIndex];
  const level         = (tile.type % 9) + 1;
  const classicSymbol = CLASSIC_SYMBOLS[tile.type % CLASSIC_SYMBOLS.length];

  // Use element tint in light mode for free elemental tiles (not selected)
  const useElementTint = !isDark && skin === 'pro' && isFree && !tile.state.includes('selected');

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
            boxShadow: (() => {
              if (isSelected) return isDark ? SELECTED_SHADOW_DARK : SELECTED_SHADOW_LIGHT;
              const depth = depthShadow(tile.z, isDark);
              if (skin === 'pro' && isFree) {
                const glow = isDark ? ELEMENT_GLOW_DARK[groupIndex] : ELEMENT_GLOW_LIGHT[groupIndex];
                return `${glow}, ${depth}`;
              }
              return depth;
            })(),
            animation: isHinted ? 'hint-pulse 1.2s ease-in-out infinite' : undefined,
          }}
          disabled={!isFree}
          onClick={() => isFree && onClick(tile.id)}
          aria-label={`Tile type ${tile.type} level ${level} layer ${tile.z}`}
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
              ? isDark
                ? 'bg-yellow-400/[0.18] border-yellow-400/[0.85]'
                : 'bg-yellow-100 border-yellow-400'
              : useElementTint
              ? ELEMENT_SURFACE_LIGHT[groupIndex]
              : isPro
              ? 'bg-white dark:bg-white/[0.05] border-neutral-200 dark:border-white/[0.12]'
              : 'bg-white dark:bg-white/[0.03] border-neutral-200/80 dark:border-white/[0.08]',

            // ── Hover (free & not selected) ────────────────────────────────
            isFree && !isSelected
              ? useElementTint
                ? `cursor-pointer ${ELEMENT_HOVER_LIGHT[groupIndex]}`
                : isPro
                ? 'cursor-pointer [@media(hover:hover)]:hover:bg-neutral-50 [@media(hover:hover)]:hover:border-neutral-300 dark:[@media(hover:hover)]:hover:bg-white/[0.09] dark:[@media(hover:hover)]:hover:border-white/[0.22]'
                : 'cursor-pointer [@media(hover:hover)]:hover:bg-neutral-50 [@media(hover:hover)]:hover:border-neutral-300/80 dark:[@media(hover:hover)]:hover:bg-white/[0.06] dark:[@media(hover:hover)]:hover:border-white/[0.15]'
              : '',

            // ── Locked — stronger greyscale + opacity ──────────────────────
            !isFree ? 'opacity-20 grayscale-[80%] cursor-not-allowed' : '',
          ].join(' ')}
        >
          {skin === 'classic' ? (
            /* ── Classic skin: authentic Mahjong Unicode ── */
            <span
              className={`text-3xl leading-none select-none ${
                isSelected
                  ? 'text-neutral-900 dark:text-white'
                  : 'text-neutral-700 dark:text-neutral-300'
              }`}
            >
              {classicSymbol}
            </span>
          ) : (
            /* ── Pro skin: Elemental Lucide icons ── */
            <>
              {/* Level indicator — top-right corner */}
              <span className="absolute top-1 right-1.5 text-[9px] opacity-40 font-mono select-none leading-none">
                {level}
              </span>
              <IconComponent
                size={20 + level * 0.8}
                className={`select-none ${isSelected ? 'text-yellow-300' : themeColor}`}
                strokeWidth={1.5}
              />
            </>
          )}
        </motion.button>
      )}
    </AnimatePresence>
  );
}
