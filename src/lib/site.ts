export const siteConfig = {
  name: "MAJ Boutique",
  title: "MAJ Boutique | Luxury Jewelry & Fashion Boutique",
  description:
    "Step inside MAJ Boutique — an immersive luxury jewelry and fashion experience. Explore curated collections with golden glass doors, ambient sound, and premium 3D presentation.",
  keywords: [
    "MAJ Boutique",
    "luxury jewelry",
    "fashion boutique",
    "gold jewelry",
    "designer boutique",
    "luxury shopping",
    "fine jewelry",
  ],
  locale: "en_US",
  sameAs: [] as string[],
  /** Placeholder until client provides real number — shown on product detail pages. */
  boutiquePhoneDisplay: "+92 300 123 4567",
  boutiquePhoneWhatsApp: "923001234567",
  get url() {
    return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  },
} as const;
