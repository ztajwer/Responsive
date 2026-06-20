import { getTableCamera, getTablePosition, getTableTarget } from "./tableDisplay";
import { getProductModelUrls } from "./modelAssets";

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

export function getProductTargetPixels(
  viewportWidth: number,
  viewportHeight = viewportWidth,
): number {
  if (viewportWidth < 768) {
    return viewportHeight < 360 ? 88 : 98;
  }
  if (viewportWidth < 1024) return 108;
  return 118;
}

/** Product height in world units — proportional to table top width when known */
export function getProductDisplaySize(
  viewportWidth: number,
  viewportHeight: number,
  tableTopWidth?: number,
): number {
  if (tableTopWidth && tableTopWidth > 0) {
    const fromTable = tableTopWidth * 0.108;
    const min = viewportWidth < 768 ? 0.058 : 0.054;
    const max = viewportWidth < 768 ? 0.118 : 0.122;
    return clampRange(fromTable, min, max);
  }

  const cam = getTableCamera(viewportWidth);
  const target = getTableTarget(viewportWidth);
  const targetPixels = getProductTargetPixels(viewportWidth, viewportHeight);

  const distance = Math.hypot(
    cam.position[0] - target[0],
    cam.position[1] - target[1],
    cam.position[2] - target[2],
  );

  const worldSize = worldSizeFromPixels(targetPixels, viewportHeight, cam.fov, distance);
  const maxWorld = viewportWidth < 768 ? 0.108 : viewportWidth < 1024 ? 0.102 : 0.098;

  return Math.min(worldSize, maxWorld);
}

function clampRange(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export interface ProductLayoutItem {
  url: string;
  position: [number, number, number];
  rotation: [number, number, number];
  displaySize: number;
}

/** Straight row — equal spacing on table top, centered */
export function getProductRowLayout(
  surfaceY: number,
  viewportWidth: number,
  _viewportHeight: number,
  displaySize: number,
  tableTopWidth?: number,
): ProductLayoutItem[] {
  const mobile = viewportWidth < 768;
  const models = getProductModelUrls();
  const count = models.length;
  const tablePos = getTablePosition(viewportWidth);
  const rowSpan = tableTopWidth && tableTopWidth > 0 ? tableTopWidth * 0.82 : displaySize * 3.8;
  const spacing = count > 1 ? rowSpan / (count - 1) : 0;
  const totalWidth = spacing * (count - 1);
  const forwardZ = tablePos[2] + (mobile ? 0.038 : 0.044);
  const liftAboveTable = mobile ? 0.01 : 0.014;

  return models.map((url, index) => {
    const x = -totalWidth / 2 + index * spacing;
    return {
      url,
      position: [x, surfaceY + liftAboveTable, forwardZ],
      rotation: [0, 0, 0],
      displaySize,
    };
  });
}

/** @deprecated Use getProductRowLayout */
export function getProductArcLayout(
  surfaceY: number,
  viewportWidth: number,
  viewportHeight: number,
  displaySize: number,
  tableTopWidth?: number,
): ProductLayoutItem[] {
  return getProductRowLayout(surfaceY, viewportWidth, viewportHeight, displaySize, tableTopWidth);
}
