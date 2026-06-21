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
  getProductDisplaySize,
  getProductRowLayout,
  getShopDisplayAnchor,
  getTableCamera,
  getTablePosition,
  getTableScale,
  getTableShadow,
  getTableTarget,
} from "@/lib/tableDisplay";
import { extendGltfLoader, getProductModelUrls, getTableModelUrl } from "@/lib/modelAssets";
import { getShopLayoutCalib } from "@/lib/shopLayoutCalib";
import { optimizeModelForGpu } from "@/lib/gpuModelOptimize";
import { colors } from "@/lib/colors";
import {
  getDeviceProfile,
  getMaxShopProducts,
  type DeviceProfile,
} from "@/lib/deviceProfile";

interface JewelryHomeProps {
  visible: boolean;
  onTableReady?: () => void;
}

const tableViewOffsetRef = { width: 0, height: 0, offsetY: 0 };

/** Binary-search group Y so table base lands on target screen NDC (no viewOffset). */
function alignTableBottomToNdc(
  camera: THREE.PerspectiveCamera,
  tableZ: number,
  targetNdcY: number,
): { groupY: number; projectedNdcY: number } {
  camera.clearViewOffset();
  camera.updateProjectionMatrix();

  const anchor = new THREE.Vector3();
  let low = -2.2;
  let high = 0.6;

  for (let i = 0; i < 28; i++) {
    const mid = (low + high) / 2;
    anchor.set(0, mid, tableZ).project(camera);
    if (anchor.y > targetNdcY) {
      high = mid;
    } else {
      low = mid;
    }
  }

  const groupY = (low + high) / 2;
  anchor.set(0, groupY, tableZ).project(camera);

  tableViewOffsetRef.width = 0;
  tableViewOffsetRef.height = 0;
  tableViewOffsetRef.offsetY = 0;

  return { groupY, projectedNdcY: anchor.y };
}

/** Re-applies PNG alignment every frame — drei PerspectiveCamera clears view offset otherwise */
function ViewOffsetMaintainer() {
  const { camera, size } = useThree();

  useFrame(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;

    const ref = tableViewOffsetRef;
    if (ref.offsetY <= 0 || ref.width !== size.width || ref.height !== size.height) {
      if (camera.view) {
        camera.clearViewOffset();
        camera.updateProjectionMatrix();
      }
      return;
    }

    camera.setViewOffset(
      ref.width,
      ref.height,
      0,
      ref.height * ref.offsetY,
      ref.width,
      ref.height,
    );
    camera.updateProjectionMatrix();
  });

  return null;
}

const LOAD_TIMEOUT_MS = 90000;
const HOVER_LIFT = 0.014;
const HOVER_SCALE = 1.07;

const THEME_TABLE = {
  top: colors.goldLight,
  leg: colors.goldDeep,
  gold: colors.gold,
  rose: colors.goldMuted,
  panel: colors.gold,
  emissive: colors.brownMid,
} as const;

function hexToThree(hex: string) {
  return Number.parseInt(hex.replace("#", ""), 16);
}

type TablePartKind = "leg" | "panel" | "top" | "gold" | "body";

function resolveTablePartFromName(name: string): TablePartKind | null {
  if (/glass|pane|window|transparent|diamond|gem|jewel/i.test(name)) return null;
  if (/metal|gold|brass|handle|trim|border|edge|frame|ring|knob|rail/i.test(name)) return "gold";
  if (/leg|base|stand|foot|pedestal|pillar|column/i.test(name)) return "leg";
  if (/top|counter|surface|velvet|tray|pad|display|mat|shelf|table/i.test(name)) return "top";
  if (/panel|rib|flute|body|support|structure|wood|cabinet|drawer/i.test(name)) return "panel";
  return null;
}

function colorForTablePart(kind: TablePartKind): THREE.Color {
  switch (kind) {
    case "leg":
      return new THREE.Color(hexToThree(THEME_TABLE.leg));
    case "panel":
      return new THREE.Color(hexToThree(THEME_TABLE.panel));
    case "top":
      return new THREE.Color(hexToThree(THEME_TABLE.top));
    case "gold":
      return new THREE.Color(hexToThree(THEME_TABLE.gold));
    case "body":
      return new THREE.Color(hexToThree(THEME_TABLE.rose));
    default:
      return new THREE.Color(hexToThree(THEME_TABLE.panel));
  }
}

