"use client";

import { Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  OrbitControls,
  PerspectiveCamera,
  useGLTF,
  useProgress,
} from "@react-three/drei";
import * as THREE from "three";
import {
  TABLE_DISPLAY,
  getTableCamera,
  getTableScale,
} from "@/lib/tableDisplay";

useGLTF.preload("/table-3d.glb");

interface JewelryHomeProps {
  visible: boolean;
}

function ResponsiveCamera() {
  const { size, camera } = useThree();
  const cam = getTableCamera(size.width);

  useLayoutEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    camera.position.set(...cam.position);
    camera.fov = cam.fov;
    camera.near = 0.1;
    camera.far = 100;
    camera.lookAt(...TABLE_DISPLAY.target);
    camera.updateProjectionMatrix();
  }, [camera, size.width, cam.fov, cam.position]);

  return (
    <PerspectiveCamera makeDefault position={cam.position} fov={cam.fov} near={0.1} far={100} />
  );
}

function DisplayFloor() {
  const y = TABLE_DISPLAY.target[1] + TABLE_DISPLAY.floor.yOffset;
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]} receiveShadow>
      <circleGeometry args={[TABLE_DISPLAY.floor.radius, 72]} />
      <meshPhysicalMaterial
        color="#F8F0EA"
        metalness={0.12}
        roughness={0.28}
        envMapIntensity={0.6}
        clearcoat={0.3}
        clearcoatRoughness={0.12}
      />
    </mesh>
  );
}

function TableModel() {
  const { scene } = useGLTF("/table-3d.glb");
  const groupRef = useRef<THREE.Group>(null);
  const { size } = useThree();
  const targetScale = getTableScale(size.width);

  useLayoutEffect(() => {
    if (!groupRef.current) return;

    const box = new THREE.Box3().setFromObject(scene);
    const modelSize = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    scene.position.set(-center.x, -center.y, -center.z);

    const footprint = Math.max(modelSize.x, modelSize.z);
    const height = modelSize.y;
    const fit = Math.max(footprint, height * 0.72);
    scene.scale.setScalar(targetScale / fit);

    scene.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((mat) => {
        if ("envMapIntensity" in mat) {
          (mat as THREE.MeshStandardMaterial).envMapIntensity = 1.4;
        }
      });
    });
  }, [scene, targetScale]);

  return (
    <group ref={groupRef} position={TABLE_DISPLAY.target}>
      <primitive object={scene} />
    </group>
  );
}

function LoadWatcher({ onReady }: { onReady: () => void }) {
  const { active } = useProgress();

  useEffect(() => {
    if (!active) onReady();
  }, [active, onReady]);

  return null;
}

function TableScene({ onReady }: { onReady: () => void }) {
  return (
    <>
      <ResponsiveCamera />
      <LoadWatcher onReady={onReady} />

      <OrbitControls
        makeDefault
        target={TABLE_DISPLAY.target}
        enableDamping
        dampingFactor={0.1}
        enableZoom={false}
        enablePan={false}
        rotateSpeed={0.65}
        minPolarAngle={0.32}
        maxPolarAngle={Math.PI / 2 - 0.12}
        mouseButtons={{
          LEFT: THREE.MOUSE.ROTATE,
          MIDDLE: THREE.MOUSE.ROTATE,
          RIGHT: THREE.MOUSE.ROTATE,
        }}
        touches={{
          ONE: THREE.TOUCH.ROTATE,
          TWO: THREE.TOUCH.ROTATE,
        }}
      />

      <ambientLight intensity={0.44} color="#FFF8F2" />
      <hemisphereLight args={["#FFFFFF", "#E8C4B8", 0.5]} />

      <directionalLight
        position={[2.2, 6, 4.2]}
        intensity={1.45}
        color="#FFFBF7"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={12}
        shadow-camera-left={-2.4}
        shadow-camera-right={2.4}
        shadow-camera-top={2.4}
        shadow-camera-bottom={-2.4}
        shadow-bias={-0.00006}
      />

      <spotLight position={[0, 3.8, 1.6]} angle={0.46} penumbra={0.95} intensity={2.1} color="#FFFFFF" distance={12} />
      <spotLight position={[-2, 3.4, 1]} angle={0.4} penumbra={1} intensity={1.25} color="#E8C4B8" distance={11} />
      <spotLight position={[2, 3.2, -0.6]} angle={0.4} penumbra={1} intensity={1.05} color="#C9A08A" distance={11} />
      <pointLight position={[0, 1.2, 2]} intensity={0.48} color="#D4AF37" distance={7.5} />

      <DisplayFloor />
      <TableModel />

      <ContactShadows
        position={[0, TABLE_DISPLAY.target[1] + TABLE_DISPLAY.floor.yOffset + 0.002, 0]}
        opacity={TABLE_DISPLAY.shadow.opacity}
        scale={TABLE_DISPLAY.shadow.scale}
        blur={TABLE_DISPLAY.shadow.blur}
        far={2.8}
        color="#3D2B1F"
      />

      <Suspense fallback={null}>
        <Environment preset="apartment" environmentIntensity={0.75} background={false} />
      </Suspense>
    </>
  );
}

function TableLoader() {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-4">
      <div className="h-px w-16 bg-gradient-to-r from-transparent via-maj-gold/70 to-transparent" />
      <p className="animate-gentle-pulse font-sans text-[10px] uppercase tracking-[0.35em] text-maj-brown/50">
        Loading
      </p>
    </div>
  );
}

export default function JewelryHome({ visible }: JewelryHomeProps) {
  const [loading, setLoading] = useState(true);
  const handleReady = useCallback(() => setLoading(false), []);

  return (
    <div
      className="relative h-full w-full"
      style={{
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
        transition: "opacity 1.3s cubic-bezier(0.22, 1, 0.36, 1) 0.15s",
      }}
    >
      {loading && <TableLoader />}

      <Canvas
        shadows
        dpr={[1, 2]}
        className="absolute inset-0 h-full w-full"
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
        }}
        style={{ width: "100%", height: "100%", cursor: visible ? "grab" : "default" }}
        onCreated={({ gl }) => {
          gl.setClearColor(0xfaf6f1, 1);
          gl.shadowMap.enabled = true;
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.08;
        }}
      >
        <Suspense fallback={null}>
          <TableScene onReady={handleReady} />
        </Suspense>
      </Canvas>
    </div>
  );
}
