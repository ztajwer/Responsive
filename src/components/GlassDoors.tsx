"use client";

import { useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import type { DoorFrameState } from "@/lib/doorFraming";

interface GlassDoorsProps {
  progressRef: MutableRefObject<number>;
  frameRef?: MutableRefObject<DoorFrameState>;
  animRef?: MutableRefObject<{ phase: string }>;
}

export const PANEL_W = 1.28;
export const PANEL_H = 2.84;
export const DOOR_ASSEMBLY_H = PANEL_H + 0.2;
const PANEL_D = 0.05;
const MAX_OPEN = Math.PI * 0.44;
const HANDLE_Y = -0.04;
const HANDLE_X = PANEL_W * 0.38;

const GOLD = "#D4AF37";
const GOLD_LIGHT = "#F0D878";
const GOLD_DEEP = "#B8892A";
const GOLD_RICH = "#C9A030";

function GoldMat({ roughness = 0.14, color = GOLD }: { roughness?: number; color?: string }) {
  return (
    <meshPhysicalMaterial
      color={color}
      metalness={0.99}
      roughness={roughness}
      envMapIntensity={1.45}
      clearcoat={0.75}
      clearcoatRoughness={0.06}
    />
  );
}

function GoldenGlassMat() {
  return (
    <meshPhysicalMaterial
      color="#E8C872"
      metalness={0.48}
      roughness={0.05}
      transmission={0.48}
      thickness={0.85}
      ior={1.52}
      envMapIntensity={1.55}
      transparent
      opacity={0.92}
      side={THREE.DoubleSide}
      reflectivity={0.88}
      attenuationColor="#D4AF37"
      attenuationDistance={0.55}
    />
  );
}

function DoorHandle({ side }: { side: "left" | "right" }) {
  const x = side === "left" ? HANDLE_X : -HANDLE_X;

  return (
    <group position={[x, HANDLE_Y, PANEL_D / 2 + 0.05]}>
      <mesh position={[0, 0, -0.014]} castShadow>
        <boxGeometry args={[0.065, 0.28, 0.018]} />
        <GoldMat roughness={0.22} color={GOLD_DEEP} />
      </mesh>
      <mesh position={[0, 0, -0.008]} castShadow>
        <boxGeometry args={[0.048, 0.24, 0.01]} />
        <GoldMat roughness={0.12} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]} position={[0, 0, 0.065]} castShadow>
        <cylinderGeometry args={[0.013, 0.013, 0.22, 24]} />
        <GoldMat roughness={0.1} color={GOLD_LIGHT} />
      </mesh>
      {[-0.09, 0.09].map((offset) => (
        <mesh key={offset} position={[0, offset, 0.032]} castShadow>
          <cylinderGeometry args={[0.009, 0.009, 0.065, 14]} />
          <GoldMat roughness={0.15} />
        </mesh>
      ))}
      <mesh position={[0, -0.13, 0.025]} castShadow>
        <cylinderGeometry args={[0.016, 0.016, 0.032, 16]} />
        <meshPhysicalMaterial color="#2A2018" metalness={0.92} roughness={0.12} envMapIntensity={0.8} />
      </mesh>
    </group>
  );
}

