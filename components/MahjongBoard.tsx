'use client';

import { useEffect, useRef, useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useMahjongStore } from '@/store/mahjongStore';
import TileCell, { TILE_W, TILE_H, STEP_X, STEP_Y, LAYER_OFFSET } from './TileCell';


export default function MahjongBoard() {
  const tiles      = useMahjongStore((s) => s.tiles);
  const selectTile = useMahjongStore((s) => s.selectTile);
  const initBoard  = useMahjongStore((s) => s.initBoard);
  const isPro      = useMahjongStore((s) => s.isPro);
  const hintedId   = useMahjongStore((s) => s.hintedId);

  useEffect(() => { initBoard(); }, [initBoard]);

  // O(N) freedom check — build a position-keyed set first so every
  // per-tile lookup is O(1) rather than O(N), avoiding the O(N²) cost
  // that accumulates across the 144-tile board on every state update.
  const freeIds = useMemo(() => {
    // Phase 1: index all non-matched tiles by their position.
    const occupied = new Set<string>();
    for (const t of tiles) {
      if (t.state !== 'matched') occupied.add(`${t.x},${t.y},${t.z}`);
    }

    const result = new Set<number>();
    for (const tile of tiles) {
      if (tile.state !== 'idle') continue;

      // Coverage: any tile at z+1 within ±1 unit on both axes?
      // Sampling all 9 candidate cells handles half-step offsets.
      let covered = false;
      outer: for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (occupied.has(`${tile.x + dx},${tile.y + dy},${tile.z + 1}`)) {
            covered = true;
            break outer;
          }
        }
      }
      if (covered) continue;

      // Lateral: mirrors isTileFree — within 2 x-units, within 1 y-unit.
      // Check both exact-step (dx=2) and half-step (dx=1) positions.
      let blockedLeft = false;
      let blockedRight = false;
      for (let dy = -1; dy <= 1; dy++) {
        if (!blockedLeft  && (occupied.has(`${tile.x - 2},${tile.y + dy},${tile.z}`) ||
                              occupied.has(`${tile.x - 1},${tile.y + dy},${tile.z}`))) blockedLeft  = true;
        if (!blockedRight && (occupied.has(`${tile.x + 2},${tile.y + dy},${tile.z}`) ||
                              occupied.has(`${tile.x + 1},${tile.y + dy},${tile.z}`))) blockedRight = true;
      }
      if (!blockedLeft || !blockedRight) result.add(tile.id);
    }
    return result;
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

  // ── Auto-scale to fit container ──────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (canvasW === 0 || canvasH === 0) return;

    const update = () => {
      const el = containerRef.current;
      if (!el) return;
      const pad = 32;
      const availW = el.clientWidth  - pad;
      const availH = el.clientHeight - pad;
      const s = Math.min(1, availW / canvasW, availH / canvasH);
      setScale(Math.max(0.4, s)); // never go below 0.4
    };

    update();
    const ro = new ResizeObserver(update);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [canvasW, canvasH]);

  if (tiles.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-neutral-600 text-sm font-light tracking-wide">
        Loading…
      </div>
    );
  }

  return (
    <main
      ref={containerRef}
      className="flex-1 flex items-center justify-center overflow-x-auto overflow-y-hidden p-4 relative z-10"
    >
      {/* Ambient glow — dark: white haze, light: neutral shadow pool */}
      <div
        aria-hidden
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
      >
        <div
          className="w-[600px] h-[400px] rounded-full dark:bg-white/[0.025] bg-black/[0.04]"
          style={{ filter: 'blur(120px)' }}
        />
      </div>

      {/*
        Outer div: takes up the SCALED dimensions so flex layout centres correctly.
        Inner div: full canvas size, scaled via CSS transform from top-left.
      */}
      <div
        style={{
          width:    canvasW * scale,
          height:   canvasH * scale,
          position: 'relative',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width:           canvasW,
            height:          canvasH,
            position:        'absolute',
            top:             0,
            left:            0,
            transformOrigin: 'top left',
            transform:       `scale(${scale})`,
          }}
        >
          <AnimatePresence>
            {tiles.map((tile) => (
              <TileCell
                key={tile.id}
                tile={tile}
                isFree={freeIds.has(tile.id)}
                onClick={selectTile}
                isPro={isPro}
                isHinted={tile.id === hintedId}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}
