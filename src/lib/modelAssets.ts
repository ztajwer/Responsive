import { GLB_CDN_BASE } from "./glbConfig";

/**
 * 3D models live in Git LFS. Vercel serves ~134-byte pointer files from /public,
 * so production loads real binaries from GitHub's LFS media CDN instead.
 */
const PRODUCT_FILES = ["pro1.glb", "pro2.glb", "pro3.glb", "pro4.glb", "pro5.glb"] as const;

/** Arc left→right: pro3, pro4, pro1, pro2, pro5 (pro1 moves to 3rd slot) */
const PRODUCT_DISPLAY_ORDER = [2, 3, 0, 1, 4] as const;

/** Smaller on table — ring (pro4) + bracelet (pro2), bbox-calibrated */
export const COMPACT_PRODUCT_FILES = new Set<string>(["pro2.glb", "pro4.glb"]);

export const PRODUCT_SIZE_OFFSET_PX = {
  compact: -5,
  default: 6,
} as const;

function isLocalDevHost(): boolean {
  if (typeof window === "undefined") {
    return process.env.NODE_ENV !== "production";
  }

  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1";
}

function resolveGlbBase(): string {
  const configured = process.env.NEXT_PUBLIC_GLB_BASE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");

  if (isLocalDevHost()) return "";

  return GLB_CDN_BASE;
}

export function getModelUrl(filename: string): string {
  const name = filename.replace(/^\//, "");
  const base = resolveGlbBase();
  return base ? `${base}/${name}` : `/${name}`;
}

/** Resolve at call time so custom domains and Vercel both pick up the CDN. */
export function getTableModelUrl(): string {
  return getModelUrl("table-3d.glb");
}

export function getProductModelUrls(): readonly string[] {
  const urls = PRODUCT_FILES.map((file) => getModelUrl(file));
  return PRODUCT_DISPLAY_ORDER.map((index) => urls[index]);
}

export function getProductFilenameFromUrl(url: string): string {
  const path = url.split("?")[0] ?? url;
  const parts = path.split("/");
  return parts[parts.length - 1] ?? path;
}

export function isCompactProductUrl(url: string): boolean {
  return COMPACT_PRODUCT_FILES.has(getProductFilenameFromUrl(url));
}

export function extendGltfLoader(loader: { setCrossOrigin: (mode: string) => void }) {
  loader.setCrossOrigin("anonymous");
}
