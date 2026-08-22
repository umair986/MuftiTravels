import type { Metadata } from "next";
import AdminContentPage from "./AdminContentPage";

export const metadata: Metadata = {
  title: "Inclusions & Policies",
  robots: { index: false, follow: false },
};

export default function ContentPage() {
  return <AdminContentPage />;
}
