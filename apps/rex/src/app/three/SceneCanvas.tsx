'use client';

import { Canvas } from '@react-three/fiber';
import { useMemo } from 'react';
import { CAMERA_POSITION } from '~/constants/localStorage';
import { CameraHUD } from './CameraHUD';
import { FPSControls } from './FPSControls';
import { buildGridPoints, TileLayout, type TileLayoutKey } from './grid';

export default function SceneCanvas() {
  // change to TileLayout.square to compare layouts
  // const layout: TileLayoutKey = TileLayout.hex;
  const layout: TileLayoutKey = TileLayout.square;

  const points = useMemo(() => buildGridPoints(layout, 4, 1), [layout]);

  const prevRaw = localStorage.getItem(CAMERA_POSITION);

  const prev = JSON.parse(prevRaw || '{}');

  

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      {/* Camera starts at a simple isometric-ish position; lookAt set in FPSControls */}
      <Canvas camera={{ position: [8, 8, 8], fov: 60 }}>
        <FPSControls position={prev.position} />

        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 10, 5]} intensity={0.8} />
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

      <CameraHUD />
    </div>
  );
}