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
  getProductArcLayout,
  getProductDisplaySize,
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
  highlight: colors.tableCream,
  top: colors.tablePeach,
  panel: colors.tableWarm,
  leg: colors.tableShade,
  side: colors.tableSide,
  gold: colors.tableGold,
  rose: colors.tableWarm,
  emissive: colors.cream,
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
    return { metalness: 0.58, roughness: 0.28, emissiveIntensity: 0.012 };
  }
  if (kind === "leg") {
    return { metalness: 0.28, roughness: 0.44, emissiveIntensity: 0.009 };
  }
  if (kind === "top") {
    return { metalness: 0.26, roughness: 0.36, emissiveIntensity: 0.007 };
  }
  return { metalness: 0.26, roughness: 0.4, emissiveIntensity: 0.008 };
}

/** GPU height gradient — safe for large single-mesh GLB (no CPU vertex loop) */
function applyHeightGradientMaterial(mesh: THREE.Mesh) {
  const geometry = mesh.geometry;
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  if (!box) return;

  const minY = box.min.y;
  const height = Math.max(box.max.y - minY, 0.0001);
  const leg = colorForTablePart("leg");
  const panel = colorForTablePart("panel");
  const top = colorForTablePart("top");
  const highlight = new THREE.Color(hexToThree(THEME_TABLE.highlight));
  const bottom = new THREE.Color(hexToThree(THEME_TABLE.leg));

  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0.3,
    roughness: 0.36,
    emissive: new THREE.Color(hexToThree(THEME_TABLE.emissive)),
    emissiveIntensity: 0.006,
  });

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uMinY = { value: minY };
    shader.uniforms.uHeight = { value: height };
    shader.uniforms.uLegColor = { value: leg };
    shader.uniforms.uPanelColor = { value: panel };
    shader.uniforms.uTopColor = { value: top };
    shader.uniforms.uHighlightColor = { value: highlight };
    shader.uniforms.uBottomColor = { value: bottom };

    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vMajWorldPos;")
      .replace(
        "#include <worldpos_vertex>",
        "#include <worldpos_vertex>\nvMajWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;",
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
varying vec3 vMajWorldPos;
uniform float uMinY;
uniform float uHeight;
uniform vec3 uLegColor;
uniform vec3 uPanelColor;
uniform vec3 uTopColor;
uniform vec3 uHighlightColor;
uniform vec3 uBottomColor;`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
float t = clamp((vMajWorldPos.y - uMinY) / uHeight, 0.0, 1.0);
vec3 grad = uBottomColor;
if (t > 0.92) {
  grad = uHighlightColor;
} else if (t > 0.82) {
  grad = mix(uTopColor, uHighlightColor, (t - 0.82) / 0.1);
} else if (t > 0.5) {
  grad = mix(uPanelColor, uTopColor, (t - 0.5) / 0.32);
} else {
  grad = mix(uBottomColor, uPanelColor, smoothstep(0.0, 0.44, t));
}
diffuseColor.rgb *= grad;`,
      );
  };

  mat.customProgramCacheKey = () => "maj-table-parts-gradient-v11";
  mesh.material = mat;
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
  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh || !mesh.visible) return;

    const name = `${mesh.name} ${mesh.parent?.name || ""}`.toLowerCase();
    if (/glass|pane|window|transparent|diamond|gem|jewel/i.test(name)) return;

    mesh.castShadow = false;
    mesh.receiveShadow = false;

    const namedPart = resolveTablePartFromName(name);
    if (namedPart) {
      const mat = makeThemedTableMaterial(namedPart);
      mesh.material = mat;
      return;
    }

    applyHeightGradientMaterial(mesh);
  });
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

function fitProductToUniformSize(root: THREE.Object3D, targetSpan: number) {
  root.scale.set(1, 1, 1);
  root.position.set(0, 0, 0);
  root.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const visualSpan = Math.max(size.x, size.y, size.z);
  if (visualSpan > 0) {
    root.scale.setScalar(targetSpan / visualSpan);
  }

  root.updateMatrixWorld(true);
  const fitted = new THREE.Box3().setFromObject(root);
  const center = fitted.getCenter(new THREE.Vector3());
  root.position.set(-center.x, -fitted.min.y, -center.z);
}

interface ProductBounds {
  radius: number;
  height: number;
}