function materialPropsForPart(kind: TablePartKind) {
  if (kind === "gold") {
    return { metalness: 0.78, roughness: 0.2, emissiveIntensity: 0.09 };
  }
  if (kind === "leg") {
    return { metalness: 0.48, roughness: 0.34, emissiveIntensity: 0.03 };
  }
  if (kind === "top") {
    return { metalness: 0.44, roughness: 0.24, emissiveIntensity: 0.06 };
  }
  return { metalness: 0.52, roughness: 0.28, emissiveIntensity: 0.04 };
}

/** Height + radial bands when GLB is one mesh — legs, panels, top, gold rim */
function paintMeshVertexColors(mesh: THREE.Mesh) {
  const geometry = mesh.geometry;
  const position = geometry.attributes.position;
  if (!position) return;

  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  if (!box) return;

  const minY = box.min.y;
  const maxY = box.max.y;
  const height = Math.max(maxY - minY, 0.0001);
  const center = box.getCenter(new THREE.Vector3());
  const maxRadial = Math.max(box.max.x - box.min.x, box.max.z - box.min.z) * 0.5;

  const leg = colorForTablePart("leg");
  const panel = colorForTablePart("panel");
  const top = colorForTablePart("top");
  const gold = colorForTablePart("gold");

  const colorsAttr = new Float32Array(position.count * 3);
  const vertex = new THREE.Vector3();
  const mix = new THREE.Color();

  for (let i = 0; i < position.count; i++) {
    vertex.fromBufferAttribute(position, i);
    const t = (vertex.y - minY) / height;
    const radial = maxRadial > 0 ? Math.hypot(vertex.x - center.x, vertex.z - center.z) / maxRadial : 0;

    if (t < 0.2) {
      mix.copy(leg);
    } else if (t > 0.9 && radial > 0.78) {
      mix.copy(gold);
    } else if (t > 0.84) {
      mix.copy(top);
    } else if (t > 0.52) {
      mix.copy(panel).lerp(top, (t - 0.52) / 0.32);
    } else {
      mix.copy(leg).lerp(panel, (t - 0.2) / 0.32);
    }

    colorsAttr[i * 3] = mix.r;
    colorsAttr[i * 3 + 1] = mix.g;
    colorsAttr[i * 3 + 2] = mix.b;
  }

  geometry.setAttribute("color", new THREE.BufferAttribute(colorsAttr, 3));
}

function makeThemedTableMaterial(kind: TablePartKind) {
  const props = materialPropsForPart(kind);
  const mat = new THREE.MeshStandardMaterial({
    color: colorForTablePart(kind),
    metalness: props.metalness,
    roughness: props.roughness,
    emissive: new THREE.Color(hexToThree(THEME_TABLE.emissive)),
    emissiveIntensity: props.emissiveIntensity,
  });
  mat.vertexColors = false;
  return mat;
}

/** Per-part boutique colors — mesh names when available, vertex bands for single-mesh GLB */
function applyTableSurfaceColor(root: THREE.Object3D) {
  let meshCount = 0;
  let namedParts = 0;
  let vertexPainted = 0;

  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh || !mesh.visible) return;
    meshCount += 1;

    const name = `${mesh.name} ${mesh.parent?.name || ""}`.toLowerCase();
    if (/glass|pane|window|transparent|diamond|gem|jewel/i.test(name)) return;

    mesh.castShadow = false;
    mesh.receiveShadow = false;

    const namedPart = resolveTablePartFromName(name);
    if (namedPart) {
      namedParts += 1;
      const mat = makeThemedTableMaterial(namedPart);
      mesh.material = mat;
      return;
    }

    paintMeshVertexColors(mesh);
    vertexPainted += 1;
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: true,
      metalness: 0.46,
      roughness: 0.24,
      emissive: new THREE.Color(hexToThree(THEME_TABLE.emissive)),
      emissiveIntensity: 0.05,
    });
    mesh.material = mat;
  });

  // #region agent log
  fetch("http://127.0.0.1:7546/ingest/d5576b71-b65a-49e0-8325-492d4225924a", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "852111" },
    body: JSON.stringify({
      sessionId: "852111",
      runId: "golden-all-products",
      hypothesisId: "H-parts",
      location: "JewelryHome.tsx:applyTableSurfaceColor",
      message: "Part-based table colors",
      data: { meshCount, namedParts, vertexPainted, palette: THEME_TABLE },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
}

function toTableLocal(
  world: [number, number, number],
  tablePos: [number, number, number],
): [number, number, number] {
  return [world[0] - tablePos[0], world[1] - tablePos[1], world[2] - tablePos[2]];
}

function prepareProductMaterials(root: THREE.Object3D) {
  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
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

function hideRoomKeepCounter(root: THREE.Object3D) {
  root.updateMatrixWorld(true);
  const sceneBox = new THREE.Box3().setFromObject(root);
  const sceneSize = sceneBox.getSize(new THREE.Vector3());

  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;

    const box = new THREE.Box3().setFromObject(mesh);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const width = Math.max(size.x, size.z);
    const flatness = size.y / Math.max(width, 0.001);

    const isFloor = flatness < 0.06 && width > 1.8 && center.y < sceneBox.min.y + sceneSize.y * 0.1;
    const isWall = size.y > 2.0 && width > 1.6;
    const isCeiling = center.y > sceneBox.min.y + sceneSize.y * 0.82;

    mesh.visible = !(isFloor || isWall || isCeiling);
  });
}

