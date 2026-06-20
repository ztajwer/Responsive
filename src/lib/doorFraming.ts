import { PANEL_H, PANEL_W } from "@/components/GlassDoors";

export const DOOR_MOBILE_BREAKPOINT = 768;

export interface DoorScale {
  x: number;
  y: number;
}

export interface DoorFrameState {
  scale: DoorScale;
  groupZ: number;
  isMobile: boolean;
  baseFov: number;
}

export interface DoorCameraFraming {
  distance: number;
  lookAtY: number;
  fov: number;
  scale: DoorScale;
  groupZ: number;
  isMobile: boolean;
}

export function isSmallDoorViewport(viewportWidth: number): boolean {
  return viewportWidth < DOOR_MOBILE_BREAKPOINT;
}

export function getDoorBackgroundImage(viewportWidth: number): "/door_sm.png" | "/door_bg.png" {
  return isSmallDoorViewport(viewportWidth) ? "/door_sm.png" : "/door_bg.png";
}

export const DOOR_HALF_WIDTH = PANEL_W + 0.08;
export const DOOR_HALF_HEIGHT_TOP = PANEL_H / 2 + 0.12 + 0.035 + 0.06;
export const DOOR_HALF_HEIGHT_BOTTOM = PANEL_H / 2 + 0.01 + 0.007 + 0.05;

const MOBILE_TOP = PANEL_H / 2 + 0.12 + 0.035;
const MOBILE_BOTTOM = PANEL_H / 2 + 0.01 + 0.007;
const MOBILE_DOOR_HEIGHT = MOBILE_TOP + MOBILE_BOTTOM;
const MOBILE_DOOR_WIDTH = DOOR_HALF_WIDTH * 2;

export const DOOR_CAMERA = {
  fov: 36,
  /** Lower FOV = larger door + stronger depth on mobile. */
  fovMobile: 33,
  fovDollyZoom: 2.4,
  dollyMax: 0.24,
  dollyMaxMobile: 0.18,
  liftMax: 0.04,
  liftMaxMobile: 0,
  padding: 1.028,
  paddingLandscape: 1.06,
  lookAtY: -0.05,
  /** Slight Z pop — door sits in front of the wall plane. */
  mobileGroupZ: 0.1,
  mobileVerticalMargin: 0.04,
  mobileVerticalMarginBottom: 0.04,
  mobileHorizontalMargin: 0.058,
  /** Height trim (~10%) — width trim (~9%). */
  mobileHeightTrim: 0.875,
  mobileWidthTrim: 0.865,
  /** Extra screen-height reduction on mobile (px). */
  mobileHeightPxReduce: 228,
  /** Extra screen-width reduction on mobile (px). */
  mobileWidthPxReduce: 52,
  /** Shift door down on screen (px). */
  mobileDoorDownPx: 30,
} as const;

export const DEFAULT_FRAME: DoorFrameState = {
  scale: { x: 1, y: 1 },
  groupZ: 0,
  isMobile: false,
  baseFov: DOOR_CAMERA.fov,
};

function getCameraFov(aspect: number, viewportWidth: number): number {
  if (viewportWidth < DOOR_MOBILE_BREAKPOINT && aspect < 0.9) return DOOR_CAMERA.fovMobile;
  return DOOR_CAMERA.fov;
}

