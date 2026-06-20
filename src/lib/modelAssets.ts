import { GLB_CDN_BASE } from "./glbConfig";

/**
 * 3D models live in Git LFS. Vercel serves ~134-byte pointer files from /public,
 * so production loads real binaries from GitHub's LFS media CDN instead.
 */
const PRODUCT_FILES = ["pro1.glb", "pro2.glb", "pro3.glb", "pro4.glb", "pro5.glb"] as const;

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
  return PRODUCT_FILES.map((file) => getModelUrl(file));
}

export function extendGltfLoader(loader: {
  setCrossOrigin: (mode: string) => void;
  setRequestHeader?: (header: string, value: string) => void;
}) {
  loader.setCrossOrigin("anonymous");
  loader.setRequestHeader?.("Accept", "model/gltf-binary,*/*;q=0.8");
}
