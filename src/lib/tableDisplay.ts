/** Slight top-down front view — products visible on table surface */
export const TABLE_POLAR_ANGLE = 1.38;

export const TABLE_DISPLAY = {
  position: {
    mobile: [0, 0, 0.46] as [number, number, number],
    tablet: [0, 0, 0.44] as [number, number, number],
    desktop: [0, 0, 0.42] as [number, number, number],
  },
  target: {
    mobile: [0, 0.18, 0.46] as [number, number, number],
    tablet: [0, 0.16, 0.44] as [number, number, number],
    desktop: [0, 0.14, 0.42] as [number, number, number],
  },
  scale: {
    mobile: 0.38,
    tablet: 0.32,
    desktop: 0.3,
  },
  camera: {
    mobile: { position: [0, 0.34, 1.88] as [number, number, number], fov: 34 },
    tablet: { position: [0, 0.32, 2.05] as [number, number, number], fov: 32 },
    desktop: { position: [0, 0.3, 2.22] as [number, number, number], fov: 30 },
  },
  shadow: {
    scale: { mobile: 1.85, tablet: 1.55, desktop: 1.4 },
    opacity: { mobile: 0.24, tablet: 0.18, desktop: 0.13 },
    blur: { mobile: 3.8, tablet: 3.4, desktop: 3.0 },
    groundY: 0.002,
  },
  viewOffsetY: { mobile: 0, tablet: 0, desktop: 0 },
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
  return {
    scale: TABLE_DISPLAY.shadow.scale[bp],
    opacity: TABLE_DISPLAY.shadow.opacity[bp],
    blur: TABLE_DISPLAY.shadow.blur[bp],
    groundY: TABLE_DISPLAY.shadow.groundY,
  };
}

export function getTableViewOffsetY(width: number, _height = width) {
  return TABLE_DISPLAY.viewOffsetY[getTableBreakpoint(width)];
}