interface DisplaySurfaceMetrics {
  surfaceY: number;
  topWidth: number;
  forwardZ: number;
  centerX: number;
}

/** PNG-calibrated anchor when mesh scan is unreliable (full-room GLB). */
function resolveProductSurfaceMetrics(
  anchor: ReturnType<typeof getShopDisplayAnchor>,
  found: DisplaySurfaceMetrics,
  alignedY: number,
  tablePos: [number, number, number],
): { metrics: DisplaySurfaceMetrics; source: "anchor" | "mesh" } {
  const meshLooksLikeCounter =
    found.topWidth >= 0.06 &&
    found.topWidth <= 0.45 &&
    found.surfaceY >= 0.035 &&
    found.surfaceY <= 0.14;

  if (meshLooksLikeCounter) {
    return {
      source: "mesh",
      metrics: {
        surfaceY: alignedY + found.surfaceY,
        topWidth: found.topWidth,
        forwardZ: tablePos[2] + found.forwardZ + 0.034,
        centerX: tablePos[0] + found.centerX,
      },
    };
  }

  return {
    source: "anchor",
    metrics: {
      surfaceY: alignedY + anchor.surfaceY,
      topWidth: anchor.topWidth,
      forwardZ: anchor.forwardZ + 0.034,
      centerX: tablePos[0],
    },
  };
}

function findDisplaySurfaceMetrics(
  root: THREE.Object3D,
  tablePos: [number, number, number],
): DisplaySurfaceMetrics {
  root.updateMatrixWorld(true);
  const sceneBox = new THREE.Box3().setFromObject(root);
  const sceneSize = sceneBox.getSize(new THREE.Vector3());
  const sceneCenter = sceneBox.getCenter(new THREE.Vector3());

  const yMin = sceneBox.min.y + sceneSize.y * 0.04;
  const yMax = sceneBox.min.y + sceneSize.y * 0.5;

  let best: DisplaySurfaceMetrics | null = null;
  let bestScore = -Infinity;

  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh || !mesh.visible) return;

    const box = new THREE.Box3().setFromObject(mesh);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const topY = box.max.y;

    if (topY < yMin || center.y > yMax) return;

    const width = Math.max(size.x, size.z);
    const flatness = size.y / Math.max(width, 0.001);
    if (flatness > 0.55 || width < 0.035) return;

    let score = width * 8;
    score -= Math.abs(center.x - sceneCenter.x) * 12;
    score -= Math.abs(center.z - tablePos[2]) * 8;
    score -= center.y * 6;

    const name = `${mesh.name} ${mesh.parent?.name || ""}`.toLowerCase();
    if (/glass|pane/i.test(name)) score -= 50;
    if (/velvet|tray|pad|display|inner|shelf|mat/i.test(name)) score += 36;
    if (/glass|counter|table|display|velvet|top|tray|round|circle|stand|pad/i.test(name)) score += 24;

    if (score > bestScore) {
      bestScore = score;
      best = {
        surfaceY: topY,
        topWidth: width,
        forwardZ: center.z,
        centerX: center.x,
      };
    }
  });

  if (best) return best;

  return {
    surfaceY: sceneBox.min.y + sceneSize.y * 0.32,
    topWidth: Math.min(sceneSize.x, sceneSize.z) * 0.5,
    forwardZ: sceneCenter.z,
    centerX: sceneCenter.x,
  };
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

