import {
  // Earth (levels 1–9)
  Minus,
  TableProperties,
  LayoutGrid,
  Pyramid,
  Triangle,
  Mountain,
  MountainSnow,
  Landmark,
  Castle,

  // Water (levels 1–9)
  Droplet,
  Droplets,
  UtensilsCrossed,
  Waves,
  Anchor,
  Ship,
  Fish,
  LifeBuoy,
  Shell,

  // Fire (levels 1–9)
  Zap,
  Flame,
  FlameKindling,
  Sun,
  Sunrise,
  Sunset,
  Radiation,   // Volcano unavailable in this version → Radiation (peak heat)
  Bomb,
  Blinds,

  // Air (levels 1–9)
  Feather,
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudSun,
  CloudLightning,
  Wind,
  Tornado,
  Orbit,       // Hurricane unavailable in this version → Orbit (maximal spin)
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Elemental suits — 4 × 9 = 36 total types, matching TILE_TYPE_COUNT
// ---------------------------------------------------------------------------

export const TILE_GROUPS = [
  // 0 — Earth
  [Minus, TableProperties, LayoutGrid, Pyramid, Triangle, Mountain, MountainSnow, Landmark, Castle],
  // 1 — Water
  [Droplet, Droplets, UtensilsCrossed, Waves, Anchor, Ship, Fish, LifeBuoy, Shell],
  // 2 — Fire
  [Zap, Flame, FlameKindling, Sun, Sunrise, Sunset, Radiation, Bomb, Blinds],
  // 3 — Air
  [Feather, Cloud, CloudDrizzle, CloudFog, CloudSun, CloudLightning, Wind, Tornado, Orbit],
] as const;

/** Flat list of 36 icon components in suit order */
export const TILE_ICONS = TILE_GROUPS.flat();

/**
 * Premium matte Tailwind colours — one per suit.
 * Applied to the icon's className so Tailwind includes the utility.
 */
export const GROUP_COLORS = [
  'text-emerald-600 dark:text-emerald-400', // Earth
  'text-blue-600 dark:text-blue-400',       // Water
  'text-orange-600 dark:text-orange-500',   // Fire
  'text-slate-500 dark:text-slate-300',     // Air
] as const;

// ---------------------------------------------------------------------------
// Classic skin — 36 authentic Mahjong Unicode characters
// ---------------------------------------------------------------------------

export const CLASSIC_SYMBOLS: string[] = [
  // Dots (1–9)
  '🀙','🀚','🀛','🀜','🀝','🀞','🀟','🀠','🀡',
  // Bamboos (1–9)
  '🀐','🀑','🀒','🀓','🀔','🀕','🀖','🀗','🀘',
  // Characters (1–9)
  '🀇','🀈','🀉','🀊','🀋','🀌','🀍','🀎','🀏',
  // Honors / Winds / Flowers
  '🀀','🀁','🀂','🀃','🀅','🀆','🀢','🀣','🀤',
];
