import type { Metadata } from "next";
import AdminInvoicesPage from "./AdminInvoicesPage";

export const metadata: Metadata = {
  title: "Invoices",
  description: "Raise, issue and send invoices.",
  robots: { index: false, follow: false },
};

export default function AdminInvoicesRoute() {
  return <AdminInvoicesPage />;
}
