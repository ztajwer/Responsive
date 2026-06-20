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
    return viewportHeight < 360 ? 148 : 172;
  }
  if (viewportWidth < 1024) return 168;
  return 186;
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
  const maxWorld = viewportWidth < 768 ? 0.26 : viewportWidth < 1024 ? 0.24 : 0.24;

  return Math.min(worldSize, maxWorld);
}

export interface ProductArcItem {
  url: string;
  position: [number, number, number];
  rotation: [number, number, number];
  displaySize: number;
}

/** Curved arc of products sitting on the table surface */
export function getProductArcLayout(
  surfaceY: number,
  viewportWidth: number,
  _viewportHeight: number,
  displaySize: number,
): ProductArcItem[] {
  const mobile = viewportWidth < 768;
  const models = getProductModelUrls();
  const count = models.length;
  const tablePos = getTablePosition(viewportWidth);
  const arcRadius = Math.max(mobile ? 0.3 : 0.36, displaySize * (mobile ? 2.55 : 2.95));
  const arcSpread = mobile ? 1.02 : 1.14;
  const forwardZ = tablePos[2] + (mobile ? 0.06 : 0.08);
  const liftAboveTable = mobile ? 0.018 : 0.024;

  return models.map((url, index) => {
    const t = index / (count - 1);
    const angle = (t - 0.5) * arcSpread;
    const x = Math.sin(angle) * arcRadius;
    const z = forwardZ + Math.cos(angle) * arcRadius * 0.12;

    return {
      url,
      position: [x, surfaceY + liftAboveTable, z],
      rotation: [0, -angle * 0.32, 0],
      displaySize,
    };
  });
}
