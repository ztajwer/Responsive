import type { Metadata } from "next";
import HomeClient from "@/components/HomeClient";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: siteConfig.title,
  description: siteConfig.description,
  alternates: { canonical: "/" },
};

export default function Home() {
  return (
    <main className="fixed inset-0 h-[100dvh] w-screen overflow-hidden bg-maj-cream">
      <HomeClient />
    </main>
  );
}