const GLITTER_COUNT = 22;

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
  showGlitter = true,
  textureMax = 1024,
}: {
  url: string;
  position: [number, number, number];
  rotation: [number, number, number];
  displaySize: number;
  showGlitter?: boolean;
  textureMax?: number;
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
    prepareProductMaterials(productRoot);
    productRoot.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) mesh.renderOrder = 12;
    });
    if (textureMax <= 512) {
      optimizeModelForGpu(productRoot, textureMax);
    }

    const box = new THREE.Box3().setFromObject(productRoot);
    const size = box.getSize(new THREE.Vector3());
    setBounds({
      radius: Math.max(size.x, size.z) * 0.52,
      height: size.y,
    });
  }, [productRoot, displaySize, textureMax]);

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
        <boxGeometry args={[bounds.radius * 2.8, bounds.height * 1.25, bounds.radius * 2.8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {showGlitter && (
        <ProductGlitter active={hovered} radius={bounds.radius} height={bounds.height} />
      )}
    </group>
  );
});

function TableProducts({
  surfaceY,
  tableTopWidth,
  forwardZ,
  centerX,
  tablePos,
  profile,
}: {
  surfaceY: number;
  tableTopWidth: number;
  forwardZ: number;
  centerX: number;
  tablePos: [number, number, number];
  profile: DeviceProfile;
}) {
  const { size, viewport } = useThree();
  const maxProducts = getMaxShopProducts(profile);
  const textureMax = profile.lowEnd ? 512 : profile.mobile ? 768 : 1024;
  const showGlitter = !profile.lowEnd;
  const calib = getShopLayoutCalib(size.width);
  const displaySize = useMemo(
    () => getProductDisplaySize(size.width, size.height, tableTopWidth),
    [size.width, size.height, tableTopWidth],
  );
  // Calculate a 20px gap in 3D coordinates based on current window pixel width and viewport bounds
  const gap3D = useMemo(() => {
    return (20 * viewport.width) / size.width;
  }, [viewport.width, size.width]);

  const layout = useMemo(
    () =>
      getProductRowLayout(
        surfaceY,
        size.width,
        size.height,
        displaySize,
        getProductModelUrls(),
        tableTopWidth,
        forwardZ,
        centerX,
        calib.productLift,
        gap3D,
      ).slice(0, maxProducts),
    [surfaceY, size.width, size.height, displaySize, tableTopWidth, forwardZ, centerX, maxProducts, calib.productLift, gap3D],
  );

  useEffect(() => {
    void import("@/lib/modelPreload").then((mod) => mod.prefetchAllProductBytes());
  }, []);

  useEffect(() => {
    if (layout.length === 0) return;
    const first = layout[0];
    // #region agent log
    fetch("http://127.0.0.1:7546/ingest/d5576b71-b65a-49e0-8325-492d4225924a", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "852111" },
      body: JSON.stringify({
        sessionId: "852111",
        runId: "golden-all-products",
        hypothesisId: "H-products",
        location: "JewelryHome.tsx:TableProducts",
        message: "All products on table",
        data: {
          totalProducts: layout.length,
          maxProducts,
          displaySize,
          surfaceY,
          forwardZ,
          tableTopWidth,
          firstWorldPos: first.position,
          firstLocalPos: toTableLocal(first.position, tablePos),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  }, [layout, displaySize, surfaceY, forwardZ, tablePos, maxProducts]);

  return (
    <group>
      {layout.map((item) => (
        <Suspense key={item.url} fallback={null}>
          <ProductModel
            url={item.url}
            position={toTableLocal(item.position, tablePos)}
            rotation={item.rotation}
            displaySize={item.displaySize}
            showGlitter={showGlitter}
            textureMax={textureMax}
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
  showProducts,
  profile,
}: {
  onReady: () => void;
  onSurfaceY: (y: number) => void;
  onTableMetrics: (metrics: { topWidth: number; forwardZ: number; centerX: number }) => void;
  showProducts: boolean;
  profile: DeviceProfile;
}) {
  const tableUrl = useMemo(() => getTableModelUrl(), []);
  const { scene: tableRoot } = useGLTF(tableUrl, false, false, extendGltfLoader);
  const groupRef = useRef<THREE.Group>(null);
  const { size, camera } = useThree();
  const targetScale = getTableScale(size.width, size.height);
  const tablePos = getTablePosition(size.width);
  const readyRef = useRef(false);
  const [metrics, setMetrics] = useState<DisplaySurfaceMetrics | null>(null);
  const [productsReady, setProductsReady] = useState(false);
  const [groupY, setGroupY] = useState(tablePos[1]);

  useEffect(() => {
    if (!showProducts) {
      setProductsReady(false);
      return;
    }
    const id = window.setTimeout(() => setProductsReady(true), 0);
    return () => window.clearTimeout(id);
  }, [showProducts, profile]);

  useLayoutEffect(() => {
    fitTableToSize(tableRoot, targetScale);
    hideRoomKeepCounter(tableRoot);
    applyTableSurfaceColor(tableRoot);

    const calib = getShopLayoutCalib(size.width);
    let alignedY = tablePos[1];

    let alignResult: { groupY: number; projectedNdcY: number } | null = null;
    if (camera instanceof THREE.PerspectiveCamera) {
      alignResult = alignTableBottomToNdc(camera, tablePos[2], calib.counterBottomNdc);
      alignedY = alignResult.groupY + 0.045;
    }

    setGroupY(alignedY);

    const anchor = getShopDisplayAnchor(size.width);
    const found = findDisplaySurfaceMetrics(tableRoot, tablePos);
    const resolved = resolveProductSurfaceMetrics(anchor, found, alignedY, tablePos);
    const worldMetrics = resolved.metrics;

    // #region agent log
    fetch("http://127.0.0.1:7546/ingest/d5576b71-b65a-49e0-8325-492d4225924a", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "852111" },
      body: JSON.stringify({
        sessionId: "852111",
        runId: "parts-products-v2",
        hypothesisId: "H-position",
        location: "JewelryHome.tsx:TableModel",
        message: "Product surface resolved",
        data: {
          source: resolved.source,
          targetNdc: calib.counterBottomNdc,
          projectedNdcY: alignResult?.projectedNdcY,
          alignedY,
          foundSurfaceY: found.surfaceY,
          worldSurfaceY: worldMetrics.surfaceY,
          forwardZ: worldMetrics.forwardZ,
          topWidth: worldMetrics.topWidth,
          viewportW: size.width,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    setMetrics(worldMetrics);
    onSurfaceY(worldMetrics.surfaceY);
    onTableMetrics({
      topWidth: worldMetrics.topWidth,
      forwardZ: worldMetrics.forwardZ,
      centerX: worldMetrics.centerX,
    });

    if (!readyRef.current) {
      readyRef.current = true;
      onReady();
    }
  }, [tableRoot, targetScale, tablePos, size.width, size.height, camera, onReady, onSurfaceY, onTableMetrics]);

  return (
    <group ref={groupRef} position={[tablePos[0], groupY, tablePos[2]]}>
      <primitive object={tableRoot} />
      {metrics && productsReady && (
        <TableProducts
          surfaceY={metrics.surfaceY}
          tableTopWidth={metrics.topWidth}
          forwardZ={metrics.forwardZ}
          centerX={metrics.centerX}
          tablePos={[tablePos[0], groupY, tablePos[2]]}
          profile={profile}
        />
      )}
    </group>
  );
}

function TableScene({
  onReady,
  showProducts,
  profile,
}: {
  onReady: () => void;
  showProducts: boolean;
  profile: DeviceProfile;
}) {
  const [surfaceY, setSurfaceY] = useState<number | null>(null);
  const handleSurfaceY = useCallback((y: number) => setSurfaceY(y), []);
  const handleTableMetrics = useCallback(() => {}, []);
  const { size } = useThree();
  const target = getTableTarget(size.width);
  const shadow = getTableShadow(size.width);
  const mobile = size.width < 768;

  return (
    <>
      <ResponsiveCamera />
      <ViewOffsetMaintainer />

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

      <ambientLight intensity={mobile ? 0.72 : 0.68} color="#FFFCF8" />
      <hemisphereLight args={[colors.white, colors.goldLight, mobile ? 0.38 : 0.34]} />

      <directionalLight
        position={[0.2, 4.8, 2.8]}
        intensity={mobile ? 0.68 : 0.72}
        color="#FFF8F2"
      />

      <directionalLight
        position={[-0.35, 2.2, 1.05]}
        intensity={mobile ? 0.46 : 0.52}
        color="#FFF6EC"
      />

      <Suspense fallback={null}>
        <TableModel
          onReady={onReady}
          onSurfaceY={handleSurfaceY}
          onTableMetrics={handleTableMetrics}
          showProducts={showProducts}
          profile={profile}
        />
      </Suspense>

      {surfaceY !== null && (
        <pointLight
          position={[0, surfaceY + 0.08, 0.58]}
          intensity={0.72}
          color="#FFF9EE"
          distance={4.2}
        />
      )}

      {!profile.lowEnd && (
        <ContactShadows
          position={[0, shadow.groundY, 0.52]}
          opacity={shadow.opacity}
          scale={shadow.scale}
          blur={shadow.blur}
          far={2}
          color="#2A2018"
          frames={1}
          resolution={256}
        />
      )}
    </>
  );
}

function TableLoader({ slow }: { slow?: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-16 z-20 flex flex-col items-center gap-3">
      <div className="h-px w-24 bg-gradient-to-r from-transparent via-maj-gold/80 to-transparent" />
      <p className="font-sans text-[9px] uppercase tracking-[0.28em] text-maj-brown/70">
        {slow ? "Still loading 3D… check connection" : "Loading boutique 3D"}
      </p>
    </div>
  );
}

export default function JewelryHome({ visible, onTableReady }: JewelryHomeProps) {
  const [tableReady, setTableReady] = useState(false);
  const [loadSlow, setLoadSlow] = useState(false);
  const [profile, setProfile] = useState<DeviceProfile>(() => getDeviceProfile());
  const [gpuLost, setGpuLost] = useState(false);
  const layerRef = useRef<HTMLDivElement>(null);
  const handleReady = useCallback(() => {
    setTableReady(true);
    setLoadSlow(false);
    void import("@/lib/modelPreload").then((mod) => mod.onTableReadyForProducts());
    onTableReady?.();
  }, [onTableReady]);

  useEffect(() => {
    const sync = () => setProfile(getDeviceProfile());
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  useEffect(() => {
    if (!visible || tableReady) {
      setLoadSlow(false);
      return;
    }
    const slowId = window.setTimeout(() => setLoadSlow(true), 20000);
    const failId = window.setTimeout(() => setGpuLost(true), LOAD_TIMEOUT_MS);
    return () => {
      window.clearTimeout(slowId);
      window.clearTimeout(failId);
    };
  }, [visible, tableReady]);

  useEffect(() => {
    const el = layerRef.current;
    if (!el || !visible) return;
    const blockWheel = (event: WheelEvent) => event.preventDefault();
    el.addEventListener("wheel", blockWheel, { passive: false });
    return () => el.removeEventListener("wheel", blockWheel);
  }, [visible]);

  return (
    <div
      ref={layerRef}
      className="shop-table-layer"
      style={{
        opacity: visible ? 1 : 0,
        pointerEvents: visible && tableReady ? "auto" : "none",
        transition: "opacity 1s cubic-bezier(0.22, 1, 0.36, 1) 0.1s",
        cursor: visible && tableReady ? "grab" : "default",
      }}
    >
      {visible && !tableReady && !gpuLost && <TableLoader slow={loadSlow} />}

      {gpuLost && (
        <div className="absolute inset-x-0 bottom-24 z-20 flex justify-center px-6">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="font-sans text-[10px] uppercase tracking-[0.3em] text-maj-gold"
          >
            Reload 3D view
          </button>
        </div>
      )}

      <Canvas
        shadows={false}
        dpr={profile.lowEnd ? 1 : profile.mobile ? 1.25 : 1.5}
        className="h-full w-full"
        gl={{
          antialias: !profile.lowEnd,
          alpha: true,
          powerPreference: profile.lowEnd ? "default" : "high-performance",
          stencil: false,
          depth: true,
          preserveDrawingBuffer: false,
        }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
          gl.shadowMap.enabled = false;
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.08;
          gl.domElement.addEventListener(
            "webglcontextlost",
            (e) => {
              e.preventDefault();
              setGpuLost(true);
            },
            false,
          );
        }}
      >
        <Suspense fallback={null}>
          <TableScene onReady={handleReady} showProducts={tableReady} profile={profile} />
        </Suspense>
      </Canvas>
    </div>
  );
}
