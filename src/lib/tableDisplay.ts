/** Front-ish view — table face visible, slightly from above */
export const TABLE_POLAR_ANGLE = 1.32;

export const TABLE_DISPLAY = {
  position: {
    mobile: [0, -0.04, 0.46] as [number, number, number],
    tablet: [0, -0.03, 0.44] as [number, number, number],
    desktop: [0, -0.03, 0.42] as [number, number, number],
  },
  target: {
    mobile: [0, 0.06, 0.46] as [number, number, number],
    tablet: [0, 0.05, 0.44] as [number, number, number],
    desktop: [0, 0.04, 0.42] as [number, number, number],
  },
  scale: {
    mobile: 0.35,
    tablet: 0.29,
    desktop: 0.37,
  },
  camera: {
    mobile: { position: [0, 0.26, 2.02] as [number, number, number], fov: 33 },
    tablet: { position: [0, 0.24, 2.12] as [number, number, number], fov: 31 },
    desktop: { position: [0, 0.22, 2.28] as [number, number, number], fov: 30 },
  },
  shadow: {
    scale: { mobile: 1.85, tablet: 1.55, desktop: 1.4 },
    opacity: { mobile: 0.24, tablet: 0.18, desktop: 0.13 },
    blur: { mobile: 3.8, tablet: 3.4, desktop: 3.0 },
    groundY: 0.002,
  },
  viewOffsetY: { mobile: 0, tablet: 0, desktop: 0 },
} as const;

/** Calibrated for static PNG counter — table-3d.glb is a full room, not used for layout. */
export const SHOP_DISPLAY_ANCHOR = {
  mobile: {
    surfaceY: 0.058,
    topWidth: 0.32,
    forwardZ: 0.508,
    displaySize: 0.027,
    viewOffsetY: 0.2,
  },
  tablet: {
    surfaceY: 0.052,
    topWidth: 0.3,
    forwardZ: 0.492,
    displaySize: 0.023,
    viewOffsetY: 0.15,
  },
  desktop: {
    surfaceY: 0.048,
    topWidth: 0.28,
    forwardZ: 0.478,
    displaySize: 0.021,
    viewOffsetY: 0.1,
  },
} as const;

export function getShopDisplayAnchor(width: number) {
  return SHOP_DISPLAY_ANCHOR[getTableBreakpoint(width)];
}

export type TableBreakpoint = "mobile" | "tablet" | "desktop";

