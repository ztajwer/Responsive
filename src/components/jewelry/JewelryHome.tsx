"use client";

import { Suspense, memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  OrbitControls,
  PerspectiveCamera,
  useCursor,
  useGLTF,
} from "@react-three/drei";
import * as THREE from "three";
import {
  TABLE_POLAR_ANGLE,
  getTableCamera,
  getTablePosition,
  getTableScale,
  getTableShadow,
  getTableTarget,
  getTableViewOffsetY,
} from "@/lib/tableDisplay";
import {
  getProductArcLayout,
  getProductDisplaySize,
  PRODUCT_MODELS,
} from "@/lib/productDisplay";
import { TABLE_MODEL_URL } from "@/lib/modelAssets";

interface JewelryHomeProps {
  visible: boolean;
}

const GOLD_MAIN = new THREE.Color("#E3BD9B");
const GOLD_LIGHT = new THREE.Color("#EDD0B5");
const GOLD_SHADE = new THREE.Color("#CFA882");
const GOLD_WARM = new THREE.Color("#E8C89A");

function applyTableMaterials(root: THREE.Object3D) {
  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh || !mesh.material) return;

    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    mats.forEach((mat) => {
      const name = (mesh.name + (mat.name || "")).toLowerCase();
      const isGlass =
        name.includes("glass") ||
        ("transparent" in mat && mat.transparent) ||
        ("opacity" in mat && typeof mat.opacity === "number" && mat.opacity < 0.92);

      if (isGlass && "color" in mat && mat.color instanceof THREE.Color) {
        mat.color.set("#FFFEF9");
        if ("metalness" in mat) mat.metalness = 0.05;
        if ("roughness" in mat) mat.roughness = 0.04;
        if ("envMapIntensity" in mat) mat.envMapIntensity = 0.7;
        return;
      }

      if (!("color" in mat) || !(mat.color instanceof THREE.Color)) return;

      const isLeg = name.includes("leg") || name.includes("base") || name.includes("bottom");
      const base = isLeg ? GOLD_SHADE : GOLD_MAIN;
      mat.color.copy(base).lerp(isLeg ? GOLD_WARM : GOLD_LIGHT, isLeg ? 0.28 : 0.42);

      if ("emissive" in mat && mat.emissive instanceof THREE.Color) {
        mat.emissive.set("#4A3A20").multiplyScalar(isLeg ? 0.03 : 0.045);
      }
      if ("metalness" in mat) mat.metalness = isLeg ? 0.58 : 0.64;
      if ("roughness" in mat) mat.roughness = isLeg ? 0.28 : 0.22;
      if ("envMapIntensity" in mat) mat.envMapIntensity = 0.88;
    });
  });
}

function fitModelToSize(root: THREE.Object3D, targetSize: number) {
  root.scale.set(1, 1, 1);
  root.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  root.position.set(-center.x, -box.min.y, -center.z);

  const maxDim = Math.max(size.x, size.y, size.z);
  if (maxDim > 0) {
    root.scale.setScalar(targetSize / maxDim);
  }
}

function fitProductToSize(root: THREE.Object3D, targetSize: number) {
  root.scale.set(1, 1, 1);
  root.position.set(0, 0, 0);
  root.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  if (maxDim > 0) {
    root.scale.setScalar(targetSize / maxDim);
  }

  root.updateMatrixWorld(true);
  const fitted = new THREE.Box3().setFromObject(root);
  const center = fitted.getCenter(new THREE.Vector3());
  root.position.set(-center.x, -fitted.min.y, -center.z);
}

function enhanceProductMaterials(root: THREE.Object3D) {
  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = false;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    mats.forEach((mat) => {
      if ("envMapIntensity" in mat) mat.envMapIntensity = 1.4;
      if ("metalness" in mat && typeof mat.metalness === "number") {
        mat.metalness = Math.min(1, mat.metalness + 0.08);
      }
      if ("roughness" in mat && typeof mat.roughness === "number") {
        mat.roughness = Math.max(0.08, mat.roughness * 0.85);
      }
    });
  });
}

const HOVER_LIFT = 0.042;
const HOVER_SCALE = 1.06;
const GLITTER_COUNT = 34;

interface ProductBounds {
  radius: number;
  height: number;
}

