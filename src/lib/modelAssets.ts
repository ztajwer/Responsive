import type { GLTFLoader } from "three-stdlib";

/**
 * 3D models live in Git LFS. Vercel serves ~134-byte pointer files from /public,
 * so production loads real binaries from GitHub's LFS media CDN instead.
 */
const DEFAULT_GLB_CDN =
  "https://media.githubusercontent.com/media/ztajwer/Responsive/main/public";

const PRODUCT_FILES = ["pro1.glb", "pro2.glb", "pro3.glb", "pro4.glb", "pro5.glb"] as const;

function isVercelHost(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host.endsWith(".vercel.app") || host.endsWith(".vercel.sh");
}

function resolveGlbBase(): string {
  const configured = process.env.NEXT_PUBLIC_GLB_BASE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");

  if (process.env.VERCEL === "1" || isVercelHost()) return DEFAULT_GLB_CDN;

  return "";
}

export function getModelUrl(filename: string): string {
  const name = filename.replace(/^\//, "");
  const base = resolveGlbBase();
  return base ? `${base}/${name}` : `/${name}`;
}

/** Resolve at call time so Vercel host detection works even without build env. */
export function getTableModelUrl(): string {
  return getModelUrl("table-3d.glb");
}

export function getProductModelUrls(): readonly string[] {
  return PRODUCT_FILES.map((file) => getModelUrl(file));
}

export function extendGltfLoader(loader: GLTFLoader) {
  loader.setCrossOrigin("anonymous");
}
