"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useGLTF } from "@react-three/drei";
import type { Product } from "@/lib/products";
import { getAllProducts } from "@/lib/products";
import { getModelUrl } from "@/lib/modelAssets";
import { getProductDetailDisplaySize } from "@/lib/productDetailDisplay";
import { getBoutiquePhoneDisplay, openWhatsAppInquiry } from "@/lib/whatsapp";

const ProductDetailCanvas = dynamic(() => import("@/components/product/ProductDetailCanvas"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[42dvh] min-h-[280px] w-full items-center justify-center lg:h-full lg:min-h-0">
      <p className="font-display text-sm italic tracking-[0.22em] text-maj-brown/45">Presenting piece…</p>
    </div>
  ),
});

interface ProductDetailViewProps {
  product: Product;
}

export default function ProductDetailView({ product }: ProductDetailViewProps) {
  const [mounted, setMounted] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(1280);
  const phoneDisplay = getBoutiquePhoneDisplay();
  const displaySize = getProductDetailDisplaySize(product, viewportWidth);
  const others = getAllProducts().filter((item) => item.id !== product.id).slice(0, 3);

  useEffect(() => {
    setMounted(true);
    const sync = () => setViewportWidth(window.innerWidth);
    sync();
    window.addEventListener("resize", sync);
    useGLTF.preload(getModelUrl(product.modelFile));

    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    html.style.overflow = "auto";
    html.style.height = "auto";
    body.style.overflow = "auto";
    body.style.height = "auto";
    body.style.position = "relative";

    return () => {
      window.removeEventListener("resize", sync);
      html.style.overflow = prevHtmlOverflow;
      html.style.height = "";
      body.style.overflow = prevBodyOverflow;
      body.style.height = "";
      body.style.position = "";
    };
  }, [product.modelFile]);

  return (
    <div className="product-detail-immersive relative z-[60] min-h-[100dvh] w-full overflow-x-hidden overflow-y-auto overscroll-y-contain text-maj-brown">
      {/* Boutique interior background — blurred like reference */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <Image
          src={viewportWidth < 768 ? "/main_mob_bg.png" : "/background.png"}
          alt=""
          fill
          priority
          sizes="100vw"
          className="product-detail-bg-image object-cover"
          aria-hidden
        />
        <div className="absolute inset-0 bg-[#F3E8DC]/72 backdrop-blur-[2px]" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#FAF6F1]/55 via-[#F5EBE0]/35 to-[#EDE0D0]/75" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#FAF6F1]/88 lg:to-[#FFFBF7]/92" />
      </div>

      <Link
        href="/"
        className="product-detail-back fixed left-4 top-4 z-40 inline-flex items-center gap-2 font-sans text-[9px] uppercase tracking-[0.34em] text-maj-brown/75 transition hover:text-maj-gold sm:left-6 sm:top-6 sm:text-[10px]"
      >
        <span className="text-base leading-none">←</span>
        Back to Boutique
      </Link>

      <div className="relative mx-auto flex w-full max-w-[1480px] flex-col pb-28 lg:min-h-[130dvh] lg:flex-row lg:items-stretch lg:pb-0">
        {/* 3D product stage — compact on mobile so info panel is visible */}
        <section className="relative flex w-full flex-col justify-center px-3 pb-2 pt-14 sm:px-4 sm:pt-16 lg:min-h-[130dvh] lg:flex-1 lg:px-8 lg:pb-12 lg:pt-20">
          <div className="relative mx-auto h-[42dvh] min-h-[280px] max-h-[420px] w-full sm:h-[48dvh] sm:max-h-[480px] lg:h-[min(96vh,1120px)] lg:max-h-none lg:min-h-0">
            {mounted ? <ProductDetailCanvas product={product} displaySize={displaySize} /> : null}
          </div>
          <p className="pointer-events-none mt-3 text-center font-sans text-[8px] uppercase tracking-[0.38em] text-maj-brown/42 sm:text-[9px]">
            Drag to rotate · Scroll to zoom
          </p>
        </section>

        {/* Info panel — full width below 3D on mobile */}
        <aside className="product-glass-panel relative z-30 mx-3 mt-2 flex w-[calc(100%-1.5rem)] shrink-0 flex-col sm:mx-5 lg:mx-0 lg:mb-12 lg:mr-6 lg:mt-0 lg:w-[min(100%,460px)] lg:min-h-[min(120dvh,1200px)] lg:self-stretch xl:w-[480px]">
          <div className="animate-fade-up px-7 py-10 sm:px-9 sm:py-12 lg:px-10 lg:py-16">
            <p className="font-sans text-[10px] uppercase tracking-[0.48em] text-maj-brown/50 sm:text-[11px]">
              {product.category}
            </p>

            <h1 className="mt-4 font-display text-[clamp(2.4rem,8.5vw,3.5rem)] font-light leading-[1.08] tracking-[0.03em] text-maj-brown sm:mt-5">
              {product.title}
            </h1>

            <p className="mt-3 font-display text-[clamp(1.1rem,3.8vw,1.45rem)] font-light italic tracking-[0.1em] text-maj-brown-mid/85">
              {product.tagline}
            </p>

            <div className="my-6 h-px w-full bg-gradient-to-r from-maj-gold/45 via-maj-gold/15 to-transparent sm:my-8" />

            <p className="font-sans text-[14px] leading-[1.88] text-maj-brown/78 sm:text-[15px] sm:leading-[1.95]">
              {product.description}
            </p>

            <p className="mt-6 font-sans text-[10px] uppercase tracking-[0.36em] text-maj-brown/55 sm:mt-8 sm:text-[11px]">
              {product.materials}
            </p>

            <ul className="mt-5 space-y-3">
              {product.features.map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-3 font-sans text-[14px] leading-relaxed text-maj-brown/72 sm:text-[15px]"
                >
                  <span className="mt-[8px] h-1.5 w-1.5 shrink-0 rotate-45 border border-maj-gold/80 bg-maj-gold/30" />
                  {feature}
                </li>
              ))}
            </ul>

            <div className="mt-9 border-t border-maj-gold/15 pt-8 sm:mt-10">
              <p className="font-sans text-[10px] uppercase tracking-[0.38em] text-maj-brown/45 sm:text-[11px]">Price</p>
              <p className="mt-3 font-display text-[clamp(1.6rem,5.5vw,2.1rem)] tracking-[0.05em] text-maj-brown">
                Contact for Price
              </p>
              <p className="mt-2 font-sans text-[12px] text-maj-brown/48 sm:text-[13px]">{phoneDisplay}</p>
            </div>

            <button
              type="button"
              onClick={() => openWhatsAppInquiry(product.title)}
              className="product-inquiry-gold mt-9 w-full px-8 py-4 font-sans text-[12px] uppercase tracking-[0.4em] transition active:scale-[0.99] sm:mt-10 sm:py-5 sm:text-[13px]"
            >
              Inquiry
            </button>

            <div className="mt-10 border-t border-maj-gold/12 pt-8 sm:mt-12">
              <p className="font-sans text-[10px] uppercase tracking-[0.4em] text-maj-brown/42 sm:text-[11px]">
                More from the collection
              </p>
              <div className="mt-4 flex flex-wrap gap-2.5">
                {others.map((item) => (
                  <Link
                    key={item.id}
                    href={`/product/${item.id}`}
                    className="rounded-full border border-maj-gold/22 bg-white/40 px-4 py-2 font-sans text-[10px] uppercase tracking-[0.22em] text-maj-brown/65 transition hover:border-maj-gold/45 hover:bg-white/65 hover:text-maj-gold sm:text-[11px]"
                  >
                    {item.title}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
