'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { Euler, OrthographicCamera, PerspectiveCamera, Vector3 } from 'three';
import { useCameraStore } from './cameraStore';

export function FPSControls({ position, rotation, fov, zoom }: { position?: number[]; rotation?: { x: number; y: number; z: number }, fov?: number; zoom?: number }) {
  const { camera, gl } = useThree();

  const isDown = useRef(false);
  const keysRef = useRef<Record<string, boolean>>({});
  const yawRef = useRef(0);
  const pitchRef = useRef(0);
  const eulerRef = useRef(new Euler(position?.[0] ?? 0, position?.[1] ?? 0, position?.[2] ?? 0, 'YXZ'));
  const forwardRef = useRef(new Vector3());
  const rightRef = useRef(new Vector3());
  const UP = useRef(new Vector3(0, 1, 0));

  // Track last logged snapshot to print only on change
  const lastRef = useRef<{
    pos: Vector3;
    rot: Euler;
    fov: number;
    zoom: number;
    inited: boolean;
  }>({
    pos: new Vector3(),
    rot: new Euler(position?.[0] ?? 0, position?.[1] ?? 0, position?.[2] ?? 0, 'YXZ'),
    fov: 0,
    zoom: 0,
    inited: false,
  });

  const sensitivity = 0.002; // mouse look sensitivity
  const moveSpeed = 4; // units per second
  const minFov = 25;
  const maxFov = 85;

  // Small helpers for logging
  const logCamera = (reason: string) => {

    const pos = [
      +camera.position.x.toFixed(3),
      +camera.position.y.toFixed(3),
      +camera.position.z.toFixed(3),
    ];

    const rotation = {
      x: +camera.rotation.x.toFixed(3),
      y: +camera.rotation.y.toFixed(3),
      z: +camera.rotation.z.toFixed(3),
    };

    const fov = camera instanceof PerspectiveCamera
      ? +camera.fov.toFixed(2)
      : undefined;
        
    const zoom = camera instanceof OrthographicCamera
      ? +camera.zoom.toFixed(2)
      : undefined;
    
    useCameraStore.getState().setCamera(
      reason,
      pos,
      rotation,
      fov,
      zoom
    );
  };

  const snapshot = () => {
    lastRef.current.pos.copy(camera.position);
    lastRef.current.rot.copy(camera.rotation);
    if (camera instanceof PerspectiveCamera) {
      lastRef.current.fov = camera.fov;
    } else if (camera instanceof OrthographicCamera) {
      lastRef.current.zoom = camera.zoom;
    }
    lastRef.current.inited = true;
  };

  const hasChanged = () => {
    if (!lastRef.current.inited) return true;
    const epsPos = 1e-5;
    const epsRot = 1e-5;

    const dPx = Math.abs(camera.position.x - lastRef.current.pos.x) > epsPos;
    const dPy = Math.abs(camera.position.y - lastRef.current.pos.y) > epsPos;
    const dPz = Math.abs(camera.position.z - lastRef.current.pos.z) > epsPos;

    const dRx = Math.abs(camera.rotation.x - lastRef.current.rot.x) > epsRot;
    const dRy = Math.abs(camera.rotation.y - lastRef.current.rot.y) > epsRot;
    const dRz = Math.abs(camera.rotation.z - lastRef.current.rot.z) > epsRot;

    let dProj = false;
    if (camera instanceof PerspectiveCamera) {
      dProj = Math.abs(camera.fov - lastRef.current.fov) > 1e-5;
    } else if (camera instanceof OrthographicCamera) {
      dProj = Math.abs(camera.zoom - lastRef.current.zoom) > 1e-5;
    }

    return dPx || dPy || dPz || dRx || dRy || dRz || dProj;
  };

  useEffect(() => {
    // Initial orientation to look at origin (keeps your initial position from Canvas)
    camera.rotation.order = 'YXZ';
    camera.lookAt(0, 0, 0);

    // Seed yaw/pitch from the current camera quaternion

    if (position && position.length === 3) {
      camera.position.set(position[0], position[1], position[2]);
    }

    if (rotation) {
      camera.rotation.set(rotation.x, rotation.y, rotation.z, 'YXZ');
      yawRef.current = rotation.y;
      pitchRef.current = rotation.x;
    } else {
      // Seed yaw/pitch from current orientation and look at origin
      const e = new Euler(0, 0, 0, 'YXZ').setFromQuaternion(camera.quaternion, 'YXZ');
      yawRef.current = e.y;
      pitchRef.current = e.x;
      camera.lookAt(0, 0, 0);
    }

    if (typeof fov === 'number' && camera instanceof PerspectiveCamera) {
      camera.fov = Math.min(maxFov, Math.max(minFov, fov));
      camera.updateProjectionMatrix();
    }
    if (typeof zoom === 'number' && camera instanceof OrthographicCamera) {
      camera.zoom = zoom;
      camera.updateProjectionMatrix();
    }
    
    logCamera('start');
    snapshot();

    const canvas = gl.domElement;

    const onDown = () => {
      isDown.current = true;
    };

    const onUp = () => {
      isDown.current = false;
    };

    const onMouseMove = (event: MouseEvent) => {
      if (!isDown.current) return;
      yawRef.current -= event.movementX * sensitivity;
      pitchRef.current -= event.movementY * sensitivity;

      // Clamp pitch to avoid flipping
      const maxPitch = Math.PI / 2 - 0.01;
      if (pitchRef.current > maxPitch) pitchRef.current = maxPitch;
      if (pitchRef.current < -maxPitch) pitchRef.current = -maxPitch;
      // rotation applied in useFrame; we'll log there
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const delta = Math.sign(event.deltaY);
      if (camera instanceof PerspectiveCamera) {
        camera.fov = Math.min(maxFov, Math.max(minFov, camera.fov + delta * 2));
      } else if (camera instanceof OrthographicCamera) {
        const minZoom = 0.5;
        const maxZoom = 4;
        camera.zoom = Math.min(
          maxZoom,
          Math.max(minZoom, camera.zoom - delta * 0.1)
        );
      }
      camera.updateProjectionMatrix();
      logCamera('wheel');
      snapshot();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const { code } = event;
      if (code === 'KeyW' || code === 'KeyA' || code === 'KeyS' || code === 'KeyD') {
        keysRef.current[code] = true;
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      const { code } = event;
      if (code === 'KeyW' || code === 'KeyA' || code === 'KeyS' || code === 'KeyD') {
        keysRef.current[code] = false;
      }
    };

    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('mouseup', onUp);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('wheel', onWheel, { passive: false });

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    return () => {
      canvas.removeEventListener('mousedown', onDown);
      canvas.removeEventListener('mouseup', onUp);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('wheel', onWheel);

      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [camera, gl]);

  useFrame((_, delta) => {
    // Apply mouse look (yaw/pitch) to the camera
    camera.rotation.set(pitchRef.current, yawRef.current, 0, 'YXZ');

    // Compute planar forward vector (ignore vertical so movement stays on XZ)
    eulerRef.current.set(pitchRef.current, yawRef.current, 0, 'YXZ');
    forwardRef.current.set(0, 0, -1).applyEuler(eulerRef.current);
    forwardRef.current.y = 0;
    forwardRef.current.normalize();

    // Right vector from forward x up
    rightRef.current.copy(forwardRef.current).cross(UP.current).normalize();

    const distance = moveSpeed * delta;

    if (keysRef.current['KeyW']) {
      camera.position.addScaledVector(forwardRef.current, distance);
    }
    if (keysRef.current['KeyS']) {
      camera.position.addScaledVector(forwardRef.current, -distance);
    }
    if (keysRef.current['KeyA']) {
      camera.position.addScaledVector(rightRef.current, -distance);
    }
    if (keysRef.current['KeyD']) {
      camera.position.addScaledVector(rightRef.current, distance);
    }

    // Log only when something actually changed
    if (hasChanged()) {
      logCamera('update');
      snapshot();
    }
  });

  return null;
}