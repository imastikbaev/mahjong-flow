'use client';

import { useEffect, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useMahjongStore, isTileFree } from '@/store/mahjongStore';
import TileCell, { TILE_W, TILE_H, STEP_X, STEP_Y, LAYER_OFFSET } from './TileCell';

export default function MahjongBoard() {
  const tiles      = useMahjongStore((s) => s.tiles);
  const selectTile = useMahjongStore((s) => s.selectTile);
  const initBoard  = useMahjongStore((s) => s.initBoard);

  // Initialise on first mount
  useEffect(() => {
    initBoard();
  }, [initBoard]);

  // Pre-compute the free set once per render (O(n²) but n ≤ 144)
  const freeIds = useMemo(() => {
    const set = new Set<number>();
    tiles.forEach((t) => {
      if (isTileFree(t, tiles)) set.add(t.id);
    });
    return set;
  }, [tiles]);

  // ---------------------------------------------------------------------------
  // Board canvas dimensions — derive from the max x/y/z extents of layout
  // ---------------------------------------------------------------------------
  const { canvasW, canvasH } = useMemo(() => {
    if (tiles.length === 0) return { canvasW: 600, canvasH: 400 };
    const maxX = Math.max(...tiles.map((t) => t.x));
    const maxY = Math.max(...tiles.map((t) => t.y));
    const maxZ = Math.max(...tiles.map((t) => t.z));
    return {
      canvasW: maxX * STEP_X + TILE_W + maxZ * LAYER_OFFSET + 32,
      canvasH: maxY * STEP_Y + TILE_H + maxZ * LAYER_OFFSET + 32,
    };
  }, [tiles]);

  if (tiles.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm">
        Loading…
      </div>
    );
  }

  return (
    <main className="flex-1 flex items-center justify-center overflow-auto p-6">
      {/*
       * Outer scroll container — lets small screens pan the board.
       * The board itself is absolutely positioned so tiles can overlap freely.
       */}
      <div
        style={{ width: canvasW, height: canvasH, position: 'relative', flexShrink: 0 }}
      >
        <AnimatePresence>
          {tiles.map((tile) => (
            <TileCell
              key={tile.id}
              tile={tile}
              isFree={freeIds.has(tile.id)}
              onClick={selectTile}
            />
          ))}
        </AnimatePresence>
      </div>
    </main>
  );
}
