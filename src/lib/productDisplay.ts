import { getTableCamera, getTableTarget } from "./tableDisplay";
import { PRODUCT_MODEL_URLS } from "./modelAssets";

export const PRODUCT_MODELS = PRODUCT_MODEL_URLS;

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

export function getProductTargetPixels(viewportWidth: number): number {
  if (viewportWidth < 768) return 171;
  if (viewportWidth < 1024) return 189;
  return 200;
}

export function getProductDisplaySize(
  viewportWidth: number,
  viewportHeight: number,
): number {
  const cam = getTableCamera(viewportWidth);
  const target = getTableTarget(viewportWidth);
  const targetPixels = getProductTargetPixels(viewportWidth);

  const distance = Math.hypot(
    cam.position[0] - target[0],
    cam.position[1] - target[1],
    cam.position[2] - target[2],
  );

  const worldSize = worldSizeFromPixels(targetPixels, viewportHeight, cam.fov, distance);
  const maxWorld = viewportWidth < 768 ? 0.189 : viewportWidth < 1024 ? 0.21 : 0.224;

  return Math.min(worldSize, maxWorld);
}

export interface ProductArcItem {
  url: string;
  position: [number, number, number];
  rotation: [number, number, number];
  displaySize: number;
}

/** Curved arc of products on the table surface with spacing */
export function getProductArcLayout(
  surfaceY: number,
  viewportWidth: number,
  viewportHeight: number,
  displaySize: number,
): ProductArcItem[] {
  const mobile = viewportWidth < 768;
  const count = PRODUCT_MODELS.length;
  const arcRadius = Math.max(mobile ? 0.34 : 0.4, displaySize * (mobile ? 2.9 : 3.2));
  const arcSpread = mobile ? 1.18 : 1.24;
  const forwardZ = mobile ? 0.36 : 0.4;
  const liftAboveTable = mobile ? 0.045 : 0.038;

  return PRODUCT_MODELS.map((url, index) => {
    const t = index / (count - 1);
    const angle = (t - 0.5) * arcSpread;
    const x = Math.sin(angle) * arcRadius;
    const z = forwardZ + Math.cos(angle) * arcRadius * 0.16;

    return {
      url,
      position: [x, surfaceY + liftAboveTable, z],
      rotation: [0, -angle * 0.32, 0],
      displaySize,
    };
  });
}
