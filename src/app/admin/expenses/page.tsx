import type { Metadata } from "next";
import AdminExpensesPage from "./AdminExpensesPage";

export const metadata: Metadata = {
  title: "Expenses",
  description: "Record and review what the business spent.",
  robots: { index: false, follow: false },
};

export default function AdminExpensesRoute() {
  return <AdminExpensesPage />;
}