function computeMobileDoorFraming(
  aspect: number,
  viewportWidth: number,
  viewportHeight: number,
): DoorCameraFraming {
  const fov = getCameraFov(aspect, viewportWidth);
  const dolly = DOOR_CAMERA.dollyMaxMobile;
  const vMarginTop = DOOR_CAMERA.mobileVerticalMargin;
  const vMarginBottom = DOOR_CAMERA.mobileVerticalMarginBottom;
  const hMargin = DOOR_CAMERA.mobileHorizontalMargin;

  const vFovRad = (fov * Math.PI) / 180;
  const halfV = vFovRad / 2;
  const halfH = Math.atan(Math.tan(halfV) * aspect);

  let distance =
    MOBILE_DOOR_HEIGHT / (2 * Math.tan(halfV) * (1 - vMarginTop - vMarginBottom)) +
    dolly;
  let scaleX = 1;
  let scaleY = 1;

  for (let i = 0; i < 6; i += 1) {
    const usable = Math.max(0.01, distance - dolly);
    const viewHeight = 2 * usable * Math.tan(halfV);
    const viewWidth = 2 * usable * Math.tan(halfH);

    const maxScaleY =
      (viewHeight * (1 - vMarginTop - vMarginBottom)) / MOBILE_DOOR_HEIGHT;
    const maxScaleX = (viewWidth * (1 - 2 * hMargin)) / MOBILE_DOOR_WIDTH;

    scaleY = maxScaleY * DOOR_CAMERA.mobileHeightTrim;
    scaleX = maxScaleX * DOOR_CAMERA.mobileWidthTrim;

    const distForHeight =
      (MOBILE_DOOR_HEIGHT * scaleY) /
        (2 * Math.tan(halfV) * (1 - vMarginTop - vMarginBottom)) +
      dolly;
    const distForWidth =
      (MOBILE_DOOR_WIDTH * scaleX) / (2 * Math.tan(halfH) * (1 - 2 * hMargin)) + dolly;

    distance = Math.max(distForHeight, distForWidth);
  }

  const usable = Math.max(0.01, distance - dolly);
  const viewHeight = 2 * usable * Math.tan(halfV);
  const viewWidth = 2 * usable * Math.tan(halfH);
  const doorHeightPx = viewportHeight * ((MOBILE_DOOR_HEIGHT * scaleY) / viewHeight);
  const doorWidthPx = viewportWidth * ((MOBILE_DOOR_WIDTH * scaleX) / viewWidth);

  if (doorHeightPx > DOOR_CAMERA.mobileHeightPxReduce) {
    scaleY *= 1 - DOOR_CAMERA.mobileHeightPxReduce / doorHeightPx;
  }
  if (doorWidthPx > DOOR_CAMERA.mobileWidthPxReduce) {
    scaleX *= 1 - DOOR_CAMERA.mobileWidthPxReduce / doorWidthPx;
  }

  const lookAtY =
    (DOOR_CAMERA.mobileDoorDownPx / viewportHeight) * viewHeight;

  return {
    distance,
    lookAtY,
    fov,
    scale: { x: scaleX, y: scaleY },
    groupZ: DOOR_CAMERA.mobileGroupZ,
    isMobile: true,
  };
}

function computeDesktopDoorFraming(aspect: number): DoorCameraFraming {
  const fov = DOOR_CAMERA.fov;
  const padding = aspect > 1.75 ? DOOR_CAMERA.paddingLandscape : DOOR_CAMERA.padding;
  const uniform = aspect > 1.85 ? 0.97 : 1;

  const vFovRad = (fov * Math.PI) / 180;
  const halfV = vFovRad / 2;
  const halfH = Math.atan(Math.tan(halfV) * aspect);

  const halfWidth = DOOR_HALF_WIDTH * uniform;
  const halfHeight = Math.max(DOOR_HALF_HEIGHT_TOP, DOOR_HALF_HEIGHT_BOTTOM) * uniform;

  const distForHeight = halfHeight / Math.tan(halfV);
  const distForWidth = halfWidth / Math.tan(halfH);

  const distance =
    Math.max(distForHeight, distForWidth) * padding + DOOR_CAMERA.dollyMax;

  return {
    distance,
    lookAtY: DOOR_CAMERA.lookAtY,
    fov,
    scale: { x: uniform, y: uniform },
    groupZ: 0.04,
    isMobile: false,
  };
}

export function computeDoorCameraFraming(
  aspect: number,
  viewportWidth: number,
  viewportHeight: number,
): DoorCameraFraming {
  if (viewportWidth < DOOR_MOBILE_BREAKPOINT) {
    return computeMobileDoorFraming(aspect, viewportWidth, viewportHeight);
  }
  return computeDesktopDoorFraming(aspect);
}

export function framingToFrameState(framing: DoorCameraFraming): DoorFrameState {
  return {
    scale: framing.scale,
    groupZ: framing.groupZ,
    isMobile: framing.isMobile,
    baseFov: framing.fov,
  };
}

export function getDoorDollyMax(viewportWidth: number): number {
  return viewportWidth < DOOR_MOBILE_BREAKPOINT
    ? DOOR_CAMERA.dollyMaxMobile
    : DOOR_CAMERA.dollyMax;
}

export function getDoorLiftMax(viewportWidth: number): number {
  return viewportWidth < DOOR_MOBILE_BREAKPOINT
    ? DOOR_CAMERA.liftMaxMobile
    : DOOR_CAMERA.liftMax;
}

export function getDoorFovDollyZoom(viewportWidth: number): number {
  return viewportWidth < DOOR_MOBILE_BREAKPOINT ? DOOR_CAMERA.fovDollyZoom : 1.2;
}

export function getDoorScrollContentHeight() {
  return `calc(100dvh + 95dvh)`;
}

export function getDoorOpenDistance() {
  if (typeof window === "undefined") return 800;
  return window.innerHeight * 0.95;
}

export { DEFAULT_FRAME as DEFAULT_SCALE };
