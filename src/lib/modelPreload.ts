import {
  extendGltfLoader,
  getModelUrl,
  getProductModelUrls,
  getTableModelUrl,
} from "./modelAssets";
import { getDeviceProfile } from "./deviceProfile";

const bytePrefetched = new Set<string>();
const gltfTriggered = new Set<string>();
let imagePipelineStarted = false;
let modelPipelineScheduled = false;
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

/** Parallel HTTP warm — browser multiplexes on fast links. */
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

/** Table first, then products — never on critical path before loader UI. */
async function preloadAllShopGltfParallel() {
  const { useGLTF } = await getDrei();
  const urls = collectShopGlbUrls();
  const tableUrl = getTableModelUrl();
  const productUrls = urls.filter((url) => url !== tableUrl);

  warmHttpCache(tableUrl);

  triggerGltfPreload(useGLTF, tableUrl);

  const { lowEnd } = getDeviceProfile();
  const staggerMs = lowEnd ? 120 : 40;

  productUrls.forEach((url, index) => {
    window.setTimeout(() => {
      warmHttpCache(url);
      triggerGltfPreload(useGLTF, url);
    }, staggerMs * (index + 1));
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

/** Detail page — HTTP warm + GLTF parse for one product. */
export function prefetchProductGlb(modelFile: string) {
  const url = getModelUrl(modelFile);
  warmHttpCache(url);
  void getDrei().then(({ useGLTF }) => {
    triggerGltfPreload(useGLTF, url);
  });
}

export function prefetchNextProductBytes(index: number) {
  prefetchProductBytes(index);
}

/** Images only — safe during loader (no 500MB GLB parse on main thread). */
export function bootImagePipeline() {
  if (imagePipelineStarted) return;
  imagePipelineStarted = true;

  for (const src of [...LOADER_IMAGES, ...DOOR_IMAGES, ...SHOP_IMAGES]) {
    preloadImage(src);
  }
}

export function scheduleIdle(task: () => void) {
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(() => task(), { timeout: 800 });
    return;
  }
  window.setTimeout(task, 200);
}

/** Defer GLB download/parse until after loader animation completes. */
export function scheduleModelPreloads(delayMs = 0) {
  if (modelPipelineScheduled) return;
  modelPipelineScheduled = true;

  const run = () => {
    scheduleIdle(() => {
      void preloadAllShopGltfParallel();
    });
  };

  if (delayMs > 0) {
    window.setTimeout(run, delayMs);
  } else {
    run();
  }
}

/** Loader + door — images immediately, models after UI is interactive. */
export function bootFastPipeline() {
  bootImagePipeline();
  scheduleModelPreloads(3000);
}

export function prefetchShopBytesOnDoor() {
  bootImagePipeline();
  prefetchTableBytes();
  scheduleModelPreloads(0);
}

export function startShopModelLoads() {
  if (shopStarted) return;
  shopStarted = true;
  bootImagePipeline();
  scheduleModelPreloads(0);
}

export function prefetchAllProductBytes() {
  const urls = collectShopGlbUrls();
  void getDrei().then(({ useGLTF }) => {
    urls.forEach((url) => {
      warmHttpCache(url);
      triggerGltfPreload(useGLTF, url);
    });
  });
}

export function onTableReadyForProducts() {
  prefetchAllProductBytes();
}

export function bootShopModels() {
  startShopModelLoads();
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
