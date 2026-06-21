"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useGLTF } from "@react-three/drei";
import type { Product } from "@/lib/products";
import { getModelUrl } from "@/lib/modelAssets";
import { isWhatsAppConfigured, openWhatsAppInquiry } from "@/lib/whatsapp";

const ProductDetailCanvas = dynamic(() => import("@/components/product/ProductDetailCanvas"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[min(52dvh,440px)] w-full items-center justify-center bg-gradient-to-b from-[#F7EFE6] via-maj-cream to-[#F0E4D6] md:min-h-full">
      <div className="flex flex-col items-center gap-3">
        <div className="h-px w-16 bg-gradient-to-r from-transparent via-maj-gold/70 to-transparent" />
        <p className="font-sans text-[9px] uppercase tracking-[0.32em] text-maj-brown/55">
          Loading 3D model
        </p>
      </div>
    </div>
  ),
});

interface ProductDetailViewProps {
  product: Product;
}

export default function ProductDetailView({ product }: ProductDetailViewProps) {
  const [mounted, setMounted] = useState(false);
  const whatsappReady = isWhatsAppConfigured();

  useEffect(() => {
    setMounted(true);
    useGLTF.preload(getModelUrl(product.modelFile));

    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    html.style.overflow = "auto";
    body.style.overflow = "auto";

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
    };
  }, [product.modelFile]);

  return (
    <div className="product-detail-page fixed inset-0 z-[60] overflow-y-auto overflow-x-hidden bg-maj-cream text-maj-brown">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-6xl flex-col">
        <header className="sticky top-0 z-20 border-b border-maj-gold/10 bg-maj-cream/92 backdrop-blur-md">
          <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 font-sans text-[10px] uppercase tracking-[0.28em] text-maj-brown/70 transition hover:text-maj-gold"
            >
              <span aria-hidden>←</span>
              Back to Boutique
            </Link>
            <p className="font-sans text-[9px] uppercase tracking-[0.42em] text-maj-gold/75">MAJ</p>
          </div>
        </header>

        <div className="flex flex-1 flex-col md:grid md:min-h-0 md:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] md:gap-0">
          <section className="relative md:min-h-[calc(100dvh-4.5rem)]">
            {mounted ? <ProductDetailCanvas product={product} /> : null}
          </section>

          <section className="flex flex-col px-5 pb-28 pt-6 sm:px-8 sm:pt-8 md:justify-center md:px-10 md:pb-10 lg:px-14">
            <div className="animate-fade-up">
              <p className="mb-2 font-sans text-[9px] uppercase tracking-[0.5em] text-maj-gold/80 sm:text-[10px]">
                Collection
              </p>
              <h1 className="font-display text-[clamp(2rem,8vw,3.25rem)] font-light leading-[1.05] tracking-[0.06em] text-maj-brown">
                {product.title}
              </h1>
              <div className="my-4 flex items-center gap-3 sm:my-5">
                <div className="h-px flex-1 bg-gradient-to-r from-maj-gold/55 to-transparent" />
                <div className="h-1 w-1 rotate-45 border border-maj-gold/70" />
                <div className="h-px flex-1 bg-gradient-to-l from-maj-gold/55 to-transparent" />
              </div>
              <p className="max-w-xl font-sans text-[13px] leading-[1.75] tracking-[0.01em] text-maj-brown/72 sm:text-[14px] sm:leading-[1.8]">
                {product.description}
              </p>

              <div className="mt-6 rounded-2xl border border-maj-gold/15 bg-white/45 px-4 py-4 sm:mt-8 sm:px-5 sm:py-5">
                <p className="font-sans text-[9px] uppercase tracking-[0.38em] text-maj-brown/50">Price</p>
                <p className="mt-1 font-display text-[clamp(1.15rem,4.5vw,1.45rem)] tracking-[0.08em] text-maj-brown">
                  Contact for Price
                </p>
              </div>

              <button
                type="button"
                onClick={() => openWhatsAppInquiry(product.title)}
                disabled={!whatsappReady}
                className="mt-6 w-full rounded-full border border-maj-gold/35 bg-gradient-to-r from-maj-gold/18 via-maj-gold/10 to-maj-rose/12 px-6 py-3.5 font-sans text-[11px] uppercase tracking-[0.34em] text-maj-brown transition hover:border-maj-gold/55 hover:from-maj-gold/26 hover:to-maj-rose/18 disabled:cursor-not-allowed disabled:opacity-45 sm:mt-8 sm:w-auto sm:min-w-[220px]"
              >
                Inquiry
              </button>
              {!whatsappReady && (
                <p className="mt-3 font-sans text-[10px] leading-relaxed text-maj-brown/50">
                  WhatsApp inquiry will be available once the boutique number is configured.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
