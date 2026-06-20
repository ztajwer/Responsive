/**
 * 3D models live in Git LFS. Vercel deploys need either `git lfs pull` at build
 * or NEXT_PUBLIC_GLB_BASE_URL pointing at the LFS CDN (GitHub media URLs).
 */
const DEFAULT_GLB_CDN =
  "https://media.githubusercontent.com/media/ztajwer/Responsive/main/public";

function resolveGlbBase(): string {
  const configured = process.env.NEXT_PUBLIC_GLB_BASE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");

  if (process.env.VERCEL === "1") return DEFAULT_GLB_CDN;

  return "";
}

export function getModelUrl(filename: string): string {
  const name = filename.replace(/^\//, "");
  const base = resolveGlbBase();
  return base ? `${base}/${name}` : `/${name}`;
}

export const TABLE_MODEL_URL = getModelUrl("table-3d.glb");

export const PRODUCT_MODEL_URLS = [
  getModelUrl("pro1.glb"),
  getModelUrl("pro2.glb"),
  getModelUrl("pro3.glb"),
  getModelUrl("pro4.glb"),
  getModelUrl("pro5.glb"),
] as const;
