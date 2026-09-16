import type {
  BusinessProfileRecord,
  InvoiceItemRecord,
  InvoicePayment,
  InvoiceRecord,
} from "../invoices";
import type { InvoicePolicyList } from "../siteContent";
import type { InvoiceDocumentVariant } from "./InvoiceDocument";

/**
 * Turn an invoice into a PDF blob, in the browser.
 *
 * Both imports are dynamic, and both have to be: InvoiceDocument imports the
 * renderer at module scope, so a static import of either would pull the whole
 * ~1 MB library into the admin bundle for every screen. This mirrors how
 * lib/metaLeads.ts defers `xlsx` until somebody actually picks a file.
 *
 * Doing this client-side is also what keeps the server surface at zero. The
 * admin's browser already holds this data — RLS handed it over — so no new
 * authenticated endpoint has to exist, and none can leak a customer's bill.
 */
export async function renderInvoicePdf({
  invoice,
  items,
  business,
  payments,
  policies,
  variant = "invoice",
}: {
  invoice: InvoiceRecord;
  items: InvoiceItemRecord[];
  business: BusinessProfileRecord;
  /** Receipts against this invoice, oldest first. Omitted on the issued bill. */
  payments?: InvoicePayment[];
  /** The frozen snapshot for an issued invoice, the live lists for a draft. */
  policies?: InvoicePolicyList[];
  variant?: InvoiceDocumentVariant;
}): Promise<Blob> {
  const [{ pdf }, { default: InvoiceDocument }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("./InvoiceDocument"),
  ]);

  return pdf(
    InvoiceDocument({ invoice, items, business, payments, policies, variant }),
  ).toBlob();
}

/** Filename for a download. Slashes in the number would break it. */
export function invoiceFileName(
  invoice: InvoiceRecord,
  variant: InvoiceDocumentVariant = "invoice",
): string {
  const base = invoice.number
    ? invoice.number.replace(/\//g, "-")
    : `draft-${invoice.id.slice(0, 8)}`;
  return variant === "receipt" ? `${base}-receipt.pdf` : `${base}.pdf`;
}
