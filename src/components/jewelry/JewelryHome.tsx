"use client";

import { Suspense, memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
import { getProductIdFromModelUrl, getProductById } from "@/lib/products";
import { prefetchProductGlb } from "@/lib/modelPreload";
import { getShopLayoutCalib } from "@/lib/shopLayoutCalib";
import { optimizeModelForGpu } from "@/lib/gpuModelOptimize";
import { colors } from "@/lib/colors";
import {
  getDeviceProfile,
  getMaxShopProducts,
  type DeviceProfile,
} from "@/lib/deviceProfile";
import type { ProductId } from "@/lib/products";

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
  top: colors.tableTop,
  panel: colors.tablePeach,
  leg: colors.tableShade,
  side: colors.tableSide,
  gold: colors.tableGold,
  rose: colors.tableRose,
  bottom: colors.tableBase,
  emissive: colors.tableRose,
} as const;

function hexToThree(hex: string) {
  return Number.parseInt(hex.replace("#", ""), 16);
}

type TablePartKind = "leg" | "panel" | "top" | "gold" | "body" | "side";

function isTableGlassMesh(name: string) {
  return /glass|pane|window|transparent|dome|cover|case|vitrine/i.test(name) && !/gem|jewel|diamond/i.test(name);
}

function makeDisplayGlassMaterial(desktop = false) {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(0xffffff),
    metalness: 0.02,
    roughness: desktop ? 0.02 : 0.03,
    transmission: desktop ? 0.9 : 0.94,
    thickness: desktop ? 0.32 : 0.28,
    ior: 1.52,
    envMapIntensity: desktop ? 1.55 : 1.35,
    transparent: true,
    opacity: desktop ? 0.24 : 0.12,
    side: THREE.DoubleSide,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    reflectivity: 0.92,
    attenuationColor: new THREE.Color(0xfffaf5),
    attenuationDistance: 3.2,
  });
}

function resolveTablePartFromName(name: string): TablePartKind | null {
  if (isTableGlassMesh(name)) return null;
  if (/metal|gold|brass|handle|trim|border|edge|frame|ring|knob|rail/i.test(name)) return "gold";
  if (/leg|base|stand|foot|pedestal|pillar|column/i.test(name)) return "leg";
  if (/side|flank|outer|skirt|apron/i.test(name)) return "side";
  if (/velvet|tray|pad|mat|shelf/i.test(name)) return "top";
  if (/top|counter|surface|display|table/i.test(name)) return "panel";
  if (/panel|rib|flute|body|support|structure|wood|cabinet|drawer/i.test(name)) return "panel";
  return null;
}

function resolveTablePartFromHeight(mesh: THREE.Mesh, root: THREE.Object3D): TablePartKind {
  root.updateMatrixWorld(true);
  const rootBox = new THREE.Box3().setFromObject(root);
  const meshBox = new THREE.Box3().setFromObject(mesh);
  const rootH = Math.max(rootBox.getSize(new THREE.Vector3()).y, 0.0001);
  const centerY = meshBox.getCenter(new THREE.Vector3()).y;
  const t = Math.min(1, Math.max(0, (centerY - rootBox.min.y) / rootH));

  if (t > 0.84) return "gold";
  if (t > 0.7) return "top";
  if (t > 0.48) return "panel";
  if (t > 0.28) return "side";
  return "leg";
}

function meshSpansTableHeight(mesh: THREE.Mesh, root: THREE.Object3D): boolean {
  const rootBox = new THREE.Box3().setFromObject(root);
  const meshBox = new THREE.Box3().setFromObject(mesh);
  const rootH = rootBox.getSize(new THREE.Vector3()).y;
  const meshH = meshBox.getSize(new THREE.Vector3()).y;
  return meshH > rootH * 0.36;
}

function colorForTablePart(kind: TablePartKind): THREE.Color {
  switch (kind) {
    case "leg":
      return new THREE.Color(hexToThree(THEME_TABLE.leg));
    case "side":
      return new THREE.Color(hexToThree(THEME_TABLE.side));
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
    return { metalness: 0.78, roughness: 0.28, emissiveIntensity: 0.006 };
  }
  if (kind === "leg") {
    return { metalness: 0.06, roughness: 0.66, emissiveIntensity: 0.002 };
  }
  if (kind === "top") {
    return { metalness: 0.03, roughness: 0.58, emissiveIntensity: 0.003 };
  }
  if (kind === "side") {
    return { metalness: 0.07, roughness: 0.6, emissiveIntensity: 0.003 };
  }
  if (kind === "panel") {
    return { metalness: 0.08, roughness: 0.56, emissiveIntensity: 0.003 };
  }
  return { metalness: 0.08, roughness: 0.58, emissiveIntensity: 0.003 };
}

