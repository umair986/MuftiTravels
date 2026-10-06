import type { BusinessProfileRecord } from "../invoices";
import type { QuotationItemRecord, QuotationRecord } from "../quotations";
import type { InvoicePolicyList } from "../siteContent";
import { pdfSafeBusiness } from "./pdfSafeImage";

/**
 * Turn a quotation into a PDF blob, in the browser.
 *
 * Every import below is dynamic, and has to be, for the same reason
 * renderInvoice.ts spells out: QuotationDocument imports @react-pdf/renderer at
 * module scope, so a static import here would pull the whole ~1 MB library into
 * the admin bundle for every screen rather than only the one that renders.
 *
 * A separate module from renderInvoice.ts rather than another function inside it
 * so that the two dynamic import() specifiers stay statically analysable and the
 * bundler can split the two documents apart — importing this file must not drag
 * InvoiceDocument along with it.
 */
export async function renderQuotationPdf({
  quotation,
  items,
  business,
  policies,
}: {
  quotation: QuotationRecord;
  items: QuotationItemRecord[];
  business: BusinessProfileRecord;
  /** The frozen snapshot once sent, the live lists for a draft. */
  policies?: InvoicePolicyList[];
}): Promise<Blob> {
  const [{ pdf }, { default: QuotationDocument }, safeBusiness] =
    await Promise.all([
      import("@react-pdf/renderer"),
      import("./QuotationDocument"),
      pdfSafeBusiness(business),
    ]);

  return pdf(
    QuotationDocument({
      quotation,
      items,
      business: safeBusiness,
      policies,
    }),
  ).toBlob();
}
