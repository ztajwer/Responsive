import { extendGltfLoader, getProductModelUrls, getTableModelUrl } from "./modelAssets";

const bytePrefetched = new Set<string>();
let pipelineStarted = false;
let shopStarted = false;
let prefetchChain: Promise<void> = Promise.resolve();

const SHOP_IMAGES = ["/background.png", "/main_mob_bg.png"] as const;
const DOOR_IMAGES = ["/door_sm.png", "/door_bg.png"] as const;
const LOADER_IMAGES = ["/bg.png", "/logo_outline.png", "/wh_logo-removebg-preview.png"] as const;

/** Parse into drei cache after bytes are in HTTP cache — shop mount is instant when ready. */
function triggerGltfPreload(url: string) {
  void import("@react-three/drei").then(({ useGLTF }) => {
    useGLTF.preload(url, false, false, extendGltfLoader);
  });
}

/** One GLB at a time: download → parse, then next (runs during loader + door scroll). */
function enqueueModelBytes(url: string) {
  if (bytePrefetched.has(url) || typeof window === "undefined") return;
  bytePrefetched.add(url);

  prefetchChain = prefetchChain
    .then(() =>
      fetch(url, { mode: "cors", cache: "force-cache" }).then(() => {
        triggerGltfPreload(url);
      }),
    )
    .catch(() => undefined);
}

function preloadImage(src: string) {
  if (typeof window === "undefined") return;
  const img = new window.Image();
  img.src = src;
}

function queueAllShopGlbBytes() {
  prefetchTableBytes();
  const seen = new Set<string>();
  for (const url of getProductModelUrls()) {
    if (seen.has(url)) continue;
    seen.add(url);
    enqueueModelBytes(url);
  }
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

/**
 * Loader first paint — queue table + all 5 products (download & parse while loader/doors run).
 */
export function bootFastPipeline() {
  if (pipelineStarted) return;
  pipelineStarted = true;

  queueAllShopGlbBytes();

  for (const src of [...LOADER_IMAGES, ...DOOR_IMAGES, ...SHOP_IMAGES]) {
    preloadImage(src);
  }
}

/** Door screen — ensure full pipeline + shop PNGs (idempotent). */
export function prefetchShopBytesOnDoor() {
  bootFastPipeline();
  for (const src of SHOP_IMAGES) preloadImage(src);
}

/** Shop opens — pipeline already running from loader; no-op guard. */
export function startShopModelLoads() {
  if (shopStarted) return;
  shopStarted = true;
  bootFastPipeline();
}

export function prefetchAllProductBytes() {
  getProductModelUrls().forEach((url) => enqueueModelBytes(url));
}

/** After table renders — ensure any missing product files are queued. */
export function onTableReadyForProducts() {
  prefetchAllProductBytes();
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
