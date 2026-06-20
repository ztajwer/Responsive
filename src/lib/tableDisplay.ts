/** Locked front-facing orbit (π/2 = straight-on view, no tilt). */
export const TABLE_POLAR_ANGLE = Math.PI / 2;

export const TABLE_DISPLAY = {
  position: {
    mobile: [0, 0, 0.34] as [number, number, number],
    tablet: [0, 0, 0.31] as [number, number, number],
    desktop: [0, 0, 0.3] as [number, number, number],
  },
  target: {
    mobile: [0, 0.1, 0.34] as [number, number, number],
    tablet: [0, 0.12, 0.31] as [number, number, number],
    desktop: [0, 0.13, 0.3] as [number, number, number],
  },
  scale: {
    mobile: 0.82,
    tablet: 0.54,
    desktop: 0.5,
  },
  camera: {
    mobile: { position: [0, 0.1, 2.06] as [number, number, number], fov: 38 },
    tablet: { position: [0, 0.12, 3.08] as [number, number, number], fov: 32 },
    desktop: { position: [0, 0.13, 3.18] as [number, number, number], fov: 30 },
  },
  shadow: {
    scale: { mobile: 2.35, tablet: 1.9, desktop: 1.7 },
    opacity: { mobile: 0.32, tablet: 0.24, desktop: 0.17 },
    blur: { mobile: 4.8, tablet: 4.2, desktop: 3.6 },
    groundY: 0.002,
  },
  /** Push framing toward bottom band (mobile canvas is pinned low). */
  viewOffsetY: { mobile: 0.16, tablet: 0.2, desktop: 0.14 },
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
  const base = TABLE_DISPLAY.viewOffsetY[bp];
  if (height <= 0) return base;

  if (bp === "mobile" && height < 680) {
    return base + 0.04;
  }

  if (bp === "tablet" && height < 720) {
    return Math.min(0.24, base + 0.04);
  }

  return base;
}