export function getTableBreakpoint(width: number): TableBreakpoint {
  if (width < 768) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

export function getTableScale(width: number, height = width) {
  const bp = getTableBreakpoint(width);
  const base = TABLE_DISPLAY.scale[bp];
  if (bp !== "mobile" || height <= 0) return base;
  if (height < 400) return base + 0.02;
  if (height < 820) return base + 0.01;
  return base;
}

export function getTableCamera(width: number) {
  return TABLE_DISPLAY.camera[getTableBreakpoint(width)];
}

export function getTablePosition(width: number) {
  return TABLE_DISPLAY.position[getTableBreakpoint(width)];
}

export function getTableTarget(width: number) {
  return TABLE_DISPLAY.target[getTableBreakpoint(width)];
}

export function getTableShadow(width: number) {
  const bp = getTableBreakpoint(width);
  const tablePos = getTablePosition(width);
  return {
    scale: TABLE_DISPLAY.shadow.scale[bp],
    opacity: TABLE_DISPLAY.shadow.opacity[bp],
    blur: TABLE_DISPLAY.shadow.blur[bp],
    groundY: tablePos[1] + 0.082,
  };
}

export function getTableViewOffsetY(width: number, _height = width) {
  return TABLE_DISPLAY.viewOffsetY[getTableBreakpoint(width)];
}

function clampRange(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function worldSizeFromPixels(
  pixels: number,
  viewportHeight: number,
  cameraFov: number,
  cameraDistance: number,
): number {
  if (viewportHeight <= 0 || cameraDistance <= 0) return 0.12;
  const vFov = (cameraFov * Math.PI) / 180;
  const visibleHeight = 2 * Math.tan(vFov / 2) * cameraDistance;
  return (pixels / viewportHeight) * visibleHeight;
}

const PRODUCT_SIZE_BOOST_PX = 14;

function getBoostedProductDisplaySize(
  baseSize: number,
  viewportWidth: number,
  viewportHeight: number,
): number {
  const cam = getTableCamera(viewportWidth);
  return baseSize + worldSizeFromPixels(PRODUCT_SIZE_BOOST_PX, viewportHeight, cam.fov, cam.position[2]);
}

/** Product height from counter width — one target span for equal on-screen presence */
export function getProductDisplaySize(
  viewportWidth: number,
  _viewportHeight: number,
  tableTopWidth?: number,
): number {
  if (!tableTopWidth || tableTopWidth <= 0) return 0.06;
  const mobile = viewportWidth < 768;
  const tablet = viewportWidth >= 768 && viewportWidth < 1024;
  const factor = mobile ? 0.19 : tablet ? 0.17 : 0.22;
  return tableTopWidth * factor;
}

export interface ProductLayoutItem {
  url: string;
  position: [number, number, number];
  rotation: [number, number, number];
  displaySize: number;
}

/** Round arc — 5 products on table top, even spacing along curved front */
export function getProductArcLayout(
  surfaceY: number,
  viewportWidth: number,
  viewportHeight: number,
  displaySize: number,
  modelUrls: readonly string[],
  tableTopWidth?: number,
  forwardZ?: number,
  centerX = 0,
  liftAboveTable = 0.002,
  extraLiftPx = 100,
): ProductLayoutItem[] {
  const count = modelUrls.length;
  const tablePos = getTablePosition(viewportWidth);
  const cam = getTableCamera(viewportWidth);
  const topWidth = tableTopWidth && tableTopWidth > 0 ? tableTopWidth : displaySize * 3.2;
  const productSize = getBoostedProductDisplaySize(displaySize, viewportWidth, viewportHeight);
  const zBase = forwardZ ?? tablePos[2] + (viewportWidth < 768 ? 0.038 : 0.044);
  const pixelLift = worldSizeFromPixels(
    extraLiftPx,
    viewportHeight,
    cam.fov,
    cam.position[2],
  );

  const edgeInset = displaySize * 0.48;
  const arcSpan = count >= 5 ? 0.78 : 0.68;
  const halfAngle = arcSpan / 2;
  const halfChord = Math.max(0.04, topWidth * 0.47 - edgeInset);
  const radius = halfChord / Math.sin(halfAngle);
  const arcDepth = topWidth * 0.085;
  const onTableY = surfaceY + liftAboveTable + displaySize * 0.018 + pixelLift;

  return modelUrls.map((url, index) => {
    const t = count > 1 ? index / (count - 1) : 0.5;
    const angle = (t - 0.5) * arcSpan;
    const x = centerX + Math.sin(angle) * radius;
    const zCurve = (1 - Math.cos(angle)) * arcDepth;
    return {
      url,
      position: [x, onTableY, zBase - zCurve],
      rotation: [0, -angle * 0.42, 0],
      displaySize: productSize,
    };
  });
}

/** Straight row — equal spacing on table top, centered with optional pixel-calibrated 3D gap */
export function getProductRowLayout(
  surfaceY: number,
  viewportWidth: number,
  viewportHeight: number,
  displaySize: number,
  modelUrls: readonly string[],
  tableTopWidth?: number,
  forwardZ?: number,
  centerX = 0,
  liftAboveTable = 0.002,
  gap3D?: number,
): ProductLayoutItem[] {
  const mobile = viewportWidth < 768;
  const count = modelUrls.length;
  const tablePos = getTablePosition(viewportWidth);
  const productSize = getBoostedProductDisplaySize(displaySize, viewportWidth, viewportHeight);
  
  // Calculate spacing using the 20px gap in 3D units if available
  let spacing = gap3D && gap3D > 0 ? (displaySize + gap3D) : 0;
  
  // Constrain total row span to fit within the table boundaries
  const maxRowSpan = tableTopWidth && tableTopWidth > 0 ? tableTopWidth * 0.82 : displaySize * 3.0;
  
  if (spacing === 0 || spacing * (count - 1) > maxRowSpan) {
    const rowSpan = tableTopWidth && tableTopWidth > 0 ? tableTopWidth * 0.76 : displaySize * 2.4;
    spacing = count > 1 ? rowSpan / (count - 1) : 0;
  }

  const totalWidth = spacing * (count - 1);
  const z = forwardZ ?? tablePos[2] + (mobile ? 0.038 : 0.044);

  return modelUrls.map((url, index) => {
    const x = centerX - totalWidth / 2 + index * spacing;
    return {
      url,
      position: [x, surfaceY + liftAboveTable, z],
      rotation: [0, 0, 0],
      displaySize: productSize,
    };
  });
}
