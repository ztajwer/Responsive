import type { Metadata } from "next";
import DetailPageScroll from "@/components/product/DetailPageScroll";
import WhatsAppPlugin from "@/components/product/WhatsAppPlugin";

export const metadata: Metadata = {
  robots: { index: true, follow: true },
};

export default function ProductDetailLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DetailPageScroll />
      {children}
      <WhatsAppPlugin />
    </>
  );
}
