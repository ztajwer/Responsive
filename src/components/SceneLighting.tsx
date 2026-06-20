"use client";

import { Suspense } from "react";
import { ContactShadows, Environment } from "@react-three/drei";
import { PANEL_H } from "./GlassDoors";

function EnvironmentMap({ intensity }: { intensity: number }) {
  return (
    <Environment
      preset="apartment"
      environmentIntensity={0.52 + intensity * 0.38}
      background={false}
    />
  );
}

interface SceneLightingProps {
  brightness?: number;
}

export default function SceneLighting({ brightness = 0 }: SceneLightingProps) {
  const b = brightness;

  return (
    <>
      <ambientLight intensity={0.38 + b * 0.45} color="#FFF9F5" />
      <hemisphereLight args={["#FFFFFF", "#D8CEC4", 0.42 + b * 0.28]} />

      <directionalLight
        position={[0, 6, 7]}
        intensity={1.05 + b * 0.75}
        color="#FFF8F2"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-3.5}
        shadow-camera-right={3.5}
        shadow-camera-top={3.5}
        shadow-camera-bottom={-3.5}
        shadow-camera-near={0.5}
        shadow-camera-far={18}
        shadow-bias={-0.00012}
        shadow-normalBias={0.018}
      />

      <directionalLight position={[-4, 1.5, 3]} intensity={0.32 + b * 0.22} color="#FFE8C0" />
      <directionalLight position={[4, 1.5, 3]} intensity={0.32 + b * 0.22} color="#FFE8C0" />

      <pointLight position={[0, 2.5, 4.5]} intensity={0.48 + b * 0.35} color="#FFF5EB" distance={14} />
      <pointLight position={[-1.8, 0.5, 3.5]} intensity={0.28 + b * 0.22} color="#E8C4B8" distance={11} />
      <pointLight position={[1.8, 0.5, 3.5]} intensity={0.28 + b * 0.22} color="#D4AF37" distance={11} />
      <spotLight
        position={[0, 3, 5]}
        angle={0.42}
        penumbra={0.65}
        intensity={0.55 + b * 0.4}
        color="#FFFDF8"
        distance={16}
        castShadow={false}
      />

      <Suspense fallback={null}>
        <EnvironmentMap intensity={b} />
      </Suspense>

      <ContactShadows
        position={[0, -PANEL_H / 2 - 0.08, 0.14]}
        opacity={0.36 + b * 0.16}
        scale={8.5}
        blur={2.6}
        far={2.4}
        color="#3D2B1F"
      />
    </>
  );
}
