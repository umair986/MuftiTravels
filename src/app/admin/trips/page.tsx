import type { Metadata } from "next";
import AdminTripsPage from "./AdminTripsPage";

export const metadata: Metadata = {
  title: "Departures",
  description: "Group a batch's invoices and expenses, and see its margin.",
  robots: { index: false, follow: false },
};

export default function AdminTripsRoute() {
  return <AdminTripsPage />;
}
