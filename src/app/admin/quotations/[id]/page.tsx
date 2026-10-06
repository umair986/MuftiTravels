import type { Metadata } from "next";
import QuotationEditor from "./QuotationEditor";

export const metadata: Metadata = {
  title: "Quotation",
  robots: { index: false, follow: false },
};

export default async function AdminQuotationRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <QuotationEditor quotationId={id} />;
}
