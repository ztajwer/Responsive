"use client";

import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  OrbitControls,
  PerspectiveCamera,
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

function ProductModel({
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
  const { scene } = useGLTF(url);
  const productRoot = useMemo(() => scene.clone(true), [scene]);

  useLayoutEffect(() => {
    fitProductToSize(productRoot, displaySize);
    enhanceProductMaterials(productRoot);
  }, [productRoot, displaySize]);

  return (
    <group position={position} rotation={rotation}>
      <primitive object={productRoot} />
    </group>
  );
}

function TableProducts({ surfaceY }: { surfaceY: number }) {
  const { size } = useThree();
  const displaySize = useMemo(
    () => getProductDisplaySize(size.width, size.height),
    [size.width, size.height],
  );
  const layout = useMemo(
    () => getProductArcLayout(surfaceY, size.width, size.height, displaySize),
    [surfaceY, size.width, size.height, displaySize],
  );

  return (
    <group>
      <pointLight
        position={[0, surfaceY + 0.18, 0.32]}
        intensity={0.72}
        color="#FFF9F0"
        distance={4.5}
      />
      <spotLight
        position={[0, surfaceY + 0.35, 0.45]}
        angle={0.55}
        penumbra={0.85}
        intensity={1.1}
        color="#FFFFFF"
        distance={5}
      />
      {layout.map((item) => (
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
  const { scene } = useGLTF("/table-3d.glb");
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
        position={[0, shadow.groundY, 0.24]}
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
    useGLTF.preload("/table-3d.glb");
    PRODUCT_MODELS.forEach((url) => useGLTF.preload(url));
    return () => window.removeEventListener("resize", sync);
  }, []);

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
        dpr={mobile ? [1, 1.5] : [1, 1.25]}
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
