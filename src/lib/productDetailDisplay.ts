import type { Product, ProductId } from "@/lib/products";

/** Per-product 3D scale — tune each piece independently. */
export const PRODUCT_DETAIL_SIZES: Record<
  ProductId,
  { mobile: number; desktop: number }
> = {
  pro1: { mobile: 0.28, desktop: 0.26 },
  pro2: { mobile: 0.3, desktop: 0.28 },
  pro3: { mobile: 0.32, desktop: 0.3 },
  pro4: { mobile: 0.27, desktop: 0.25 },
  pro5: { mobile: 0.26, desktop: 0.24 },
};

export function getProductDetailDisplaySize(product: Product, viewportWidth: number): number {
  const sizes = PRODUCT_DETAIL_SIZES[product.id];
  return viewportWidth < 768 ? sizes.mobile : sizes.desktop;
}
