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

export function getMaxShopProducts(profile: DeviceProfile): number {
  if (profile.lowEnd) return 3;
  if (profile.mobile) return 4;
  return 5;
}

export function getProductStaggerMs(profile: DeviceProfile): number {
  return profile.lowEnd ? 1800 : profile.mobile ? 1200 : 900;
}

export function getProductStartDelayMs(profile: DeviceProfile): number {
  return profile.lowEnd ? 1600 : profile.mobile ? 1000 : 700;
}

export function getShopCanvasDelayMs(profile: DeviceProfile): number {
  return profile.lowEnd ? 1400 : profile.mobile ? 1100 : 800;
}
