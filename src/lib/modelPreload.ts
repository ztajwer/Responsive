"use client";

import { getProductModelUrls, getTableModelUrl } from "./modelAssets";

const bytePrefetched = new Set<string>();
let pipelineStarted = false;
let shopBytesStarted = false;

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

/** Network-only — never parse GLTF here (keeps GPU memory free until shop Canvas mounts). */
export function prefetchTableBytes() {
  prefetchModelBytes(getTableModelUrl());
}

export function prefetchProductBytes(index: number) {
  const urls = getProductModelUrls();
  const url = urls[Math.min(Math.max(index, 0), urls.length - 1)];
  if (url) prefetchModelBytes(url);
}

/** Network-only — all GLB bytes in parallel (safe). */
export function prefetchAllShopModelBytes() {
  prefetchTableBytes();
  getProductModelUrls().forEach((_, index) => prefetchProductBytes(index));
}

/** Loader boot: images + all model bytes + warm shop chunk. */
export function bootFastPipeline() {
  if (pipelineStarted) return;
  pipelineStarted = true;

  prefetchAllShopModelBytes();

  for (const src of [...LOADER_IMAGES, ...DOOR_IMAGES, ...SHOP_IMAGES]) {
    preloadImage(src);
  }

  warmShopExperienceModule();
}

/** Shop opens: ensure bytes + images are warm. */
export function startShopModelLoads() {
  if (shopBytesStarted) return;
  shopBytesStarted = true;

  prefetchAllShopModelBytes();
  for (const src of SHOP_IMAGES) preloadImage(src);
  warmShopExperienceModule();
}

/** Prefetch bytes for the next product before it mounts (no GLTF parse). */
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