function stripMaterialMaps(mat: THREE.MeshStandardMaterial) {
  mat.map = null;
  mat.normalMap = null;
  mat.roughnessMap = null;
  mat.metalnessMap = null;
  mat.aoMap = null;
  mat.emissiveMap = null;
  mat.vertexColors = false;
  mat.needsUpdate = true;
}

function lightenTableColor(base: THREE.Color, viewportWidth: number): THREE.Color {
  const color = base.clone();
  if (viewportWidth >= 1024) {
    color.lerp(new THREE.Color(0xffffff), 0.12);
  }
  return color;
}

/** Wood body + height gradient — desktop gets slightly lighter wood + clearer top glass */
function applyWoodenTableBody(mesh: THREE.Mesh, root: THREE.Object3D, viewportWidth: number) {
  root.updateMatrixWorld(true);
  const desktop = viewportWidth >= 1024;
  const spanning = desktop && meshSpansTableHeight(mesh, root);
  const rootBox = new THREE.Box3().setFromObject(root);
  const minY = rootBox.min.y;
  const height = Math.max(rootBox.getSize(new THREE.Vector3()).y, 0.0001);
  const woodTop = minY + height * (desktop ? 0.58 : 0.68);

  const leg = lightenTableColor(colorForTablePart("leg"), viewportWidth);
  const side = lightenTableColor(colorForTablePart("side"), viewportWidth);
  const panel = lightenTableColor(colorForTablePart("panel"), viewportWidth);
  const top = lightenTableColor(colorForTablePart("top"), viewportWidth);
  const highlight = lightenTableColor(new THREE.Color(hexToThree(THEME_TABLE.highlight)), viewportWidth);
  const bottom = lightenTableColor(new THREE.Color(hexToThree(THEME_TABLE.bottom)), viewportWidth);

  const mat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: desktop ? 0.015 : 0.02,
    roughness: desktop ? 0.78 : 0.74,
    clearcoat: desktop ? 0.06 : 0.1,
    clearcoatRoughness: desktop ? 0.48 : 0.38,
    emissive: new THREE.Color(0x000000),
    emissiveIntensity: 0,
  });

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uMinY = { value: minY };
    shader.uniforms.uWoodTop = { value: woodTop };
    shader.uniforms.uLegColor = { value: leg };
    shader.uniforms.uSideColor = { value: side };
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

    const topClip = spanning
      ? `if (vMajWorldPos.y > uWoodTop) {
  discard;
}
`
      : "";

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
varying vec3 vMajWorldPos;
uniform float uMinY;
uniform float uWoodTop;
uniform vec3 uLegColor;
uniform vec3 uSideColor;
uniform vec3 uPanelColor;
uniform vec3 uTopColor;
uniform vec3 uHighlightColor;
uniform vec3 uBottomColor;`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
${topClip}float span = max(uWoodTop - uMinY, 0.0001);
float woodT = clamp((vMajWorldPos.y - uMinY) / span, 0.0, 1.0);

vec3 grad = uBottomColor;
grad = mix(grad, uLegColor, smoothstep(0.0, 0.2, woodT));
grad = mix(grad, uSideColor, smoothstep(0.2, 0.42, woodT));
grad = mix(grad, uPanelColor, smoothstep(0.42, 0.68, woodT));
grad = mix(grad, uTopColor, smoothstep(0.68, 0.9, woodT));
grad = mix(grad, uHighlightColor, smoothstep(0.9, 1.0, woodT));

float grain = sin(vMajWorldPos.y * 52.0 + vMajWorldPos.x * 24.0) * 0.012;
grad *= 1.0 + grain;

grad *= mix(0.76, 1.0, smoothstep(0.0, 0.28, woodT));

diffuseColor.rgb *= grad;`,
      );
  };

  mat.customProgramCacheKey = () => (desktop ? "maj-wooden-table-body-v31-desktop" : "maj-wooden-table-body-v30");
  stripMaterialMaps(mat as unknown as THREE.MeshStandardMaterial);
  mesh.material = mat;
}

