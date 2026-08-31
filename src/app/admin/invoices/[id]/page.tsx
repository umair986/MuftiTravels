import type { Metadata } from "next";
import InvoiceEditor from "./InvoiceEditor";

export const metadata: Metadata = {
  title: "Invoice",
  robots: { index: false, follow: false },
};

export default async function AdminInvoiceRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <InvoiceEditor invoiceId={id} />;
}
