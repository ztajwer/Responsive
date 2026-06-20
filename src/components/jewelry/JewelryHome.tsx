"use client";

import { Suspense, memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import {
  ContactShadows,
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
} from "@/lib/tableDisplay";
import {
  getProductDisplaySize,
  getProductRowLayout,
} from "@/lib/productDisplay";
import { extendGltfLoader, getTableModelUrl } from "@/lib/modelAssets";
import { colors } from "@/lib/colors";

interface JewelryHomeProps {
  visible: boolean;
}

const TABLE_COLOR = colors.table;
const TABLE_LEG_COLOR = colors.tableLeg;
/** Table size + placement */
const TABLE_HEIGHT_FRACTION = 0.218;
const TABLE_MAX_WIDTH_FRACTION = 0.68;
const TABLE_CENTER_NDC_TARGET = -0.18;
const HOVER_LIFT = 0.044;
const HOVER_SCALE = 1.12;

function getTableCenterY(root: THREE.Object3D, tablePos: [number, number, number]) {
  const box = new THREE.Box3().setFromObject(root);
  return tablePos[1] + (box.min.y + box.max.y) / 2;
}

function resolveTableViewOffsetY(
  camera: THREE.PerspectiveCamera,
  width: number,
  height: number,
  tablePos: [number, number, number],
  tableCenterY: number,
) {
  const anchor = new THREE.Vector3();
  let low = -0.12;
  let high = 0.45;

  for (let i = 0; i < 22; i++) {
    const mid = (low + high) / 2;
    camera.setViewOffset(width, height, 0, height * mid, width, height);
    camera.updateProjectionMatrix();
    anchor.set(0, tableCenterY, tablePos[2]).project(camera);

    if (anchor.y > TABLE_CENTER_NDC_TARGET) {
      high = mid;
    } else {
      low = mid;
    }
  }

  const offsetY = (low + high) / 2;
  camera.setViewOffset(width, height, 0, height * offsetY, width, height);
  camera.updateProjectionMatrix();

  return offsetY;
}

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
        if ("metalness" in mat) mat.metalness = 0.02;
        if ("roughness" in mat) mat.roughness = 0.14;
        if ("envMapIntensity" in mat) mat.envMapIntensity = 0.06;
        return;
      }

      if (!("color" in mat) || !(mat.color instanceof THREE.Color)) return;

      const isLeg = name.includes("leg") || name.includes("base") || name.includes("bottom");
      mat.color.set(isLeg ? TABLE_LEG_COLOR : TABLE_COLOR);
      mat.color.offsetHSL(0, 0.04, 0.06);

      if ("emissive" in mat && mat.emissive instanceof THREE.Color) {
        mat.emissive.set("#000000");
      }
      if ("metalness" in mat) mat.metalness = 0;
      if ("roughness" in mat) mat.roughness = isLeg ? 0.82 : 0.78;
      if ("envMapIntensity" in mat) mat.envMapIntensity = 0.03;
    });
  });
}

function fitTableToSize(root: THREE.Object3D, targetSize: number) {
  root.scale.set(1, 1, 1);
  root.position.set(0, 0, 0);
  root.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  root.position.set(-center.x, -box.min.y, -center.z);

  const maxDim = Math.max(size.x, size.y, size.z);
  if (maxDim > 0) {
    root.scale.setScalar(targetSize / maxDim);
  }

  root.updateMatrixWorld(true);
  const fitted = new THREE.Box3().setFromObject(root);
  root.position.y -= fitted.min.y;
}

function measureTableScreenHeightFraction(
  root: THREE.Object3D,
  tablePos: [number, number, number],
  camera: THREE.Camera,
) {
  const box = new THREE.Box3().setFromObject(root);
  const bottom = new THREE.Vector3(0, tablePos[1], tablePos[2]);
  const top = new THREE.Vector3(0, tablePos[1] + box.max.y, tablePos[2]);
  bottom.project(camera);
  top.project(camera);
  return Math.abs(top.y - bottom.y) / 2;
}

function measureTableScreenWidthFraction(
  root: THREE.Object3D,
  tablePos: [number, number, number],
  camera: THREE.Camera,
) {
  const box = new THREE.Box3().setFromObject(root);
  const left = new THREE.Vector3(tablePos[0] + box.min.x, tablePos[1], tablePos[2]);
  const right = new THREE.Vector3(tablePos[0] + box.max.x, tablePos[1], tablePos[2]);
  left.project(camera);
  right.project(camera);
  return Math.abs(right.x - left.x) / 2;
}

