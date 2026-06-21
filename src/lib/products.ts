import { getProductFilenameFromUrl } from "@/lib/modelAssets";

export const PRODUCT_IDS = ["pro1", "pro2", "pro3", "pro4", "pro5"] as const;
export type ProductId = (typeof PRODUCT_IDS)[number];

export interface Product {
  id: ProductId;
  title: string;
  category: string;
  tagline: string;
  description: string;
  materials: string;
  features: readonly string[];
  modelFile: string;
}

export const PRODUCTS: Record<ProductId, Product> = {
  pro1: {
    id: "pro1",
    title: "Heritage Ring",
    category: "Ring",
    tagline: "Timeless elegance, crafted to endure",
    materials: "GOLD VERMEIL • DIAMOND ACCENT",
    features: ["Hand-finished band", "Heritage-inspired silhouette", "Comfort-fit interior"],
    modelFile: "pro1.glb",
    description:
      "Inspired by heirloom atelier archives, this ring balances sculptural presence with everyday refinement. Each curve is finished by hand for a weight that feels intentional on the finger.",
  },
  pro2: {
    id: "pro2",
    title: "Luna Bracelet",
    category: "Bracelet",
    tagline: "A luminous curve for evening grace",
    materials: "ROSE GOLD • POLISHED BRASS",
    features: ["Articulated links", "Soft hinge closure", "Mirror-polished facets"],
    modelFile: "pro2.glb",
    description:
      "The Luna bracelet catches ambient light with a fluid arc designed to move with the wrist. A contemporary classic suited for gala evenings and intimate soirées alike.",
  },
  pro3: {
    id: "pro3",
    title: "Royal Bangles",
    category: "Bangles",
    tagline: "Regal adornment in rose-gold warmth",
    materials: "GOLD VERMEIL • ENAMEL",
    features: ["Layer-ready profile", "Enamel inlay detail", "Weighted luxury feel"],
    modelFile: "pro3.glb",
    description:
      "Ornate bangle pair inspired by royal court motifs — peacock enamel, pearl florals, and warm gold vermeil combine for a statement rooted in South Asian craft tradition.",
  },
  pro4: {
    id: "pro4",
    title: "Cascade Necklace",
    category: "Necklace",
    tagline: "Fluid brilliance that drapes the décolletage",
    materials: "GOLD PLATE • CRYSTAL",
    features: ["Multi-drop cascade", "Adjustable extender", "Light-catching stones"],
    modelFile: "pro4.glb",
    description:
      "A cascading silhouette designed to frame the neckline with graduated drops that shimmer under boutique lighting. Layered luxury for the woman who leads every room she enters.",
  },
  pro5: {
    id: "pro5",
    title: "Starlight Earrings",
    category: "Earrings",
    tagline: "Delicate sparkle for every occasion",
    materials: "STERLING SILVER • CZ STONE",
    features: ["Secure post back", "Featherlight wear", "Brilliant-cut facets"],
    modelFile: "pro5.glb",
    description:
      "Starlight earrings offer a constellation of micro-facets that catch candlelight and daylight with equal grace — refined enough for daily wear, radiant enough for celebration.",
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