function makeShowroomGoldTrimMaterial() {
  const mat = new THREE.MeshPhysicalMaterial({
    color: colorForTablePart("gold"),
    metalness: 0.82,
    roughness: 0.24,
    clearcoat: 0.9,
    clearcoatRoughness: 0.06,
    envMapIntensity: 1.2,
    emissive: new THREE.Color(hexToThree(THEME_TABLE.gold)),
    emissiveIntensity: 0.004,
  });
  return mat;
}

function isTopGlassMesh(mesh: THREE.Mesh, root: THREE.Object3D, viewportWidth = 0): boolean {
  const rootBox = new THREE.Box3().setFromObject(root);
  const meshBox = new THREE.Box3().setFromObject(mesh);
  const rootH = Math.max(rootBox.getSize(new THREE.Vector3()).y, 0.0001);
  const meshSize = meshBox.getSize(new THREE.Vector3());
  const width = Math.max(meshSize.x, meshSize.z);
  const flatness = meshSize.y / Math.max(width, 0.001);
  const centerT = (meshBox.getCenter(new THREE.Vector3()).y - rootBox.min.y) / rootH;
  const topT = (meshBox.max.y - rootBox.min.y) / rootH;
  const desktop = viewportWidth >= 1024;

  if (topT > 0.55 && flatness < 0.24 && width > 0.02) return true;
  if (centerT > 0.6 && flatness < 0.16 && width > 0.022) return true;
  if (desktop) {
    if (topT > 0.48 && flatness < 0.3 && width > 0.018) return true;
    if (centerT > 0.52 && flatness < 0.24 && width > 0.016) return true;
  }
  return false;
}

function isWoodenBodyMesh(mesh: THREE.Mesh, root: THREE.Object3D, viewportWidth = 0): boolean {
  const rootBox = new THREE.Box3().setFromObject(root);
  const meshBox = new THREE.Box3().setFromObject(mesh);
  const rootH = Math.max(rootBox.getSize(new THREE.Vector3()).y, 0.0001);
  const centerT = (meshBox.getCenter(new THREE.Vector3()).y - rootBox.min.y) / rootH;
  const threshold = viewportWidth >= 1024 ? 0.56 : 0.62;
  return centerT < threshold;
}

function applyTableSurfaceColor(root: THREE.Object3D, viewportWidth: number) {
  root.updateMatrixWorld(true);
  const desktop = viewportWidth >= 1024;

  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh || !mesh.visible) return;

    const name = `${mesh.name} ${mesh.parent?.name || ""}`.toLowerCase();
    if (/diamond|gem|jewel/i.test(name)) return;

    mesh.castShadow = false;
    mesh.receiveShadow = false;

    if (isTableGlassMesh(name) || isTopGlassMesh(mesh, root, viewportWidth)) {
      mesh.material = makeDisplayGlassMaterial(desktop);
      mesh.renderOrder = 3;
      return;
    }

    if (resolveTablePartFromName(name) === "gold") {
      mesh.material = makeShowroomGoldTrimMaterial();
      return;
    }

    if (desktop && /top|counter|surface|display|case|vitrine|pane|cover/i.test(name) && !/leg|base|foot|side|panel|wood/i.test(name)) {
      mesh.material = makeDisplayGlassMaterial(true);
      mesh.renderOrder = 3;
      return;
    }

    if (isWoodenBodyMesh(mesh, root, viewportWidth)) {
      applyWoodenTableBody(mesh, root, viewportWidth);
      return;
    }

    mesh.material = makeDisplayGlassMaterial(desktop);
    mesh.renderOrder = 3;
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

