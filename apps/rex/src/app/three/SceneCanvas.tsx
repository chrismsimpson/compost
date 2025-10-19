'use client';

import { Canvas } from '@react-three/fiber';
import { useMemo } from 'react';
import { buildGridPoints, TileLayout, type TileLayoutKey } from './grid';

export default function SceneCanvas() {
  // change to TileLayout.square to compare layouts
  const layout: TileLayoutKey = TileLayout.hex;
  // const layout: TileLayoutKey = TileLayout.square;

  const points = useMemo(() => buildGridPoints(layout, 4, 1), [layout]);

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      {/* Move camera to a simple isometric-ish angle */}
      <Canvas camera={{ position: [8, 8, 8], fov: 60 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 10, 5]} intensity={0.8} />
        {/* Helpful axes (X: red, Y: green, Z: blue) */}
        <axesHelper args={[5]} />

        {/* Rotate the grid from the XY plane down onto the XZ plane */}
        <group rotation={[-Math.PI / 2, 0, 0]}>
          {points.map((p, i) => (
            <mesh key={i} position={p as [number, number, number]}>
              <sphereGeometry args={[0.06, 12, 12]} />
              <meshStandardMaterial color="orange" />
            </mesh>
          ))}
        </group>
      </Canvas>
    </div>
  );
}