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

/** Fewer products on weak GPUs — avoids context lost. */
export function getMaxShopProducts(profile: DeviceProfile): number {
  if (profile.lowEnd) return 3;
  if (profile.mobile) return 4;
  return 5;
}

/** Balance: fast enough feel, safe GPU parse cadence. */
export function getProductStaggerMs(profile: DeviceProfile): number {
  return profile.lowEnd ? 1100 : profile.mobile ? 850 : 650;
}

export function getProductStartDelayMs(profile: DeviceProfile): number {
  return profile.lowEnd ? 700 : profile.mobile ? 520 : 360;
}

/** Let door WebGL release before shop canvas mounts. */
export function getShopCanvasDelayMs(profile: DeviceProfile): number {
  return profile.lowEnd ? 900 : profile.mobile ? 680 : 520;
}
