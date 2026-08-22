/**
 * Structured data (JSON-LD).
 *
 * One place for the business facts, so the schema, the footer and the contact
 * section can never drift apart — inconsistent name/address/phone across a
 * site is a well-known local-search penalty.
 *
 * Every builder returns a plain object. Render it with
 * `<JsonLd data={...} />` from components/JsonLd.
 */

import { categorySlug } from "@/lib/categories";
import type { CmsPackageRecord } from "@/lib/packages";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://muftitravels.com";

/** The one copy of the NAP (name, address, phone). */
export const BUSINESS = {
  name: "Mufti Travels",
  legalName: "Mufti Travels",
  phone: "+91-93230-63712",
  street: "A/57 Madni Complex, Bandra East",
  locality: "Mumbai",
  region: "Maharashtra",
  postalCode: "400051",
  country: "IN",
  description:
    "Hajj, Umrah and Ziyarat packages from India with Haram-adjacent hotels, guided support and direct flights from Mumbai, Delhi and Lucknow.",
  social: [
    "https://www.instagram.com/mufti.travels/",
    "https://www.facebook.com/profile.php?id=61555597319380",
  ],
} as const;

/** Stable node id so other nodes can reference the business by @id. */
const BUSINESS_ID = `${SITE_URL}/#organization`;

/**
 * The business itself.
 *
 * TravelAgency is a LocalBusiness subtype, so this one node serves both the
 * organisation and the local-search signals. `geo` is deliberately absent:
 * coordinates should be copied from the verified Google Business Profile
 * rather than guessed, and a wrong pin is worse than none.
 */
export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "TravelAgency",
    "@id": BUSINESS_ID,
    name: BUSINESS.name,
    legalName: BUSINESS.legalName,
    url: SITE_URL,
    logo: `${SITE_URL}/Logo.png`,
    image: `${SITE_URL}/og-image.jpg`,
    description: BUSINESS.description,
    telephone: BUSINESS.phone,
    priceRange: "₹₹",
    address: {
      "@type": "PostalAddress",
      streetAddress: BUSINESS.street,
      addressLocality: BUSINESS.locality,
      addressRegion: BUSINESS.region,
      postalCode: BUSINESS.postalCode,
      addressCountry: BUSINESS.country,
    },
    areaServed: [
      { "@type": "Country", name: "India" },
      { "@type": "City", name: "Mumbai" },
      { "@type": "City", name: "Delhi" },
      { "@type": "City", name: "Lucknow" },
    ],
    knowsLanguage: ["en", "hi", "ur"],
    serviceType: [
      "Hajj packages",
      "Umrah packages",
      "Ziyarat packages",
      "Umrah visa assistance",
    ],
    sameAs: [...BUSINESS.social],
    contactPoint: {
      "@type": "ContactPoint",
      telephone: BUSINESS.phone,
      contactType: "customer service",
      areaServed: "IN",
      availableLanguage: ["English", "Hindi", "Urdu"],
    },
  };
}

/** The site itself — lets Google show a sitelinks search box if it chooses. */
export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: BUSINESS.name,
    publisher: { "@id": BUSINESS_ID },
  };
}

/**
 * Breadcrumbs, so a result reads
 * `muftitravels.com › Packages › Hajj` instead of a raw URL.
 */
export function breadcrumbSchema(
  trail: { name: string; path: string }[],
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: `${SITE_URL}${crumb.path}`,
    })),
  };
}

/**
 * A package as a purchasable product.
 *
 * This is what puts a price under the search result. `lowPrice` is the
 * package's own starting price — never invented, and the node is skipped
 * entirely when there is no price to state.
 */
export function packageSchema(pkg: CmsPackageRecord) {
  const url = `${SITE_URL}/packages/${categorySlug(pkg.category)}/${pkg.slug}`;
  const hasPrice = Number(pkg.starting_price) > 0;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: pkg.name,
    description: pkg.description || BUSINESS.description,
    image: pkg.image_url?.startsWith("http")
      ? pkg.image_url
      : `${SITE_URL}${pkg.image_url || "/og-image.jpg"}`,
    brand: { "@id": BUSINESS_ID },
    category: pkg.category,
    url,
    ...(hasPrice
      ? {
          offers: {
            "@type": "Offer",
            url,
            price: Number(pkg.starting_price),
            priceCurrency: pkg.currency || "INR",
            availability: "https://schema.org/InStock",
            seller: { "@id": BUSINESS_ID },
          },
        }
      : {}),
  };
}

/** FAQ rich result. Only pass questions the page actually answers on screen. */
export function faqSchema(faqs: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}
