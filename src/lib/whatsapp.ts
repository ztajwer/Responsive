import { siteConfig } from "@/lib/site";

function resolveWhatsAppDigits(): string {
  const fromEnv = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/\D/g, "");
  if (fromEnv && fromEnv.length >= 8) return fromEnv;
  return siteConfig.boutiquePhoneWhatsApp;
}

const WHATSAPP_NUMBER = resolveWhatsAppDigits();

export function isWhatsAppConfigured(): boolean {
  return WHATSAPP_NUMBER.length >= 8;
}

export function getBoutiquePhoneDisplay(): string {
  return siteConfig.boutiquePhoneDisplay;
}

export function buildWhatsAppInquiryUrl(productTitle?: string): string | null {
  if (!isWhatsAppConfigured()) return null;

  const message = productTitle
    ? `Hello, I would like to inquire about the ${productTitle} from MAJ Boutique.`
    : "Hello, I would like to inquire about a piece from MAJ Boutique.";

  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export function openWhatsAppInquiry(productTitle?: string): void {
  const url = buildWhatsAppInquiryUrl(productTitle);
  if (!url) return;
  window.open(url, "_blank", "noopener,noreferrer");
}
