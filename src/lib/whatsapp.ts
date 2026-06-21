/** Set NEXT_PUBLIC_WHATSAPP_NUMBER in .env.local (e.g. 923001234567, no + or spaces). */
const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/\D/g, "") ?? "";

export function isWhatsAppConfigured(): boolean {
  return WHATSAPP_NUMBER.length >= 8;
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