interface GlitterParticle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
}

function ProductGlitter({
  active,
  radius,
  height,
}: {
  active: boolean;
  radius: number;
  height: number;
}) {
  const pointsRef = useRef<THREE.Points>(null);
  const intensityRef = useRef(0);
  const particles = useRef<GlitterParticle[]>(
    Array.from({ length: GLITTER_COUNT }, () => ({
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      life: 1,
      maxLife: 1,
    })),
  );

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(GLITTER_COUNT * 3), 3));
    return geo;
  }, []);

  useFrame((_, delta) => {
    intensityRef.current = THREE.MathUtils.lerp(
      intensityRef.current,
      active ? 1 : 0,
      Math.min(1, delta * 9),
    );

    const points = pointsRef.current;
    if (!points || intensityRef.current < 0.02) return;

    const pos = points.geometry.attributes.position as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    const spawnRate = intensityRef.current * delta * 16;

    for (let i = 0; i < GLITTER_COUNT; i++) {
      const p = particles.current[i];

      if (p.life >= p.maxLife) {
        if (Math.random() < spawnRate) {
          p.x = (Math.random() - 0.5) * radius * 1.7;
          p.y = height * (0.5 + Math.random() * 0.5);
          p.z = (Math.random() - 0.5) * radius * 1.7;
          p.vx = (Math.random() - 0.5) * 0.14;
          p.vy = -(0.18 + Math.random() * 0.28);
          p.vz = (Math.random() - 0.5) * 0.14;
          p.life = 0;
          p.maxLife = 0.45 + Math.random() * 0.55;
        } else {
          arr[i * 3 + 1] = -100;
          continue;
        }
      }

      p.life += delta;
      p.x += p.vx * delta;
      p.y += p.vy * delta;
      p.z += p.vz * delta;
      p.vy -= delta * 0.55;

      if (p.life < p.maxLife && p.y > -0.04) {
        arr[i * 3] = p.x;
        arr[i * 3 + 1] = p.y;
        arr[i * 3 + 2] = p.z;
      } else {
        p.life = p.maxLife;
        arr[i * 3 + 1] = -100;
      }
    }

    pos.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        size={0.016}
        color="#FFF6D8"
        transparent
        opacity={0.92}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
}

const ProductModel = memo(function ProductModel({
  url,
  position,
  rotation,
  displaySize,
}: {
  url: string;
  position: [number, number, number];
  rotation: [number, number, number];
  displaySize: number;
}) {
  const { gl } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.PointLight>(null);
  const hoverRef = useRef(0);
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);
  const [bounds, setBounds] = useState<ProductBounds>({
    radius: displaySize * 0.35,
    height: displaySize * 0.5,
  });
  const { scene: modelScene } = useGLTF(url);
  const productRoot = useMemo(() => modelScene.clone(true), [modelScene]);

  useLayoutEffect(() => {
    fitProductToSize(productRoot, displaySize);
    enhanceProductMaterials(productRoot);

    const box = new THREE.Box3().setFromObject(productRoot);
    const size = box.getSize(new THREE.Vector3());
    setBounds({
      radius: Math.max(size.x, size.z) * 0.52,
      height: size.y,
    });
  }, [productRoot, displaySize]);

  useFrame((_, delta) => {
    const target = hovered ? 1 : 0;
    hoverRef.current = THREE.MathUtils.lerp(hoverRef.current, target, Math.min(1, delta * 11));
    const t = hoverRef.current;

    if (!groupRef.current) return;
    groupRef.current.position.set(position[0], position[1] + t * HOVER_LIFT, position[2]);
    groupRef.current.rotation.set(rotation[0], rotation[1], rotation[2]);
    groupRef.current.scale.setScalar(1 + t * (HOVER_SCALE - 1));

    if (glowRef.current) {
      glowRef.current.intensity = t * 1.35;
    }
  });

  const handlePointerOver = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation();
      setHovered(true);
      gl.domElement.style.cursor = "pointer";
    },
    [gl],
  );

  const handlePointerOut = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation();
      setHovered(false);
      gl.domElement.style.cursor = "grab";
    },
    [gl],
  );

  const handlePointerDown = useCallback((event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    setHovered(true);
  }, []);

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      <primitive object={productRoot} />

      <mesh
        position={[0, bounds.height * 0.5, 0]}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onPointerDown={handlePointerDown}
        visible={false}
      >
        <boxGeometry args={[bounds.radius * 2.35, bounds.height * 1.12, bounds.radius * 2.35]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <ProductGlitter active={hovered} radius={bounds.radius} height={bounds.height} />

      <pointLight
        ref={glowRef}
        position={[0, bounds.height * 0.55, 0]}
        intensity={0}
        color="#FFF4D6"
        distance={displaySize * 5}
      />
    </group>
  );
});

