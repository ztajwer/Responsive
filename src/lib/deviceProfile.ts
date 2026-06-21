export interface DeviceProfile {
  mobile: boolean;
  lowEnd: boolean;
}

/** Phones vs weak GPUs (not every phone is low-end). */
export function getDeviceProfile(): DeviceProfile {
  if (typeof window === "undefined") {
    return { mobile: false, lowEnd: false };
  }

  const mobile =
    window.innerWidth < 768 ||
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

  const nav = navigator as Navigator & { deviceMemory?: number };
  const memory = nav.deviceMemory;
  const cores = navigator.hardwareConcurrency;

  const lowMemory = typeof memory === "number" && memory <= 3;
  const lowCores =
    typeof cores === "number" && cores > 0 && cores <= 4 && mobile && typeof memory !== "number";

  const lowEnd = lowMemory || lowCores;

  return { mobile, lowEnd };
}

export function getMaxShopProducts(profile: DeviceProfile): number {
  if (profile.lowEnd) return 3;
  if (profile.mobile) return 4;
  return 5;
}

export function getProductStaggerMs(profile: DeviceProfile): number {
  return profile.lowEnd ? 950 : profile.mobile ? 720 : 550;
}

export function getProductStartDelayMs(profile: DeviceProfile): number {
  return profile.lowEnd ? 550 : profile.mobile ? 380 : 260;
}

export function getShopCanvasDelayMs(_profile: DeviceProfile): number {
  return 120;
}
