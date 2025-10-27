'use client';

import { Canvas } from '@react-three/fiber';
import { useMemo } from 'react';
import { CAMERA_POSITION } from '~/constants/localStorage';
import { CameraHUD } from './CameraHUD';
import { FPSControls } from './FPSControls';
import { buildGridPoints, TileLayout, type TileLayoutKey } from './grid';

export default function SceneCanvas() {
  const layout: TileLayoutKey = TileLayout.square;

  const points = useMemo(() => buildGridPoints(layout, 4, 1), [layout]);

  const prev = useMemo(() => {
    if (typeof window === 'undefined') return {} as any;
    try {
      return JSON.parse(window.localStorage.getItem(CAMERA_POSITION) ?? '{}');
    } catch {
      return {} as any;
    }
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Canvas camera={{ position: [8, 8, 8], fov: 60 }}>
        <FPSControls
          position={prev.position}
          rotation={prev.rotation}
          fov={prev.fov}
          zoom={prev.zoom}
        />

        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 10, 5]} intensity={0.8} />
        <axesHelper args={[5]} />

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