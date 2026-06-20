"use client";

import { useGLTF } from "@react-three/drei";
import { extendGltfLoader, getProductModelUrls, getTableModelUrl } from "./modelAssets";

const started = new Set<string>();
let productBatchPromise: Promise<void> | null = null;

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

export function preloadProductModels(): Promise<void> {
  if (productBatchPromise) return productBatchPromise;

  productBatchPromise = new Promise((resolve) => {
    for (const url of getProductModelUrls()) {
      preloadGltf(url);
    }
    resolve();
  });

  return productBatchPromise;
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

export function areProductModelsPreloaded() {
  return getProductModelUrls().every((url) => started.has(url));
}
