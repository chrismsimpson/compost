
'use client';

import { create } from 'zustand';
import { CAMERA_POSITION } from '~/constants/localStorage';

type CameraState = {
  position: number[];
  rotation: { x: number; y: number; z: number };
  fov?: number;
  zoom?: number;
  setCamera(reason: string, position: number[], rotation: { x: number; y: number; z: number }, fov?: number, zoom?: number): void;
};

export const useCameraStore = create<CameraState>(set => ({
  position: [0, 0, 0],
  rotation: { x: 0, y: 0, z: 0 },
  fov: undefined,
  zoom: undefined,
  setCamera: (reason, position, rotation, fov, zoom) => {

    if (reason === 'update' || reason === 'wheel') {

      localStorage.setItem(
        CAMERA_POSITION,
        JSON.stringify({ position, rotation, fov, zoom })
      );
    }

    set(() => ({
      position,
      rotation,
      fov,
      zoom,
    }));
  },
}));
