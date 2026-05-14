// ---------------------------------------------------------------------------
// Shared domain types for the Mahjong tile graph.
// Imported by both the engine and the Zustand store so the type definition
// lives in one place and there are no circular module dependencies.
// ---------------------------------------------------------------------------

export type TileState = 'idle' | 'selected' | 'matched';

export interface Tile {
  id:    number;
  type:  number;
  x:     number;
  y:     number;
  z:     number;
  state: TileState;
}
