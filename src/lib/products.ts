import { getProductFilenameFromUrl } from "@/lib/modelAssets";

export const PRODUCT_IDS = ["pro1", "pro2", "pro3", "pro4", "pro5"] as const;
export type ProductId = (typeof PRODUCT_IDS)[number];

export interface Product {
  id: ProductId;
  title: string;
  category: string;
  tagline: string;
  description: string;
  modelFile: string;
}

const LOREM =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.";

export const PRODUCTS: Record<ProductId, Product> = {
  pro1: {
    id: "pro1",
    title: "Heritage Ring",
    category: "Fine Jewelry",
    tagline: "Timeless elegance, crafted to endure",
    modelFile: "pro1.glb",
    description: LOREM,
  },
  pro2: {
    id: "pro2",
    title: "Luna Bracelet",
    category: "Bracelets",
    tagline: "A luminous curve for evening grace",
    modelFile: "pro2.glb",
    description: LOREM,
  },
  pro3: {
    id: "pro3",
    title: "Royal Bangles",
    category: "Bangles",
    tagline: "Regal adornment in rose-gold warmth",
    modelFile: "pro3.glb",
    description: LOREM,
  },
  pro4: {
    id: "pro4",
    title: "Cascade Necklace",
    category: "Necklaces",
    tagline: "Fluid brilliance that drapes the décolletage",
    modelFile: "pro4.glb",
    description: LOREM,
  },
  pro5: {
    id: "pro5",
    title: "Starlight Earrings",
    category: "Earrings",
    tagline: "Delicate sparkle for every occasion",
    modelFile: "pro5.glb",
    description: LOREM,
  },
};

export function isProductId(id: string): id is ProductId {
  return (PRODUCT_IDS as readonly string[]).includes(id);
}

export function getProductById(id: string): Product | null {
  return isProductId(id) ? PRODUCTS[id] : null;
}

export function getAllProducts(): Product[] {
  return PRODUCT_IDS.map((id) => PRODUCTS[id]);
}

export function getProductIdFromModelUrl(url: string): ProductId | null {
  const filename = getProductFilenameFromUrl(url);
  const match = getAllProducts().find((product) => product.modelFile === filename);
  return match?.id ?? null;
}
