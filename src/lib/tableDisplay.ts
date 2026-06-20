export const TABLE_DISPLAY = {
  target: [0, -0.12, 0] as [number, number, number],
  scale: {
    mobile: 0.62,
    tablet: 0.66,
    desktop: 0.71,
  },
  camera: {
    mobile: { position: [0, 0.52, 3.0] as [number, number, number], fov: 27 },
    tablet: { position: [0, 0.5, 2.9] as [number, number, number], fov: 26 },
    desktop: { position: [0, 0.48, 2.7] as [number, number, number], fov: 25 },
  },
  floor: { radius: 0.95, yOffset: -0.05 },
  shadow: { scale: 3.8, opacity: 0.12, blur: 4 },
} as const;

export type TableBreakpoint = "mobile" | "tablet" | "desktop";

export function getTableBreakpoint(width: number): TableBreakpoint {
  if (width < 640) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

export function getTableScale(width: number) {
  return TABLE_DISPLAY.scale[getTableBreakpoint(width)];
}

export function getTableCamera(width: number) {
  return TABLE_DISPLAY.camera[getTableBreakpoint(width)];
}