const ProductModel = memo(function ProductModel({
  url,
  position,
  rotation,
  displaySize,
  textureMax = 1024,
}: {
  url: string;
  position: [number, number, number];
  rotation: [number, number, number];
  displaySize: number;
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
    optimizeModelForGpu(productRoot, textureMax);

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
  const { size } = useThree();
  const maxProducts = getMaxShopProducts(profile);
  const textureMax = profile.lowEnd ? 384 : profile.mobile ? 512 : 768;
  const calib = getShopLayoutCalib(size.width);
  const displaySize = useMemo(
    () => getProductDisplaySize(size.width, size.height, tableTopWidth),
    [size.width, size.height, tableTopWidth],
  );
  const layout = useMemo(
    () =>
      getProductArcLayout(
        surfaceY,
        size.width,
        size.height,
        displaySize,
        getProductModelUrls(),
        tableTopWidth,
        forwardZ,
        centerX,
        calib.productLift,
      ).slice(0, maxProducts),
    [surfaceY, size.width, size.height, displaySize, tableTopWidth, forwardZ, centerX, maxProducts, calib.productLift],
  );

  useEffect(() => {
    void import("@/lib/modelPreload").then((mod) => mod.prefetchAllProductBytes());
  }, []);

  return (
    <group>
      {layout.map((item) => (
        <Suspense key={item.url} fallback={null}>
          <ProductModel
            url={item.url}
            position={toTableLocal(item.position, tablePos)}
            rotation={item.rotation}
            displaySize={item.displaySize}
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
      alignedY = alignResult.groupY + 0.03;
    }

    setGroupY(alignedY);

    const anchor = getShopDisplayAnchor(size.width);
    const found = findDisplaySurfaceMetrics(tableRoot, tablePos);
    const resolved = resolveProductSurfaceMetrics(anchor, found, alignedY, tablePos);
    const worldMetrics = resolved.metrics;

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

/** Warm boutique lighting — key / fill / rim + soft counter glow */
function TableBoutiqueLights({
  surfaceY,
  mobile,
  lowEnd,
}: {
  surfaceY: number | null;
  mobile: boolean;
  lowEnd: boolean;
}) {
  const spotRef = useRef<THREE.SpotLight>(null);
  const spotTarget = useRef<THREE.Object3D>(null);

  useLayoutEffect(() => {
    if (!spotRef.current || !spotTarget.current || surfaceY === null) return;
    spotRef.current.target = spotTarget.current;
    spotTarget.current.position.set(0, surfaceY + 0.01, 0.54);
  }, [surfaceY]);

  return (
    <>
      <ambientLight intensity={lowEnd ? 0.5 : 0.46} color={colors.white} />
      <hemisphereLight args={[colors.tableCream, colors.tablePeach, lowEnd ? 0.3 : 0.38]} />

      {/* Key — overhead boutique window */}
      <directionalLight
        position={[0.4, 5.6, 3.1]}
        intensity={mobile ? 0.88 : 0.96}
        color={colors.tablePeach}
      />

      {/* Fill — soft bounce from left */}
      <directionalLight
        position={[-1.6, 3.0, 2.2]}
        intensity={mobile ? 0.34 : 0.4}
        color={colors.tableCream}
      />

      {!lowEnd && (
        <>
          {/* Rim — gold edge depth */}
          <directionalLight
            position={[0.2, 2.4, -2.0]}
            intensity={mobile ? 0.2 : 0.26}
            color={colors.tableGold}
          />

          {surfaceY !== null && (
            <>
              <object3D ref={spotTarget} />
              <spotLight
                ref={spotRef}
                position={[0.08, surfaceY + 1.15, 0.78]}
                intensity={mobile ? 0.62 : 0.78}
                angle={0.48}
                penumbra={0.94}
                distance={6}
                decay={2}
                color={colors.tablePeach}
              />
            </>
          )}
        </>
      )}

      {surfaceY !== null && (
        <>
          {/* Counter surface glow */}
          <pointLight
            position={[0, surfaceY + 0.14, 0.57]}
            intensity={mobile ? 0.52 : 0.64}
            color={colors.tableWarm}
            distance={3.4}
            decay={2}
          />
        </>
      )}
    </>
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

      <TableBoutiqueLights surfaceY={surfaceY} mobile={mobile} lowEnd={profile.lowEnd} />

      <Suspense fallback={null}>
        <TableModel
          onReady={onReady}
          onSurfaceY={handleSurfaceY}
          onTableMetrics={handleTableMetrics}
          showProducts={showProducts}
          profile={profile}
        />
      </Suspense>

      {!profile.lowEnd && (
        <ContactShadows
          position={[0, shadow.groundY, 0.52]}
          opacity={shadow.opacity}
          scale={shadow.scale}
          blur={shadow.blur}
          far={2}
          color="#5C4838"
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
        {slow ? "Still loading 3D models…" : "Loading boutique 3D"}
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
    const slowId = window.setTimeout(() => setLoadSlow(true), 45000);
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
          gl.toneMappingExposure = 1.14;
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
          <TableScene onReady={handleReady} showProducts={visible} profile={profile} />
        </Suspense>
      </Canvas>
    </div>
  );
}
