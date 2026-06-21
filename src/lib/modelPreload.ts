import { extendGltfLoader, getProductModelUrls, getTableModelUrl } from "./modelAssets";
import { getDeviceProfile } from "./deviceProfile";

const bytePrefetched = new Set<string>();
const gltfTriggered = new Set<string>();
let pipelineStarted = false;
let shopStarted = false;
let dreiPromise: Promise<typeof import("@react-three/drei")> | null = null;

const SHOP_IMAGES = ["/background.png", "/main_mob_bg.png"] as const;
const DOOR_IMAGES = ["/door_sm.png", "/door_bg.png"] as const;
const LOADER_IMAGES = ["/bg.png", "/logo_outline.png", "/wh_logo-removebg-preview.png"] as const;

function getDrei() {
  if (!dreiPromise) dreiPromise = import("@react-three/drei");
  return dreiPromise;
}

function collectShopGlbUrls(): string[] {
  const tableUrl = getTableModelUrl();
  return [...new Set([tableUrl, ...getProductModelUrls()])];
}

/** Parallel HTTP warm — browser multiplexes on 35Mbps+ links. */
function warmHttpCache(url: string) {
  if (bytePrefetched.has(url) || typeof window === "undefined") return;
  bytePrefetched.add(url);
  void fetch(url, { mode: "cors", cache: "force-cache" }).catch(() => undefined);
}

function triggerGltfPreload(
  useGLTF: typeof import("@react-three/drei").useGLTF,
  url: string,
) {
  if (gltfTriggered.has(url)) return;
  gltfTriggered.add(url);
  useGLTF.preload(url, false, false, extendGltfLoader);
}

/** Table first, then all products in parallel (or light stagger on low-end). */
async function preloadAllShopGltfParallel() {
  const { useGLTF } = await getDrei();
  const urls = collectShopGlbUrls();
  const tableUrl = getTableModelUrl();
  const productUrls = urls.filter((url) => url !== tableUrl);

  urls.forEach(warmHttpCache);

  triggerGltfPreload(useGLTF, tableUrl);

  const { lowEnd } = getDeviceProfile();
  const staggerMs = lowEnd ? 150 : 40;

  productUrls.forEach((url, index) => {
    window.setTimeout(() => triggerGltfPreload(useGLTF, url), staggerMs * index);
  });
}

function preloadImage(src: string) {
  if (typeof window === "undefined") return;
  const img = new window.Image();
  img.src = src;
}

export function prefetchTableBytes() {
  warmHttpCache(getTableModelUrl());
}

export function prefetchProductBytes(index: number) {
  const urls = getProductModelUrls();
  const url = urls[Math.min(Math.max(index, 0), urls.length - 1)];
  if (url) warmHttpCache(url);
}

export function prefetchNextProductBytes(index: number) {
  prefetchProductBytes(index);
}

/** Loader first paint — parallel download + parse for table + all 5 products. */
export function bootFastPipeline() {
  if (pipelineStarted) return;
  pipelineStarted = true;

  for (const src of [...LOADER_IMAGES, ...DOOR_IMAGES, ...SHOP_IMAGES]) {
    preloadImage(src);
  }

  void preloadAllShopGltfParallel();
}

export function prefetchShopBytesOnDoor() {
  bootFastPipeline();
  for (const src of SHOP_IMAGES) preloadImage(src);
}

export function startShopModelLoads() {
  if (shopStarted) return;
  shopStarted = true;
  bootFastPipeline();
}

export function prefetchAllProductBytes() {
  const urls = collectShopGlbUrls();
  urls.forEach(warmHttpCache);
  void getDrei().then(({ useGLTF }) => {
    urls.forEach((url) => triggerGltfPreload(useGLTF, url));
  });
}

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
