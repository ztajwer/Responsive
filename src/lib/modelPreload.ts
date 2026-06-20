"use client";

import { useGLTF } from "@react-three/drei";
import { extendGltfLoader, getProductModelUrls, getTableModelUrl } from "./modelAssets";

const bytePrefetched = new Set<string>();
const gltfStarted = new Set<string>();

const SHOP_IMAGES = ["/background.png", "/main_mob_bg.png"] as const;
const DOOR_IMAGES = ["/door_sm.png", "/door_bg.png"] as const;

function prefetchModelBytes(url: string) {
  if (bytePrefetched.has(url) || typeof window === "undefined") return;
  bytePrefetched.add(url);
  void fetch(url, { mode: "cors", cache: "force-cache" }).catch(() => {});
}

function preloadGltf(url: string) {
  if (gltfStarted.has(url)) return;
  gltfStarted.add(url);
  useGLTF.preload(url, false, false, extendGltfLoader);
}

/** Start all shop GLB downloads + parses as early as possible. */
export function bootShopModels() {
  const table = getTableModelUrl();
  const products = getProductModelUrls();

  prefetchModelBytes(table);
  products.forEach(prefetchModelBytes);

  preloadGltf(table);
  products.forEach(preloadGltf);
}

export function preloadTableModel() {
  const url = getTableModelUrl();
  prefetchModelBytes(url);
  preloadGltf(url);
}

export function preloadProductModels(): Promise<void> {
  getProductModelUrls().forEach((url) => {
    prefetchModelBytes(url);
    preloadGltf(url);
  });
  return Promise.resolve();
}

export function preloadNextProductModel(index: number) {
  const urls = getProductModelUrls();
  const url = urls[Math.min(Math.max(index, 0), urls.length - 1)];
  if (!url) return;
  prefetchModelBytes(url);
  preloadGltf(url);
}

export function preloadDoorImages() {
  for (const src of DOOR_IMAGES) {
    const img = new window.Image();
    img.src = src;
  }
}

export function preloadShopImages() {
  for (const src of SHOP_IMAGES) {
    const img = new window.Image();
    img.src = src;
  }
}

export function scheduleIdle(task: () => void) {
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(() => task(), { timeout: 800 });
    return;
  }
  window.setTimeout(task, 200);
}

export function warmShopExperienceModule() {
  void import("@/components/jewelry/ShopExperience");
  void import("@/components/jewelry/JewelryHome");
}

export function isModelPreloadStarted(url: string) {
  return gltfStarted.has(url);
}
