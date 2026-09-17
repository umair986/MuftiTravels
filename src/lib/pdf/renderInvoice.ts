import type {
  BusinessProfileRecord,
  InvoiceItemRecord,
  InvoicePayment,
  InvoiceRecord,
} from "../invoices";
import type { InvoicePolicyList } from "../siteContent";
import { toPdfSafeImage } from "./pdfSafeImage";

/**
 * Turn an invoice or a receipt into a PDF blob, in the browser.
 *
 * Every import below is dynamic, and has to be: the documents import the
 * renderer at module scope, so a static import would pull the whole ~1 MB
 * library into the admin bundle for every screen. This mirrors how
 * lib/metaLeads.ts defers `xlsx` until somebody actually picks a file.
 *
 * Doing this client-side is also what keeps the server surface at zero. The
 * admin's browser already holds this data — RLS handed it over — so no new
 * authenticated endpoint has to exist, and none can leak a customer's bill.
 */

/**
 * Here as well as at upload, so a logo saved before the upload step
 * normalised it still prints once rather than twice. See pdfSafeImage.
 */
async function pdfSafeBusiness(
  business: BusinessProfileRecord,
): Promise<BusinessProfileRecord> {
  const [logo, signature] = await Promise.all([
    toPdfSafeImage(business.logo_data_uri).catch(() => ""),
    toPdfSafeImage(business.signature_data_uri).catch(() => ""),
  ]);
  return { ...business, logo_data_uri: logo, signature_data_uri: signature };
}

export async function renderInvoicePdf({
  invoice,
  items,
  business,
  payments,
  policies,
}: {
  invoice: InvoiceRecord;
  items: InvoiceItemRecord[];
  business: BusinessProfileRecord;
  /** Receipts against this invoice, oldest first. Printed once it is settled. */
  payments?: InvoicePayment[];
  /** The frozen snapshot for an issued invoice, the live lists for a draft. */
  policies?: InvoicePolicyList[];
}): Promise<Blob> {
  const [{ pdf }, { default: InvoiceDocument }, safeBusiness] =
    await Promise.all([
      import("@react-pdf/renderer"),
      import("./InvoiceDocument"),
      pdfSafeBusiness(business),
    ]);

  return pdf(
    InvoiceDocument({
      invoice,
      items,
      business: safeBusiness,
      payments,
      policies,
    }),
  ).toBlob();
}

/** One payment's receipt. */
export async function renderReceiptPdf({
  invoice,
  payment,
  business,
}: {
  invoice: InvoiceRecord;
  payment: InvoicePayment;
  business: BusinessProfileRecord;
}): Promise<Blob> {
  const [{ pdf }, { default: ReceiptDocument }, safeBusiness] =
    await Promise.all([
      import("@react-pdf/renderer"),
      import("./ReceiptDocument"),
      pdfSafeBusiness(business),
    ]);

  return pdf(
    ReceiptDocument({ invoice, payment, business: safeBusiness }),
  ).toBlob();
}

/** Filename for a download. Slashes in the number would break it. */
export function invoiceFileName(invoice: InvoiceRecord): string {
  const base = invoice.number
    ? invoice.number.replace(/\//g, "-")
    : `draft-${invoice.id.slice(0, 8)}`;
  return invoice.paid_in_full ? `${base}-paid.pdf` : `${base}.pdf`;
}

export function receiptFileName(payment: InvoicePayment): string {
  return `receipt-${(payment.receipt_number ?? payment.id.slice(0, 8)).replace(/\//g, "-")}.pdf`;
}
