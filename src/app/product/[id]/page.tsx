import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductDetailView from "@/components/product/ProductDetailView";
import { getProductById, PRODUCT_IDS } from "@/lib/products";
import { siteConfig } from "@/lib/site";

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

export function generateStaticParams() {
  return PRODUCT_IDS.map((id) => ({ id }));
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { id } = await params;
  const product = getProductById(id);
  if (!product) return { title: "Product Not Found" };

  return {
    title: product.title,
    description: product.description,
    alternates: { canonical: `/product/${product.id}` },
    openGraph: {
      title: `${product.title} | ${siteConfig.name}`,
      description: product.description,
      url: `${siteConfig.url}/product/${product.id}`,
      type: "website",
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;
  const product = getProductById(id);
  if (!product) notFound();

  return <ProductDetailView product={product} />;
}
