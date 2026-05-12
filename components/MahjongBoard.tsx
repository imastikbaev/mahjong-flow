'use client';

import { useEffect, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useMahjongStore, isTileFree } from '@/store/mahjongStore';
import TileCell, { TILE_W, TILE_H, STEP_X, STEP_Y, LAYER_OFFSET } from './TileCell';


export default function MahjongBoard() {
  const tiles      = useMahjongStore((s) => s.tiles);
  const selectTile = useMahjongStore((s) => s.selectTile);
  const initBoard  = useMahjongStore((s) => s.initBoard);
  const isPro      = useMahjongStore((s) => s.isPro);

  useEffect(() => { initBoard(); }, [initBoard]);

  const freeIds = useMemo(() => {
    const set = new Set<number>();
    tiles.forEach((t) => { if (isTileFree(t, tiles)) set.add(t.id); });
    return set;
  }, [tiles]);

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
      <div className="flex-1 flex items-center justify-center text-neutral-600 text-sm font-light tracking-wide">
        Loading…
      </div>
    );
  }

  return (
    <main className="flex-1 flex items-center justify-center overflow-auto p-8 relative z-10">
      {/* Ambient glow — sits behind the tile canvas, never above it */}
      <div
        aria-hidden
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
      >
        <div
          className="w-[600px] h-[400px] rounded-full bg-white/[0.025]"
          style={{ filter: 'blur(120px)' }}
        />
      </div>

      {/* Tile canvas */}
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
              isPro={isPro}
            />
          ))}
        </AnimatePresence>
      </div>
    </main>
  );
}
