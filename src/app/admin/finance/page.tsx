import type { Metadata } from "next";
import AdminFinancePage from "./AdminFinancePage";

export const metadata: Metadata = {
  title: "Reports",
  description: "Revenue, spending and per-departure profit.",
  robots: { index: false, follow: false },
};

export default function AdminFinanceRoute() {
  return <AdminFinancePage />;
}
