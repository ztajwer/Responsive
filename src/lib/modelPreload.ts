"use client";

import { useGLTF } from "@react-three/drei";
import { extendGltfLoader, getProductModelUrls, getTableModelUrl } from "./modelAssets";

const bytePrefetched = new Set<string>();
const gltfStarted = new Set<string>();
let productStaggerScheduled = false;
let pipelineStarted = false;
let shopLoadsStarted = false;

const SHOP_IMAGES = ["/background.png", "/main_mob_bg.png"] as const;
const DOOR_IMAGES = ["/door_sm.png", "/door_bg.png"] as const;
const LOADER_IMAGES = ["/bg.png", "/logo_outline.png", "/wh_logo-removebg-preview.png"] as const;

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

function preloadImage(src: string) {
  if (typeof window === "undefined") return;
  const img = new window.Image();
  img.src = src;
}

/** Network-only — table first; products when shop opens. */
export function prefetchTableBytes() {
  prefetchModelBytes(getTableModelUrl());
}

export function prefetchAllModelBytes() {
  prefetchTableBytes();
  getProductModelUrls().forEach(prefetchModelBytes);
}

export function preloadTableModel() {
  const url = getTableModelUrl();
  prefetchModelBytes(url);
  preloadGltf(url);
}

export function preloadNextProductModel(index: number) {
  const urls = getProductModelUrls();
  const url = urls[Math.min(Math.max(index, 0), urls.length - 1)];
  if (!url) return;
  prefetchModelBytes(url);
  preloadGltf(url);
}

export function staggerRemainingProductPreloads(fromIndex = 1, gapMs = 400) {
  if (productStaggerScheduled) return;
  productStaggerScheduled = true;

  const urls = getProductModelUrls();
  for (let i = fromIndex; i < urls.length; i++) {
    const index = i;
    window.setTimeout(() => preloadNextProductModel(index), gapMs * (index - fromIndex));
  }
}

/** Loader boot: images + table bytes + table GLTF only (one parse — safe for GPU). */
export function bootFastPipeline() {
  if (pipelineStarted) return;
  pipelineStarted = true;

  prefetchTableBytes();
  preloadTableModel();

  for (const src of [...LOADER_IMAGES, ...DOOR_IMAGES, ...SHOP_IMAGES]) {
    preloadImage(src);
  }

  warmShopExperienceModule();
}

/** Shop view: prefetch product bytes, parse first product, stagger the rest. */
export function startShopModelLoads() {
  if (shopLoadsStarted) return;
  shopLoadsStarted = true;

  preloadTableModel();
  getProductModelUrls().forEach(prefetchModelBytes);
  preloadNextProductModel(0);
  staggerRemainingProductPreloads(1, 400);
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

export function isModelPreloadStarted(url: string) {
  return gltfStarted.has(url);
}