function scaleTableToFitViewport(
  root: THREE.Object3D,
  tablePos: [number, number, number],
  camera: THREE.Camera,
  targetHeightFraction: number,
  maxWidthFraction: number,
) {
  const heightFraction = measureTableScreenHeightFraction(root, tablePos, camera);
  if (heightFraction > 0.001) {
    root.scale.multiplyScalar(targetHeightFraction / heightFraction);
    root.updateMatrixWorld(true);
    const fitted = new THREE.Box3().setFromObject(root);
    root.position.y -= fitted.min.y;
  }

  const widthFraction = measureTableScreenWidthFraction(root, tablePos, camera);
  if (widthFraction > maxWidthFraction) {
    root.scale.multiplyScalar(maxWidthFraction / widthFraction);
    root.updateMatrixWorld(true);
    const fitted = new THREE.Box3().setFromObject(root);
    root.position.y -= fitted.min.y;
  }

  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  root.position.x -= (tablePos[0] + (box.min.x + box.max.x) / 2);
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

function fitProductToUniformSize(root: THREE.Object3D, targetHeight: number) {
  root.scale.set(1, 1, 1);
  root.position.set(0, 0, 0);
  root.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  if (size.y > 0) {
    root.scale.setScalar(targetHeight / size.y);
  }

  root.updateMatrixWorld(true);
  const fitted = new THREE.Box3().setFromObject(root);
  const center = fitted.getCenter(new THREE.Vector3());
  root.position.set(-center.x, -fitted.min.y, -center.z);
}

function setupProductColors(root: THREE.Object3D) {
  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh || !mesh.material) return;
    mesh.castShadow = true;
    mesh.receiveShadow = false;

    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    mats.forEach((mat) => {
      if ("transparent" in mat && mat.transparent) return;
      if ("color" in mat && mat.color instanceof THREE.Color) {
        mat.color.offsetHSL(0, 0.05, 0.09);
      }
      if ("metalness" in mat && typeof mat.metalness === "number") {
        mat.metalness = 0;
      }
      if ("roughness" in mat && typeof mat.roughness === "number") {
        mat.roughness = Math.max(mat.roughness, 0.72);
      }
      if ("envMapIntensity" in mat) mat.envMapIntensity = 0;
      if ("emissive" in mat && mat.emissive instanceof THREE.Color) {
        mat.emissive.set("#000000");
      }
    });
  });
}

const GLITTER_COUNT = 38;

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
    const spawnRate = intensityRef.current * delta * 26;

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
        size={0.022}
        color="#FFF6DC"
        transparent
        opacity={0.88}
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
  const hoverRef = useRef(0);
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);
  const [bounds, setBounds] = useState<ProductBounds>({
    radius: displaySize * 0.35,
    height: displaySize * 0.5,
  });
  const { scene: productRoot } = useGLTF(url, false, false, extendGltfLoader);

  useLayoutEffect(() => {
    fitProductToUniformSize(productRoot, displaySize);
    setupProductColors(productRoot);

    const box = new THREE.Box3().setFromObject(productRoot);
    const size = box.getSize(new THREE.Vector3());
    setBounds({
      radius: Math.max(size.x, size.z) * 0.52,
      height: size.y,
    });
  }, [productRoot, displaySize]);

  useFrame((_, delta) => {
    const target = hovered ? 1 : 0;
    hoverRef.current = THREE.MathUtils.lerp(hoverRef.current, target, Math.min(1, delta * 13));
    const t = hoverRef.current;
    const ease = t * t * (3 - 2 * t);

    if (!groupRef.current) return;
    groupRef.current.position.set(position[0], position[1] + ease * HOVER_LIFT, position[2]);
    groupRef.current.rotation.set(rotation[0], rotation[1] + ease * 0.05, rotation[2]);
    groupRef.current.scale.setScalar(1 + ease * (HOVER_SCALE - 1));
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
    </group>
  );
});