function TableProducts({ surfaceY }: { surfaceY: number }) {
  const { size } = useThree();
  const [visibleCount, setVisibleCount] = useState(1);
  const displaySize = useMemo(
    () => getProductDisplaySize(size.width, size.height),
    [size.width, size.height],
  );
  const layout = useMemo(
    () => getProductArcLayout(surfaceY, size.width, size.height, displaySize),
    [surfaceY, size.width, size.height, displaySize],
  );

  useEffect(() => {
    layout.slice(0, visibleCount).forEach((item) => useGLTF.preload(item.url));
  }, [layout, visibleCount]);

  useEffect(() => {
    if (visibleCount >= layout.length) return;
    const id = window.setTimeout(() => setVisibleCount((count) => count + 1), 320);
    return () => window.clearTimeout(id);
  }, [visibleCount, layout.length]);

  const visibleLayout = useMemo(
    () => layout.slice(0, visibleCount),
    [layout, visibleCount],
  );

  return (
    <group>
      <pointLight
        position={[0, surfaceY + 0.18, 0.4]}
        intensity={0.72}
        color="#FFF9F0"
        distance={4.5}
      />
      <spotLight
        position={[0, surfaceY + 0.35, 0.53]}
        angle={0.55}
        penumbra={0.85}
        intensity={1.1}
        color="#FFFFFF"
        distance={5}
      />
      {visibleLayout.map((item) => (
        <Suspense key={item.url} fallback={null}>
          <ProductModel
            url={item.url}
            position={item.position}
            rotation={item.rotation}
            displaySize={item.displaySize}
          />
        </Suspense>
      ))}
    </group>
  );
}

function ResponsiveCamera() {
  const { size, camera } = useThree();
  const cam = getTableCamera(size.width);
  const target = getTableTarget(size.width);

  useLayoutEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    camera.position.set(...cam.position);
    camera.fov = cam.fov;
    camera.near = 0.05;
    camera.far = 100;
    camera.lookAt(...target);

    const offsetY = getTableViewOffsetY(size.width, size.height);
    camera.setViewOffset(size.width, size.height, 0, size.height * offsetY, size.width, size.height);
    camera.updateProjectionMatrix();
  }, [camera, size.width, size.height, cam.fov, cam.position, target]);

  return (
    <PerspectiveCamera makeDefault position={cam.position} fov={cam.fov} near={0.05} far={100} />
  );
}

function TableModel({
  onReady,
  onSurfaceY,
}: {
  onReady: () => void;
  onSurfaceY: (y: number) => void;
}) {
  const { scene } = useGLTF(TABLE_MODEL_URL);
  const groupRef = useRef<THREE.Group>(null);
  const { size } = useThree();
  const targetScale = getTableScale(size.width, size.height);
  const tablePos = getTablePosition(size.width);
  const readyRef = useRef(false);

  const tableRoot = useMemo(() => scene.clone(true), [scene]);

  useLayoutEffect(() => {
    fitModelToSize(tableRoot, targetScale);
    applyTableMaterials(tableRoot);

    const box = new THREE.Box3().setFromObject(tableRoot);
    onSurfaceY(tablePos[1] + box.max.y);

    if (!readyRef.current) {
      readyRef.current = true;
      onReady();
    }
  }, [tableRoot, targetScale, tablePos, onReady, onSurfaceY]);

  return (
    <group ref={groupRef} position={tablePos}>
      <primitive object={tableRoot} />
    </group>
  );
}

