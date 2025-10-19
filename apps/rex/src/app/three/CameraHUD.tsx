'use client';

import { useCameraStore } from './cameraStore';

export function CameraHUD() {
  const position = useCameraStore(state => state.position);
  const rotation = useCameraStore(state => state.rotation);
  const fov = useCameraStore(state => state.fov);
  const zoom = useCameraStore(state => state.zoom);

  return (
    <div className="pointer-events-none absolute top-4 left-4 z-50 rounded-md border border-gray-200 bg-white px-3 py-2 text-xs font-mono text-zinc-900 shadow-lg">
      <span className="opacity-80">pos:</span>{' '}
      {position.map(n => n.toFixed(2)).join(', ')}
      <br />
      <span className="opacity-80">rot:</span>{' '}
      {Object.values(rotation)
        .map(n => n.toFixed(2))
        .join(', ')}
      {(fov !== undefined || zoom !== undefined) && (
        <>
          <br />
          <span className="opacity-80">{fov !== undefined ? 'fov:' : 'zoom:'}</span>{' '}
          {fov !== undefined ? fov.toFixed(2) : zoom!.toFixed(2)}
        </>
      )}
    </div>
  );
}