function TableProducts({
  surfaceY,
  tableTopWidth,
}: {
  surfaceY: number;
  tableTopWidth: number;
}) {
  const { size } = useThree();
  const displaySize = useMemo(
    () => getProductDisplaySize(size.width, size.height, tableTopWidth),
    [size.width, size.height, tableTopWidth],
  );
  const layout = useMemo(
    () => getProductRowLayout(surfaceY, size.width, size.height, displaySize, tableTopWidth),
    [surfaceY, size.width, size.height, displaySize, tableTopWidth],
  );

  return (
    <group>
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
    camera.updateProjectionMatrix();
  }, [camera, size.width, size.height, cam.fov, cam.position, target]);

  return (
    <PerspectiveCamera makeDefault position={cam.position} fov={cam.fov} near={0.05} far={100} />
  );
}

function TableModel({
  onReady,
  onSurfaceY,
  onTableMetrics,
}: {
  onReady: () => void;
  onSurfaceY: (y: number) => void;
  onTableMetrics: (metrics: { topWidth: number }) => void;
}) {
  const tableUrl = useMemo(() => getTableModelUrl(), []);
  const { scene: tableRoot } = useGLTF(tableUrl, false, false, extendGltfLoader);
  const groupRef = useRef<THREE.Group>(null);
  const { size, camera } = useThree();
  const targetScale = getTableScale(size.width, size.height);
  const tablePos = getTablePosition(size.width);
  const readyRef = useRef(false);

  useLayoutEffect(() => {
    fitTableToSize(tableRoot, targetScale);
    applyTableMaterials(tableRoot);

    if (camera instanceof THREE.PerspectiveCamera) {
      const centerY = getTableCenterY(tableRoot, tablePos);
      resolveTableViewOffsetY(camera, size.width, size.height, tablePos, centerY);
      scaleTableToFitViewport(
        tableRoot,
        tablePos,
        camera,
        TABLE_HEIGHT_FRACTION,
        TABLE_MAX_WIDTH_FRACTION,
      );
      resolveTableViewOffsetY(
        camera,
        size.width,
        size.height,
        tablePos,
        getTableCenterY(tableRoot, tablePos),
      );
    }

    const box = new THREE.Box3().setFromObject(tableRoot);
    const surfaceInset = size.width < 768 ? 0.006 : 0.004;
    onSurfaceY(tablePos[1] + box.max.y - surfaceInset);
    onTableMetrics({ topWidth: box.max.x - box.min.x });

    if (!readyRef.current) {
      readyRef.current = true;
      onReady();
    }
  }, [tableRoot, targetScale, tablePos, size.width, size.height, camera, onReady, onSurfaceY, onTableMetrics]);

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
  const [tableTopWidth, setTableTopWidth] = useState<number | null>(null);
  const handleSurfaceY = useCallback((y: number) => setSurfaceY(y), []);
  const handleTableMetrics = useCallback(
    (metrics: { topWidth: number }) => setTableTopWidth(metrics.topWidth),
    [],
  );
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

      <ambientLight intensity={mobile ? 0.68 : 0.64} color="#FFFCF8" />
      <hemisphereLight args={["#FFFCFA", "#8A6848", mobile ? 0.36 : 0.34]} />

      <directionalLight
        position={[0.2, 4.8, 2.8]}
        intensity={mobile ? 0.62 : 0.66}
        color="#FFF8F2"
        castShadow={!mobile}
        shadow-mapSize={[512, 512]}
        shadow-camera-far={10}
        shadow-camera-left={-1.8}
        shadow-camera-right={1.8}
        shadow-camera-top={1.8}
        shadow-camera-bottom={-1.8}
        shadow-bias={-0.0001}
      />

      <TableModel onReady={onReady} onSurfaceY={handleSurfaceY} onTableMetrics={handleTableMetrics} />

      {surfaceY !== null && tableTopWidth !== null && showProducts && (
        <TableProducts surfaceY={surfaceY} tableTopWidth={tableTopWidth} />
      )}

      <ContactShadows
        position={[0, shadow.groundY, 0.52]}
        opacity={shadow.opacity}
        scale={shadow.scale}
        blur={shadow.blur}
        far={2}
        color="#2A2018"
      />
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

  return (
    <div
      className="shop-table-layer"
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
        dpr={mobile ? [1, 1.2] : [1, 1.08]}
        className="h-full w-full"
        gl={{
          antialias: !mobile,
          alpha: true,
          powerPreference: "high-performance",
          stencil: false,
          depth: true,
        }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
          gl.shadowMap.enabled = !mobile;
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = mobile ? 1.02 : 1.0;
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
