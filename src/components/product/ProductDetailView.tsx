"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useGLTF } from "@react-three/drei";
import type { Product } from "@/lib/products";
import { getModelUrl } from "@/lib/modelAssets";
import { getBoutiquePhoneDisplay, openWhatsAppInquiry } from "@/lib/whatsapp";

const ProductDetailCanvas = dynamic(() => import("@/components/product/ProductDetailCanvas"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[min(56dvh,460px)] w-full items-center justify-center md:min-h-full">
      <div className="flex flex-col items-center gap-4">
        <div className="h-px w-20 bg-gradient-to-r from-transparent via-maj-gold/80 to-transparent" />
        <p className="font-display text-sm italic tracking-[0.2em] text-maj-brown/50">Curating piece</p>
        <div className="h-1 w-1 rotate-45 border border-maj-gold/60 product-ornament-glow" />
      </div>
    </div>
  ),
});

function OrnamentDivider() {
  return (
    <div className="my-5 flex items-center gap-3 sm:my-6">
      <div className="h-px flex-1 bg-gradient-to-r from-maj-gold/60 via-maj-gold/20 to-transparent" />
      <div className="flex items-center gap-2">
        <div className="h-1 w-1 rotate-45 border border-maj-gold/70" />
        <div className="h-1.5 w-1.5 rotate-45 border border-maj-gold" />
        <div className="h-1 w-1 rotate-45 border border-maj-gold/70" />
      </div>
      <div className="h-px flex-1 bg-gradient-to-l from-maj-gold/60 via-maj-gold/20 to-transparent" />
    </div>
  );
}

interface ProductDetailViewProps {
  product: Product;
}

export default function ProductDetailView({ product }: ProductDetailViewProps) {
  const [mounted, setMounted] = useState(false);
  const phoneDisplay = getBoutiquePhoneDisplay();

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
    <div className="product-detail-page fixed inset-0 z-[60] overflow-y-auto overflow-x-hidden text-maj-brown">
      <div className="pointer-events-none absolute inset-0 opacity-[0.35]">
        <div className="absolute left-[8%] top-[12%] h-32 w-32 rounded-full bg-maj-gold/10 blur-3xl" />
        <div className="absolute bottom-[18%] right-[6%] h-40 w-40 rounded-full bg-maj-rose/12 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-7xl flex-col">
        <header className="sticky top-0 z-30 border-b border-maj-gold/12 bg-[#faf6f1e8] backdrop-blur-xl">
          <div className="flex items-center justify-between px-4 py-3.5 sm:px-8 sm:py-4">
            <Link
              href="/"
              className="group inline-flex items-center gap-2.5 font-sans text-[10px] uppercase tracking-[0.32em] text-maj-brown/65 transition hover:text-maj-gold"
            >
              <span
                aria-hidden
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-maj-gold/25 bg-white/50 transition group-hover:border-maj-gold/45"
              >
                ←
              </span>
              Boutique
            </Link>
            <div className="text-center">
              <p className="font-sans text-[8px] uppercase tracking-[0.55em] text-maj-gold/70 sm:text-[9px]">
                MAJ
              </p>
              <p className="font-display text-[11px] italic tracking-[0.28em] text-maj-brown/55 sm:text-xs">
                Atelier
              </p>
            </div>
            <div className="w-[72px] sm:w-[88px]" aria-hidden />
          </div>
        </header>

        <div className="flex flex-1 flex-col lg:grid lg:min-h-[calc(100dvh-4.25rem)] lg:grid-cols-[1.08fr_0.92fr]">
          <section className="relative px-3 pb-2 pt-3 sm:px-5 sm:pt-5 lg:px-8 lg:py-8">
            <div className="product-detail-frame h-[min(56dvh,480px)] overflow-hidden rounded-[1.35rem] bg-gradient-to-br from-[#F8F0E8] via-maj-cream to-[#EBDCCB] lg:h-full lg:min-h-[calc(100dvh-8rem)] lg:rounded-[1.5rem]">
              {mounted ? <ProductDetailCanvas product={product} /> : null}
            </div>
          </section>

          <section className="flex flex-col justify-center px-5 pb-32 pt-2 sm:px-8 sm:pt-4 lg:px-10 lg:pb-12 lg:pr-12 xl:px-14">
            <div className="animate-fade-up">
              <span className="inline-flex items-center gap-2 rounded-full border border-maj-gold/25 bg-white/55 px-3.5 py-1.5 font-sans text-[9px] uppercase tracking-[0.42em] text-maj-gold sm:text-[10px]">
                <span className="h-1 w-1 rounded-full bg-maj-gold" />
                {product.category}
              </span>

              <h1 className="mt-4 font-display text-[clamp(2.35rem,9vw,3.75rem)] font-light leading-[1.02] tracking-[0.04em] text-maj-brown sm:mt-5">
                {product.title}
              </h1>

              <p className="mt-2 font-display text-[clamp(1rem,3.8vw,1.25rem)] font-light italic tracking-[0.12em] text-maj-brown-mid/80">
                {product.tagline}
              </p>

              <OrnamentDivider />

              <p className="max-w-lg font-sans text-[13px] leading-[1.85] tracking-[0.015em] text-maj-brown/74 sm:text-[14px] sm:leading-[1.9]">
                {product.description}
              </p>

              <div className="mt-7 grid gap-3 sm:mt-8 sm:grid-cols-2 sm:gap-4">
                <div className="rounded-2xl border border-maj-gold/20 bg-gradient-to-br from-white/70 to-white/35 p-4 shadow-[0_8px_32px_rgba(61,43,31,0.06)] backdrop-blur-sm sm:p-5">
                  <p className="font-sans text-[9px] uppercase tracking-[0.4em] text-maj-brown/45">Pricing</p>
                  <p className="mt-2 font-display text-[clamp(1.2rem,4.8vw,1.55rem)] tracking-[0.06em] text-maj-brown">
                    Contact for Price
                  </p>
                  <p className="mt-1.5 font-sans text-[10px] tracking-wide text-maj-brown/50">
                    Bespoke quotation on request
                  </p>
                </div>

                <div className="rounded-2xl border border-maj-gold/20 bg-gradient-to-br from-white/70 to-white/35 p-4 shadow-[0_8px_32px_rgba(61,43,31,0.06)] backdrop-blur-sm sm:p-5">
                  <p className="font-sans text-[9px] uppercase tracking-[0.4em] text-maj-brown/45">Boutique</p>
                  <p className="mt-2 font-display text-[clamp(1.05rem,4.2vw,1.35rem)] tracking-[0.05em] text-maj-brown">
                    {phoneDisplay}
                  </p>
                  <p className="mt-1.5 font-sans text-[10px] tracking-wide text-maj-brown/50">
                    Placeholder · WhatsApp inquiry
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => openWhatsAppInquiry(product.title)}
                className="product-inquiry-btn mt-7 w-full rounded-full border border-maj-gold/40 bg-gradient-to-r from-maj-gold via-[#c9a04a] to-maj-gold px-8 py-4 font-sans text-[11px] uppercase tracking-[0.38em] text-maj-brown shadow-[0_10px_30px_rgba(212,175,55,0.28)] transition hover:brightness-105 hover:shadow-[0_14px_36px_rgba(212,175,55,0.34)] active:scale-[0.99] sm:mt-8 sm:w-auto sm:min-w-[260px]"
              >
                Inquiry via WhatsApp
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
