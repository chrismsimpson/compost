// apps/rex/src/app/three/grid.ts
export const TileLayout = {
  square: 'square',
  hex: 'hex',
} as const;

export type TileLayoutKey = keyof typeof TileLayout;

/**
 * Build (tiles + 1) x (tiles + 1) float3 points for the given layout.
 * - points are [x, y, z] number arrays
 * - z is 0.0 in this working example
 * - hex uses flat-top style: alternate rows offset by 0.5 * tileWidth
 * - hex row spacing uses sqrt(3)/2 * tileWidth (typical for flat-top)
 */
export function buildGridPoints(
  layout: TileLayoutKey,
  tiles = 4,
  tileWidth = 1
): number[][] {
  const points: number[][] = [];

  const yStep =
    layout === TileLayout.hex ? (Math.sqrt(3) / 2) * tileWidth : tileWidth;

  for (let row = 0; row <= tiles; row++) {
    const offsetX =
      layout === TileLayout.hex && row % 2 === 1 ? tileWidth / 2 : 0;

    for (let col = 0; col <= tiles; col++) {
      const x = col * tileWidth + offsetX;
      const y = row * yStep;
      const z = 0.0;
      points.push([x, y, z]);
    }
  }

  return points;
}