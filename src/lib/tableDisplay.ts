export const TABLE_POLAR_ANGLE = 1.555;

export const TABLE_DISPLAY = {
  position: {
    mobile: [0, 0, 0.34] as [number, number, number],
    tablet: [0, 0, 0.31] as [number, number, number],
    desktop: [0, 0, 0.3] as [number, number, number],
  },
  target: {
    mobile: [0, 0.05, 0.3] as [number, number, number],
    tablet: [0, 0.06, 0.28] as [number, number, number],
    desktop: [0, 0.06, 0.27] as [number, number, number],
  },
  scale: {
    mobile: 0.66,
    tablet: 0.44,
    desktop: 0.4,
  },
  camera: {
    mobile: { position: [0, 0.04, 2.02] as [number, number, number], fov: 40 },
    tablet: { position: [0, 0.06, 3.02] as [number, number, number], fov: 33 },
    desktop: { position: [0, 0.06, 3.05] as [number, number, number], fov: 31 },
  },
  shadow: {
    scale: { mobile: 2.35, tablet: 1.9, desktop: 1.7 },
    opacity: { mobile: 0.32, tablet: 0.24, desktop: 0.17 },
    blur: { mobile: 4.8, tablet: 4.2, desktop: 3.6 },
    groundY: 0.002,
  },
  /** Push full table flush to bottom of canvas */
  viewOffsetY: { mobile: 0.46, tablet: 0.5, desktop: 0.48 },
} as const;

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
  if (height < 680) return base + 0.06;
  if (height < 820) return base + 0.04;
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
  return {
    scale: TABLE_DISPLAY.shadow.scale[bp],
    opacity: TABLE_DISPLAY.shadow.opacity[bp],
    blur: TABLE_DISPLAY.shadow.blur[bp],
    groundY: TABLE_DISPLAY.shadow.groundY,
  };
}

export function getTableViewOffsetY(width: number, height = width) {
  const bp = getTableBreakpoint(width);
  let offset = TABLE_DISPLAY.viewOffsetY[bp];
  if (height <= 0) return offset;

  if (bp === "mobile" && height < 680) {
    offset += 0.05;
  }

  if (bp === "tablet" && height < 720) {
    offset += 0.04;
  }

  return Math.min(0.58, offset);
}
