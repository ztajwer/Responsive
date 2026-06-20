import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import SeoJsonLd from "@/components/SeoJsonLd";
import { siteConfig } from "@/lib/site";
import { GLB_CDN_BASE } from "@/lib/glbConfig";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-cormorant",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#FAF6F1",
  width: "device-width",
  initialScale: 1,
  colorScheme: "light",
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.title,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [...siteConfig.keywords],
  applicationName: siteConfig.name,
  authors: [{ name: siteConfig.name }],
  creator: siteConfig.name,
  publisher: siteConfig.name,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: siteConfig.locale,
    url: "/",
    siteName: siteConfig.name,
    title: siteConfig.title,
    description: siteConfig.description,
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: `${siteConfig.name} — luxury jewelry and fashion`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.title,
    description: siteConfig.description,
    images: ["/logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${cormorant.variable} ${inter.variable}`} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://media.githubusercontent.com" crossOrigin="anonymous" />
        <link
          rel="dns-prefetch"
          href="https://media.githubusercontent.com/media/ztajwer/Responsive/main/public"
        />
        <link
          rel="preload"
          href={`${GLB_CDN_BASE}/table-3d.glb`}
          as="fetch"
          crossOrigin="anonymous"
        />
        <link rel="preload" href="/wh_logo-removebg-preview.png" as="image" />
        <link rel="preload" href="/background.png" as="image" />
        <link rel="preload" href="/main_mob_bg.png" as="image" />
      </head>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <SeoJsonLd />
        {children}
      </body>
    </html>
  );
}
