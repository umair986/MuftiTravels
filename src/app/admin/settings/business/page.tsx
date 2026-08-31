import type { Metadata } from "next";
import BusinessSettingsPage from "./BusinessSettingsPage";

export const metadata: Metadata = {
  title: "Business details",
  description: "Company identity, bank details and invoice defaults.",
  robots: { index: false, follow: false },
};

export default function BusinessSettingsRoute() {
  return <BusinessSettingsPage />;
}
