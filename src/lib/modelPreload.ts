"use client";

import { useGLTF } from "@react-three/drei";
import { extendGltfLoader, getProductModelUrls, getTableModelUrl } from "./modelAssets";

const started = new Set<string>();

const SHOP_IMAGES = ["/background.png", "/main_mob_bg.png"] as const;
const DOOR_IMAGES = ["/door_sm.png", "/door_bg.png"] as const;

function preloadGltf(url: string) {
  if (started.has(url)) return;
  started.add(url);
  useGLTF.preload(url, false, false, extendGltfLoader);
}

export function preloadTableModel() {
  preloadGltf(getTableModelUrl());
}

/** Preload one product at a time to avoid loading ~400MB of GLBs at once. */
export function preloadProductModels(): Promise<void> {
  const urls = getProductModelUrls().filter((url) => !started.has(url));
  if (urls.length === 0) return Promise.resolve();

  let chain = Promise.resolve();
  for (const url of urls) {
    chain = chain.then(() => {
      preloadGltf(url);
    });
  }
  return chain;
}

export function preloadNextProductModel(index: number) {
  const urls = getProductModelUrls();
  const url = urls[Math.min(Math.max(index, 0), urls.length - 1)];
  if (url) preloadGltf(url);
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
    window.requestIdleCallback(() => task(), { timeout: 2200 });
    return;
  }
  window.setTimeout(task, 600);
}

export function warmShopExperienceModule() {
  void import("@/components/jewelry/ShopExperience");
}
