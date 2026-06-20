/** Slight top-down front view — products visible on table surface */
export const TABLE_POLAR_ANGLE = 1.38;

export const TABLE_DISPLAY = {
  position: {
    mobile: [0, 0, 0.54] as [number, number, number],
    tablet: [0, 0, 0.49] as [number, number, number],
    desktop: [0, 0, 0.46] as [number, number, number],
  },
  target: {
    mobile: [0, 0.24, 0.54] as [number, number, number],
    tablet: [0, 0.2, 0.49] as [number, number, number],
    desktop: [0, 0.18, 0.46] as [number, number, number],
  },
  scale: {
    mobile: 0.64,
    tablet: 0.46,
    desktop: 0.4,
  },
  camera: {
    mobile: { position: [0, 0.44, 1.72] as [number, number, number], fov: 38 },
    tablet: { position: [0, 0.42, 2.05] as [number, number, number], fov: 34 },
    desktop: { position: [0, 0.4, 2.25] as [number, number, number], fov: 32 },
  },
  shadow: {
    scale: { mobile: 2.1, tablet: 1.7, desktop: 1.5 },
    opacity: { mobile: 0.28, tablet: 0.2, desktop: 0.14 },
    blur: { mobile: 4.2, tablet: 3.6, desktop: 3.2 },
    groundY: 0.002,
  },
  viewOffsetY: { mobile: 0.06, tablet: 0.08, desktop: 0.06 },
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
  if (height < 400) return base + 0.06;
  if (height < 680) return base + 0.04;
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
