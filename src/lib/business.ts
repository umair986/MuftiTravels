/**
 * How long Mufti Travels has been operating.
 *
 * The site once claimed "15+ years"; the business has operated since 2022.
 * Every mention of its age reads from here and is computed, so the number
 * stays true each new year without anyone remembering to edit copy.
 *
 * Plain module with no imports, so client components can use it without
 * pulling anything else into their bundle.
 */

export const FOUNDED_YEAR = 2022;

/** Whole years since founding, counted by calendar year (4 in 2026). */
export function yearsInService(now: Date = new Date()): number {
  return Math.max(1, now.getFullYear() - FOUNDED_YEAR);
}

/** Pilgrims served, as the site states it. Update here when the figure grows. */
export const PILGRIMS_SERVED = "1,000+";

/** The office phone, which is also its WhatsApp. seo.ts carries it in schema.org's format. */
export const PHONE_DISPLAY = "+91 93230 63712";
export const PHONE_TEL = "tel:+919323063712";
const WHATSAPP_DIGITS = "919323063712";

/** A wa.me link to the business, with the visitor's opening message filled in. */
export function whatsappBusinessUrl(message?: string): string {
  const base = `https://wa.me/${WHATSAPP_DIGITS}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

/**
 * A wa.me link to a customer, or null when the number is too short to be one.
 * Digits only, so "+91 93230 63712" still opens; a bare 10-digit number is
 * taken as Indian — every departure city on this site is in India.
 */
export function whatsappCustomerUrl(
  phone: string | null | undefined,
  message: string,
): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length < 10) return null;
  const withCountry = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${withCountry}?text=${encodeURIComponent(message)}`;
}

/** The admin's reply to a website or Meta-ad enquiry. */
export function whatsappEnquiryReplyUrl(phone: string, name: string): string | null {
  return whatsappCustomerUrl(
    phone,
    `As-salamu alaykum ${name || ""}, this is Mufti Travels replying to your enquiry.`.trim(),
  );
}
