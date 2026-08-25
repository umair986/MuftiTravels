import type { Metadata } from "next";
import AdminGalleryPage from "./AdminGalleryPage";

export const metadata: Metadata = {
  title: "Gallery",
  robots: { index: false, follow: false },
};

export default function GalleryRoute() {
  return <AdminGalleryPage />;
}
