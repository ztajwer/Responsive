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
    return viewportHeight < 360 ? 118 : 132;
  }
  if (viewportWidth < 1024) return 138;
  return 152;
}

export function getProductDisplaySize(
  viewportWidth: number,
  viewportHeight: number,
): number {
  const cam = getTableCamera(viewportWidth);
  const target = getTableTarget(viewportWidth);
  const targetPixels = getProductTargetPixels(viewportWidth, viewportHeight);

  const distance = Math.hypot(
    cam.position[0] - target[0],
    cam.position[1] - target[1],
    cam.position[2] - target[2],
  );

  const worldSize = worldSizeFromPixels(targetPixels, viewportHeight, cam.fov, distance);
  const maxWorld = viewportWidth < 768 ? 0.19 : viewportWidth < 1024 ? 0.18 : 0.17;

  return Math.min(worldSize, maxWorld);
}

export interface ProductLayoutItem {
  url: string;
  position: [number, number, number];
  rotation: [number, number, number];
  displaySize: number;
}

/** Straight row — equal spacing, same Z, no arc rotation */
export function getProductRowLayout(
  surfaceY: number,
  viewportWidth: number,
  _viewportHeight: number,
  displaySize: number,
): ProductLayoutItem[] {
  const mobile = viewportWidth < 768;
  const models = getProductModelUrls();
  const count = models.length;
  const tablePos = getTablePosition(viewportWidth);
  const spacing = displaySize * (mobile ? 1.02 : 1.08);
  const totalWidth = spacing * (count - 1);
  const forwardZ = tablePos[2] + (mobile ? 0.045 : 0.052);
  const liftAboveTable = mobile ? 0.012 : 0.016;

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
): ProductLayoutItem[] {
  return getProductRowLayout(surfaceY, viewportWidth, viewportHeight, displaySize);
}
