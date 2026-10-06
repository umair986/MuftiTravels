import type { Metadata } from "next";
import AdminQuotationsPage from "./AdminQuotationsPage";

export const metadata: Metadata = {
  title: "Quotations",
  description: "Price a package, send a quotation, convert the ones that land.",
  robots: { index: false, follow: false },
};

export default function AdminQuotationsRoute() {
  return <AdminQuotationsPage />;
}
