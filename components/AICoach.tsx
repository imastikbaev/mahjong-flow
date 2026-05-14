'use client';

import { useMemo } from 'react';
import { Tile, useMahjongStore, isTileFree } from '@/store/mahjongStore';

// ---------------------------------------------------------------------------
// Board analysis engine
// ---------------------------------------------------------------------------

interface CoachTip {
  priority: 'info' | 'warn' | 'good';
  text: string;
}

function analyzeBoard(tiles: Tile[]): CoachTip[] {
  const tips: CoachTip[] = [];
  const active    = tiles.filter((t) => t.state !== 'matched');
  const matched   = tiles.filter((t) => t.state === 'matched');
  const free      = active.filter((t) => isTileFree(t, tiles));

  const pairsMatched = Math.floor(matched.length / 2);
  const pairsLeft    = Math.floor(active.length / 2);

  // Progress
  tips.push({
    priority: pairsMatched >= 60 ? 'good' : pairsMatched >= 36 ? 'info' : 'info',
    text: `${pairsMatched} / 72 pairs cleared — ${pairsLeft} remain`,
  });

  // Count free matching pairs
  const typeCount = new Map<number, number>();
  for (const t of free) typeCount.set(t.type, (typeCount.get(t.type) ?? 0) + 1);
  const freePairs = Array.from(typeCount.values()).filter((c) => c >= 2).length;

  if (freePairs === 0 && pairsLeft > 0) {
    tips.push({ priority: 'warn', text: 'No moves left — use Shuffle to reset the board' });
  } else if (freePairs === 1) {
    tips.push({ priority: 'warn', text: 'Only 1 free pair — this move is forced, choose wisely' });
  } else if (freePairs >= 8) {
    tips.push({ priority: 'good', text: `${freePairs} free pairs — you have good options` });
  } else {
    tips.push({ priority: 'info', text: `${freePairs} free matching pairs available` });
  }

  // Layer analysis — prioritise top layers
  if (active.length > 0) {
    const maxZ         = Math.max(...active.map((t) => t.z));
    const topLayerAll  = active.filter((t) => t.z === maxZ);
    const topLayerFree = free.filter((t) => t.z === maxZ);

    if (maxZ >= 2 && topLayerAll.length > 0) {
      if (topLayerFree.length === topLayerAll.length) {
        tips.push({
          priority: 'good',
          text: `All tiles on layer ${maxZ + 1} are free — clear them to unblock the layers below`,
        });
      } else if (topLayerFree.length > 0) {
        tips.push({
          priority: 'info',
          text: `${topLayerFree.length} of ${topLayerAll.length} top-layer tiles are free — start there`,
        });
      }
    }
  }

  // Isolated types — free tile whose match is buried
  const isolatedCount = Array.from(typeCount.entries())
    .filter(([, c]) => c === 1).length;
  if (isolatedCount >= 4) {
    tips.push({
      priority: 'warn',
      text: `${isolatedCount} tile types have a free copy but no free match — those matches are buried`,
    });
  }

  // Best-unlock move: find the free tile that, when removed, frees the most others
  let bestUnlock = 0;
  for (const tile of free) {
    const without   = tiles.map((t) => t.id === tile.id ? { ...t, state: 'matched' as const } : t);
    const newlyFree = active.filter(
      (t) => t.id !== tile.id && !isTileFree(t, tiles) && isTileFree(t, without),
    ).length;
    if (newlyFree > bestUnlock) bestUnlock = newlyFree;
  }

  if (bestUnlock >= 3) {
    tips.push({
      priority: 'good',
      text: `One move here unlocks ${bestUnlock} new tiles — find the tile that's blocking the most`,
    });
  }

  return tips;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AICoach() {
  const tiles      = useMahjongStore((s) => s.tiles);
  const isComplete = useMahjongStore((s) => s.isComplete);
  const isFailed   = useMahjongStore((s) => s.isFailed);

  const tips = useMemo(() => {
    if (isComplete) return [{ priority: 'good' as const, text: 'Board cleared! Perfect session.' }];
    if (isFailed)   return [{ priority: 'warn' as const, text: 'Sprint ended. Start a new game to see analysis.' }];
    if (tiles.length === 0) return [];
    return analyzeBoard(tiles);
  }, [tiles, isComplete, isFailed]);

  return (
    <aside className="
      w-full max-w-sm
      bg-white dark:bg-white/[0.03] backdrop-blur-sm
      rounded-xl border border-black/[0.07] dark:border-white/[0.07]
      overflow-hidden
    ">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-black/[0.06] dark:border-white/[0.06]">
        <p className="text-[9px] uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-600 font-normal mb-1">
          AI Coach
        </p>
        <p className="text-xs font-light text-neutral-500 tracking-tight">
          Live board analysis
        </p>
      </div>

      {/* Tips */}
      <div className="px-4 py-3 space-y-2.5">
        {tips.length === 0 && (
          <p className="text-xs font-light text-neutral-400 dark:text-neutral-700 py-4 text-center">
            Start a game to see analysis
          </p>
        )}
        {tips.map((tip, i) => (
          <div key={i} className="flex gap-2.5 items-start">
            <span
              className={`mt-0.5 text-xs shrink-0 ${
                tip.priority === 'warn' ? 'text-amber-500' :
                tip.priority === 'good' ? 'text-emerald-500 dark:text-emerald-400' :
                'text-neutral-400 dark:text-neutral-600'
              }`}
            >
              {tip.priority === 'warn' ? '⚠' : tip.priority === 'good' ? '✦' : '◎'}
            </span>
            <p className="text-xs font-light text-neutral-600 dark:text-neutral-400 tracking-tight leading-relaxed">
              {tip.text}
            </p>
          </div>
        ))}
      </div>
    </aside>
  );
}
