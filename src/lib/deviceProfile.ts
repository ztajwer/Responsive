export interface DeviceProfile {
  mobile: boolean;
  lowEnd: boolean;
}

/** Detect phones and weak GPUs (≤4GB RAM or ≤4 cores). */
export function getDeviceProfile(): DeviceProfile {
  if (typeof window === "undefined") {
    return { mobile: false, lowEnd: false };
  }

  const mobile =
    window.innerWidth < 768 ||
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

  const nav = navigator as Navigator & { deviceMemory?: number };
  const lowMemory = typeof nav.deviceMemory === "number" && nav.deviceMemory <= 4;
  const lowCores =
    typeof navigator.hardwareConcurrency === "number" &&
    navigator.hardwareConcurrency > 0 &&
    navigator.hardwareConcurrency <= 4;

  const lowEnd = mobile || lowMemory || lowCores;

  return { mobile, lowEnd };
}

export function getMaxShopProducts(_profile: DeviceProfile): number {
  return 5;
}

export function getProductStaggerMs(profile: DeviceProfile): number {
  return profile.lowEnd ? 650 : profile.mobile ? 480 : 380;
}

export function getProductStartDelayMs(profile: DeviceProfile): number {
  return profile.lowEnd ? 320 : profile.mobile ? 220 : 140;
}

export function getShopCanvasDelayMs(profile: DeviceProfile): number {
  return profile.lowEnd ? 480 : profile.mobile ? 360 : 280;
}