function findDisplaySurfaceMetrics(root: THREE.Object3D): DisplaySurfaceMetrics {
  root.updateMatrixWorld(true);
  const rootBox = new THREE.Box3().setFromObject(root);
  const rootMinY = rootBox.min.y;
  const rootCenter = rootBox.getCenter(new THREE.Vector3());
  const sceneSize = rootBox.getSize(new THREE.Vector3());

  const yMin = rootMinY + sceneSize.y * 0.04;
  const yMax = rootMinY + sceneSize.y * 0.55;

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
    score -= Math.abs(center.x - rootCenter.x) * 12;
    score -= Math.abs(center.z - rootCenter.z) * 8;
    score -= (topY - rootMinY) * 2;

    const name = `${mesh.name} ${mesh.parent?.name || ""}`.toLowerCase();
    if (/glass|pane/i.test(name)) score -= 50;
    if (/velvet|tray|pad|display|inner|shelf|mat/i.test(name)) score += 36;
    if (/counter|table|display|velvet|top|tray|round|circle|stand|pad/i.test(name)) score += 24;

    if (score > bestScore) {
      bestScore = score;
      best = {
        surfaceY: topY - rootMinY,
        topWidth: width,
        forwardZ: center.z - rootCenter.z,
        centerX: center.x - rootCenter.x,
      };
    }
  });

  if (best) return best;

  return {
    surfaceY: sceneSize.y * 0.32,
    topWidth: Math.min(sceneSize.x, sceneSize.z) * 0.5,
    forwardZ: 0,
    centerX: 0,
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
  productId,
  position,
  rotation,
  displaySize,
  textureMax = 1024,
}: {
  url: string;
  productId: ProductId;
  position: [number, number, number];
  rotation: [number, number, number];
  displaySize: number;
  textureMax?: number;
}) {
  const router = useRouter();
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
      if (mesh.isMesh) mesh.renderOrder = 14;
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
      const item = getProductById(productId);
      if (item) prefetchProductGlb(item.modelFile);
    },
    [gl, productId],
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

  const handleClick = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      event.stopPropagation();
      router.push(`/product/${productId}`);
    },
    [productId, router],
  );

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      <primitive object={productRoot} />

      <mesh
        position={[0, bounds.height * 0.5, 0]}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onPointerDown={handlePointerDown}
        onClick={handleClick}
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
      {layout.map((item) => {
        const productId = getProductIdFromModelUrl(item.url);
        if (!productId) return null;

        return (
          <Suspense key={item.url} fallback={null}>
            <ProductModel
              url={item.url}
              productId={productId}
              position={toTableLocal(item.position, tablePos)}
              rotation={item.rotation}
              displaySize={item.displaySize}
              textureMax={textureMax}
            />
          </Suspense>
        );
      })}
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
    applyTableSurfaceColor(tableRoot, size.width);

    const calib = getShopLayoutCalib(size.width);
    let alignedY = tablePos[1];

    let alignResult: { groupY: number; projectedNdcY: number } | null = null;
    if (camera instanceof THREE.PerspectiveCamera) {
      alignResult = alignTableBottomToNdc(camera, tablePos[2], calib.counterBottomNdc);
      const yNudge = size.width >= 1024 ? 0.01 : 0.03;
      alignedY = alignResult.groupY + yNudge;
    }

    setGroupY(alignedY);

    const anchor = getShopDisplayAnchor(size.width);
    const found = findDisplaySurfaceMetrics(tableRoot);
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
      <ambientLight intensity={lowEnd ? 0.44 : 0.42} color={colors.white} />
      <hemisphereLight args={[colors.tableRose, "#7A6050", lowEnd ? 0.36 : 0.42]} />

      <directionalLight
        position={[0.6, 5.2, 2.8]}
        intensity={mobile ? 0.95 : 1.08}
        color="#FFF8F0"
      />

      <directionalLight
        position={[-2.0, 2.8, 1.8]}
        intensity={mobile ? 0.3 : 0.38}
        color={colors.tableRose}
      />

      {!lowEnd && (
        <>
          {/* Rim — gold edge depth */}
          <directionalLight
            position={[0.2, 2.4, -2.0]}
            intensity={mobile ? 0.18 : 0.26}
            color={colors.tableGold}
          />

          {surfaceY !== null && (
            <>
              <object3D ref={spotTarget} />
              <spotLight
                ref={spotRef}
                position={[0.08, surfaceY + 1.15, 0.78]}
                intensity={mobile ? 0.62 : 0.82}
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
            intensity={mobile ? 0.42 : 0.55}
            color={colors.tableWarm}
            distance={3.8}
            decay={2}
          />
          <pointLight
            position={[0, surfaceY + 0.06, 0.5]}
            intensity={mobile ? 0.28 : 0.36}
            color={colors.tableRose}
            distance={2.6}
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

      {!profile.lowEnd && <Environment preset="apartment" environmentIntensity={0.32} />}

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