function TableScene({
  onReady,
  showProducts,
}: {
  onReady: () => void;
  showProducts: boolean;
}) {
  const [surfaceY, setSurfaceY] = useState<number | null>(null);
  const handleSurfaceY = useCallback((y: number) => setSurfaceY(y), []);
  const { size } = useThree();
  const target = getTableTarget(size.width);
  const shadow = getTableShadow(size.width);
  const mobile = size.width < 768;

  return (
    <>
      <ResponsiveCamera />

      <OrbitControls
        makeDefault
        target={target}
        enableDamping
        dampingFactor={0.14}
        enableZoom={false}
        enablePan={false}
        rotateSpeed={mobile ? 0.45 : 0.4}
        minPolarAngle={TABLE_POLAR_ANGLE}
        maxPolarAngle={TABLE_POLAR_ANGLE}
        mouseButtons={{ LEFT: THREE.MOUSE.ROTATE }}
        touches={{ ONE: THREE.TOUCH.ROTATE }}
      />

      <ambientLight intensity={mobile ? 0.64 : 0.6} color="#FFF8F0" />
      <hemisphereLight args={["#FFFCF5", "#E8D0A0", mobile ? 0.55 : 0.48]} />

      <directionalLight
        position={[0.4, 5.2, 2.4]}
        intensity={mobile ? 0.92 : 1.05}
        color="#FFF5E6"
        castShadow={!mobile}
        shadow-mapSize={[512, 512]}
        shadow-camera-far={10}
        shadow-camera-left={-1.8}
        shadow-camera-right={1.8}
        shadow-camera-top={1.8}
        shadow-camera-bottom={-1.8}
        shadow-bias={-0.0001}
      />

      <spotLight position={[0, 3.6, 1.6]} angle={0.42} penumbra={0.95} intensity={1.25} color="#FFFAF0" distance={14} />
      <pointLight position={[0, 1.2, 2.2]} intensity={0.4} color="#F5E6C8" distance={8} />
      <pointLight position={[0.5, 0.6, 1.4]} intensity={0.35} color="#FAECC8" distance={5} />

      <TableModel onReady={onReady} onSurfaceY={handleSurfaceY} />

      {surfaceY !== null && showProducts && <TableProducts surfaceY={surfaceY} />}

      <ContactShadows
        position={[0, shadow.groundY, 0.32]}
        opacity={shadow.opacity}
        scale={shadow.scale}
        blur={shadow.blur}
        far={2}
        color="#2A2018"
      />

      <Suspense fallback={null}>
        <Environment preset="studio" background={false} environmentIntensity={0.75} />
      </Suspense>
    </>
  );
}

function TableLoader() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-8 z-10 flex justify-center">
      <div className="h-px w-20 bg-gradient-to-r from-transparent via-maj-gold/80 to-transparent" />
    </div>
  );
}

export default function JewelryHome({ visible }: JewelryHomeProps) {
  const [tableReady, setTableReady] = useState(false);
  const [mobile, setMobile] = useState(false);
  const handleReady = useCallback(() => setTableReady(true), []);

  useEffect(() => {
    const sync = () => setMobile(window.innerWidth < 768);
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  useEffect(() => {
    if (!visible) return;
    useGLTF.preload(TABLE_MODEL_URL);
  }, [visible]);

  return (
    <div
      className="shop-table-layer absolute inset-0"
      style={{
        opacity: visible ? 1 : 0,
        pointerEvents: visible && tableReady ? "auto" : "none",
        transition: "opacity 1s cubic-bezier(0.22, 1, 0.36, 1) 0.1s",
        cursor: visible && tableReady ? "grab" : "default",
      }}
      onWheel={(e) => e.preventDefault()}
    >
      {visible && !tableReady && <TableLoader />}

      <Canvas
        shadows={!mobile}
        dpr={mobile ? [1, 1.5] : [1, 1.15]}
        className="h-full w-full"
        gl={{
          antialias: !mobile,
          alpha: true,
          powerPreference: "high-performance",
        }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
          gl.shadowMap.enabled = !mobile;
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = mobile ? 1.06 : 1.04;
          gl.domElement.addEventListener("webglcontextlost", (e) => e.preventDefault(), false);
        }}
      >
        <Suspense fallback={null}>
          <TableScene onReady={handleReady} showProducts={tableReady} />
        </Suspense>
      </Canvas>
    </div>
  );
}
