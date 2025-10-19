'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { Euler, Vector3 } from 'three';

export function FPSControls() {
  const { camera, gl } = useThree();

  // const isLockedRef = useRef(false);

  const isDown = useRef(false);
  const keysRef = useRef<Record<string, boolean>>({});
  const yawRef = useRef(0);
  const pitchRef = useRef(0);
  const eulerRef = useRef(new Euler(0, 0, 0, 'YXZ'));
  const forwardRef = useRef(new Vector3());
  const rightRef = useRef(new Vector3());
  const UP = useRef(new Vector3(0, 1, 0));

  const sensitivity = 0.002; // mouse look sensitivity
  const moveSpeed = 4; // units per second
  const minFov = 25;
  const maxFov = 85;

  useEffect(() => {
    // Initial orientation to look at origin (keeps your initial position from Canvas)
    camera.rotation.order = 'YXZ';
    camera.lookAt(0, 0, 0);

    // Seed yaw/pitch from the current camera quaternion
    const e = new Euler(0, 0, 0, 'YXZ').setFromQuaternion(
      camera.quaternion,
      'YXZ'
    );
    yawRef.current = e.y;
    pitchRef.current = e.x;

    const canvas = gl.domElement;

    // const onClick = () => {
    // //   // request pointer lock on click to enable mouse look
    // //   canvas.requestPointerLock();
    // };

    // const onPointerLockChange = () => {
    //   isLockedRef.current = document.pointerLockElement === canvas;
    // };



    const onDown = () => {
      isDown.current = true;
    };

    const onUp = () => {
      isDown.current = false;
    };

    const onMouseMove = (event: MouseEvent) => {
      // if (!isLockedRef.current) return;
      if (!isDown.current) return;
      yawRef.current -= event.movementX * sensitivity;
      pitchRef.current -= event.movementY * sensitivity;

      // Clamp pitch to avoid flipping
      const maxPitch = Math.PI / 2 - 0.01;
      if (pitchRef.current > maxPitch) pitchRef.current = maxPitch;
      if (pitchRef.current < -maxPitch) pitchRef.current = -maxPitch;
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const delta = Math.sign(event.deltaY);
      camera.fov = Math.min(maxFov, Math.max(minFov, camera.fov + delta * 2));
      camera.updateProjectionMatrix();
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

    // canvas.addEventListener('click', onClick);
    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('mouseup', onUp);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    // document.addEventListener('pointerlockchange', onPointerLockChange);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    return () => {
      // canvas.removeEventListener('click', onClick);
      canvas.removeEventListener('mousedown', onDown);
      canvas.removeEventListener('mouseup', onUp);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('wheel', onWheel);
      // document.removeEventListener('pointerlockchange', onPointerLockChange);
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
  });

  return null;
}
