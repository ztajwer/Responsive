"use client";

import { useLayoutEffect, useRef, type MutableRefObject } from "react";
import { PerspectiveCamera } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  computeDoorCameraFraming,
  framingToFrameState,
  getDoorDollyMax,
  getDoorFovDollyZoom,
  getDoorLiftMax,
  DOOR_CAMERA,
  type DoorFrameState,
} from "@/lib/doorFraming";

interface CinematicCameraProps {
  progressRef: MutableRefObject<number>;
  frameRef: MutableRefObject<DoorFrameState>;
}

export default function CinematicCamera({ progressRef, frameRef }: CinematicCameraProps) {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const baseDistanceRef = useRef(3.35);
  const lookAtYRef = useRef(0);
  const baseFovRef = useRef<number>(DOOR_CAMERA.fov);
  const dollyMaxRef = useRef<number>(DOOR_CAMERA.dollyMax);
  const liftMaxRef = useRef<number>(DOOR_CAMERA.liftMax);
  const fovDollyRef = useRef(1.2);
  const isMobileRef = useRef(false);
  const { size } = useThree();

  useLayoutEffect(() => {
    const cam = cameraRef.current;
    if (!cam) return;

    const aspect = size.width / size.height;
    const framing = computeDoorCameraFraming(aspect, size.width, size.height);

    baseDistanceRef.current = framing.distance;
    lookAtYRef.current = framing.lookAtY;
    baseFovRef.current = framing.fov;
    isMobileRef.current = framing.isMobile;
    frameRef.current = framingToFrameState(framing);
    dollyMaxRef.current = getDoorDollyMax(size.width);
    liftMaxRef.current = getDoorLiftMax(size.width);
    fovDollyRef.current = getDoorFovDollyZoom(size.width);

    cam.fov = framing.fov;
    cam.position.set(0, framing.lookAtY, framing.distance);
    cam.rotation.set(0, 0, 0);
    cam.lookAt(0, framing.lookAtY, 0);
    cam.near = 0.08;
    cam.far = 50;
    cam.updateProjectionMatrix();
  }, [size.width, size.height, frameRef]);

  useFrame(() => {
    const cam = cameraRef.current;
    if (!cam) return;

    const p = progressRef.current;
    const lookAtY = lookAtYRef.current;

    cam.position.z = baseDistanceRef.current - p * dollyMaxRef.current;
    cam.position.y = lookAtY + p * liftMaxRef.current;
    cam.position.x = 0;

    const fovPull = isMobileRef.current ? fovDollyRef.current : fovDollyRef.current * 0.5;
    cam.fov = baseFovRef.current - p * fovPull;
    cam.lookAt(0, lookAtY, 0);
    cam.updateProjectionMatrix();
  });

  return (
    <PerspectiveCamera
      ref={cameraRef}
      makeDefault
      fov={DOOR_CAMERA.fov}
      position={[0, 0, 3.35]}
      near={0.08}
      far={50}
    />
  );
}
