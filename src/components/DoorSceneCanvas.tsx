"use client";

import { Suspense, useRef, type MutableRefObject } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import CinematicCamera from "./CinematicCamera";
import GlassDoors from "./GlassDoors";
import SceneLighting from "./SceneLighting";
import LoadingBridge from "./LoadingBridge";
import { DEFAULT_FRAME } from "@/lib/doorFraming";

function DoorSceneContent({
  progressRef,
  brightness,
}: {
  progressRef: MutableRefObject<number>;
  brightness: number;
}) {
  const frameRef = useRef(DEFAULT_FRAME);

  return (
    <>
      <CinematicCamera progressRef={progressRef} frameRef={frameRef} />
      <SceneLighting brightness={brightness} />
      <GlassDoors progressRef={progressRef} frameRef={frameRef} />
    </>
  );
}

interface DoorSceneCanvasProps {
  progressRef: MutableRefObject<number>;
  brightness: number;
  opacity: number;
}

export default function DoorSceneCanvas({
  progressRef,
  brightness,
  opacity,
}: DoorSceneCanvasProps) {
  return (
    <div
      className="door-scene-canvas fixed inset-0 z-[8]"
      style={{
        opacity,
        transition: "opacity 0.6s ease-out",
        pointerEvents: "none",
      }}
    >
      <Canvas
        shadows={false}
        dpr={1}
        gl={{ antialias: false, alpha: true, powerPreference: "default" }}
        style={{ width: "100%", height: "100%" }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
          gl.shadowMap.enabled = false;
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.14;
        }}
      >
        <LoadingBridge />
        <Suspense fallback={null}>
          <DoorSceneContent progressRef={progressRef} brightness={brightness} />
        </Suspense>
      </Canvas>
    </div>
  );
}
