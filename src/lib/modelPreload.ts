"use client";

import { getProductModelUrls, getTableModelUrl } from "./modelAssets";

const bytePrefetched = new Set<string>();
let pipelineStarted = false;
let shopStarted = false;
let prefetchChain: Promise<void> = Promise.resolve();

const SHOP_IMAGES = ["/background.png", "/main_mob_bg.png"] as const;
const DOOR_IMAGES = ["/door_sm.png", "/door_bg.png"] as const;
const LOADER_IMAGES = ["/bg.png", "/logo_outline.png", "/wh_logo-removebg-preview.png"] as const;

/** One GLB download at a time — table always wins, no bandwidth fight. */
function enqueueModelBytes(url: string) {
  if (bytePrefetched.has(url) || typeof window === "undefined") return;
  bytePrefetched.add(url);

  prefetchChain = prefetchChain
    .then(() =>
      fetch(url, { mode: "cors", cache: "force-cache" }).then(() => undefined),
    )
    .catch(() => undefined);
}

function preloadImage(src: string) {
  if (typeof window === "undefined") return;
  const img = new window.Image();
  img.src = src;
}

export function prefetchTableBytes() {
  enqueueModelBytes(getTableModelUrl());
}

/** Call only after table is on screen — one product file at a time. */
export function prefetchProductBytes(index: number) {
  const urls = getProductModelUrls();
  const url = urls[Math.min(Math.max(index, 0), urls.length - 1)];
  if (url) enqueueModelBytes(url);
}

export function prefetchNextProductBytes(index: number) {
  prefetchProductBytes(index);
}

/** Loader: table bytes only + images + warm shop code. */
export function bootFastPipeline() {
  if (pipelineStarted) return;
  pipelineStarted = true;

  prefetchTableBytes();

  for (const src of [...LOADER_IMAGES, ...DOOR_IMAGES, ...SHOP_IMAGES]) {
    preloadImage(src);
  }

  warmShopExperienceModule();
}

/** Door scroll: reinforce table download only. */
export function prefetchShopBytesOnDoor() {
  prefetchTableBytes();
}

/** Shop opens: table bytes + code — NO product downloads yet. */
export function startShopModelLoads() {
  if (shopStarted) return;
  shopStarted = true;

  prefetchTableBytes();
  warmShopExperienceModule();
}

/** After table renders, queue first product bytes. */
export function onTableReadyForProducts() {
  prefetchProductBytes(0);
}

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
