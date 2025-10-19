'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

function SpinningBox() {
  const ref = useRef<THREE.Mesh>(null!);

  useFrame((_, delta) => {
    // simple rotation animation
    ref.current.rotation.x += delta;
    ref.current.rotation.y += delta * 1.2;
  });

  return (
    <mesh ref={ref}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="hotpink" />
    </mesh>
  );
}

export default function SceneCanvas() {
  // inline styles to avoid any Tailwind coupling here
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Canvas camera={{ position: [2.5, 2.5, 2.5], fov: 60 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} />
        <SpinningBox />
      </Canvas>
    </div>
  );
}