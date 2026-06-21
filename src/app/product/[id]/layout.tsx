import type { Metadata } from "next";
import WhatsAppPlugin from "@/components/product/WhatsAppPlugin";

export const metadata: Metadata = {
  robots: { index: true, follow: true },
};

export default function ProductDetailLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <WhatsAppPlugin />
    </>
  );
}
