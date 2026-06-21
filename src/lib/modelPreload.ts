"use client";

import { getDeviceProfile } from "./deviceProfile";
import { getProductModelUrls, getTableModelUrl } from "./modelAssets";

const bytePrefetched = new Set<string>();
let pipelineStarted = false;
let shopBytesStarted = false;
let productByteStaggerScheduled = false;

const SHOP_IMAGES = ["/background.png", "/main_mob_bg.png"] as const;
const DOOR_IMAGES = ["/door_sm.png", "/door_bg.png"] as const;
const LOADER_IMAGES = ["/bg.png", "/logo_outline.png", "/wh_logo-removebg-preview.png"] as const;

function prefetchModelBytes(url: string) {
  if (bytePrefetched.has(url) || typeof window === "undefined") return;
  bytePrefetched.add(url);
  void fetch(url, { mode: "cors", cache: "force-cache" }).catch(() => {});
}

function preloadImage(src: string) {
  if (typeof window === "undefined") return;
  const img = new window.Image();
  img.src = src;
}

export function prefetchTableBytes() {
  prefetchModelBytes(getTableModelUrl());
}

export function prefetchProductBytes(index: number) {
  const urls = getProductModelUrls();
  const url = urls[Math.min(Math.max(index, 0), urls.length - 1)];
  if (url) prefetchModelBytes(url);
}

/** Table + first product only — safe at boot. */
export function prefetchCriticalShopBytes() {
  prefetchTableBytes();
  prefetchProductBytes(0);
}

/** Remaining product bytes staggered (network only, no GLTF parse). */
export function staggerRemainingProductBytes(fromIndex = 1, gapMs = 500) {
  if (productByteStaggerScheduled) return;
  productByteStaggerScheduled = true;

  const urls = getProductModelUrls();
  for (let i = fromIndex; i < urls.length; i++) {
    const index = i;
    window.setTimeout(() => prefetchProductBytes(index), gapMs * (index - fromIndex));
  }
}

/** @deprecated Prefer staged prefetch helpers. */
export function prefetchAllShopModelBytes() {
  prefetchCriticalShopBytes();
  getProductModelUrls().forEach((_, index) => {
    if (index > 0) prefetchProductBytes(index);
  });
}

/** Loader: table + product0 bytes, images, defer heavy shop chunk on phones. */
export function bootFastPipeline() {
  if (pipelineStarted) return;
  pipelineStarted = true;

  prefetchCriticalShopBytes();

  for (const src of [...LOADER_IMAGES, ...DOOR_IMAGES, ...SHOP_IMAGES]) {
    preloadImage(src);
  }

  if (!getDeviceProfile().lowEnd) {
    warmShopExperienceModule();
  }
}

/** Door mid-open: warm next product bytes without flooding network. */
export function prefetchShopBytesOnDoor() {
  prefetchCriticalShopBytes();
  staggerRemainingProductBytes(1, 450);
}

/** Shop visible: bytes + code warm; GLTF still parses one-at-a-time in Canvas. */
export function startShopModelLoads() {
  if (shopBytesStarted) return;
  shopBytesStarted = true;

  prefetchCriticalShopBytes();
  staggerRemainingProductBytes(1, 400);
  warmShopExperienceModule();
}

export function prefetchNextProductBytes(index: number) {
  prefetchProductBytes(index);
}

/** @deprecated Use bootFastPipeline */
export function bootShopModels() {
  bootFastPipeline();
}

export function preloadProductModels(): Promise<void> {
  startShopModelLoads();
  return Promise.resolve();
}

export function preloadDoorImages() {
  for (const src of DOOR_IMAGES) preloadImage(src);
}

export function preloadShopImages() {
  for (const src of SHOP_IMAGES) preloadImage(src);
}

export function scheduleIdle(task: () => void) {
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(() => task(), { timeout: 600 });
    return;
  }
  window.setTimeout(task, 150);
}

export function warmShopExperienceModule() {
  void import("@/components/jewelry/ShopExperience");
  void import("@/components/jewelry/JewelryHome");
}