function DoorPanel({
  side,
  targetAngleRef,
  animRef,
}: {
  side: "left" | "right";
  targetAngleRef: MutableRefObject<number>;
  animRef?: MutableRefObject<{ phase: string }>;
}) {
  const pivotRef = useRef<THREE.Group>(null);
  const angle = useRef(0);

  const hingeX = side === "left" ? -PANEL_W : PANEL_W;
  const panelCenterX = side === "left" ? PANEL_W / 2 : -PANEL_W / 2;
  const openDir = side === "left" ? -1 : 1;
  const hingeEdgeX = side === "left" ? -PANEL_W / 2 : PANEL_W / 2;

  useFrame((_, delta) => {
    if (!pivotRef.current) return;
    const target = targetAngleRef.current * openDir;
    const phase = animRef?.current.phase;
    if (phase === "complete") {
      angle.current = target;
    } else {
      const follow = phase === "opening" ? 20 : 10;
      angle.current = THREE.MathUtils.lerp(angle.current, target, Math.min(1, delta * follow));
    }
    pivotRef.current.rotation.y = angle.current;
  });

  return (
    <group position={[hingeX, 0, 0]}>
      <group ref={pivotRef}>
        <group position={[panelCenterX, 0, 0]}>
          <mesh position={[0, 0, -PANEL_D / 2 - 0.014]} castShadow receiveShadow>
            <boxGeometry args={[PANEL_W + 0.08, PANEL_H + 0.08, 0.05]} />
            <GoldMat roughness={0.1} color={GOLD_DEEP} />
          </mesh>
          <mesh position={[0, 0, -PANEL_D / 2 - 0.005]} castShadow>
            <boxGeometry args={[PANEL_W + 0.03, PANEL_H + 0.03, 0.028]} />
            <GoldMat roughness={0.12} color={GOLD_RICH} />
          </mesh>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[PANEL_W - 0.1, PANEL_H - 0.1, PANEL_D]} />
            <GoldenGlassMat />
          </mesh>
          <DoorHandle side={side} />
          {[PANEL_H * 0.38, 0, -PANEL_H * 0.38].map((y) => (
            <group key={y} position={[hingeEdgeX, y, -0.01]}>
              <mesh castShadow>
                <cylinderGeometry args={[0.018, 0.018, 0.08, 16]} />
                <GoldMat roughness={0.28} color={GOLD_DEEP} />
              </mesh>
              <mesh position={[side === "left" ? 0.04 : -0.04, 0, 0]} castShadow>
                <boxGeometry args={[0.055, 0.038, 0.038]} />
                <GoldMat roughness={0.25} />
              </mesh>
            </group>
          ))}
        </group>
      </group>
    </group>
  );
}

function DoorFrame() {
  const totalW = PANEL_W * 2 + 0.14;

  return (
    <group>
      <mesh position={[0, 0, 0.012]} castShadow>
        <boxGeometry args={[0.032, PANEL_H + 0.04, 0.058]} />
        <GoldMat roughness={0.13} />
      </mesh>
      <mesh position={[0, PANEL_H / 2 + 0.12, 0.005]} castShadow>
        <boxGeometry args={[totalW * 0.6, 0.07, 0.04]} />
        <GoldMat roughness={0.1} color={GOLD_LIGHT} />
      </mesh>
      <mesh position={[0, -PANEL_H / 2 - 0.01, 0.07]} castShadow>
        <boxGeometry args={[totalW + 0.15, 0.014, 0.035]} />
        <GoldMat roughness={0.1} />
      </mesh>
    </group>
  );
}

export default function GlassDoors({ progressRef, frameRef, animRef }: GlassDoorsProps) {
  const leftTargetRef = useRef(0);
  const rightTargetRef = useRef(0);
  const shadowMatRef = useRef<THREE.ShadowMaterial>(null);
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    const p = progressRef.current;
    leftTargetRef.current = p * MAX_OPEN;
    const delayed = Math.max(0, (p - 0.06) / 0.94);
    rightTargetRef.current = delayed * MAX_OPEN;

    if (shadowMatRef.current) {
      shadowMatRef.current.opacity = 0.14 + p * 0.16;
    }

    if (groupRef.current && frameRef) {
      const { scale, groupZ } = frameRef.current;
      groupRef.current.scale.set(scale.x, scale.y, scale.x);
      groupRef.current.position.z = groupZ;
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      <DoorFrame />
      <DoorPanel side="left" targetAngleRef={leftTargetRef} animRef={animRef} />
      <DoorPanel side="right" targetAngleRef={rightTargetRef} animRef={animRef} />
      <mesh position={[0, -PANEL_H / 2 - 0.026, 0.22]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[12, 5]} />
        <shadowMaterial ref={shadowMatRef} transparent opacity={0.14} color="#4A3728" />
      </mesh>
    </group>
  );
}
