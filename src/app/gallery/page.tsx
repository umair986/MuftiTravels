import type { Metadata } from "next";
import { getGalleryIndex } from "@/lib/gallery.server";
import { breadcrumbSchema, organizationSchema, websiteSchema } from "@/lib/seo";
import JsonLd from "../components/JsonLd";
import Footer from "../components/Footer";
import GalleryIndex from "./GalleryIndex";

export const metadata: Metadata = {
  title: "Gallery",
  description:
    "Photos from the Two Holy Mosques and historic Ziyarat landmarks, organised by place and by our pilgrim groups.",
  alternates: { canonical: "/gallery" },
};

export default async function GalleryPage() {
  const collections = await getGalleryIndex();

  return (
    <>
      <JsonLd data={organizationSchema()} />
      <JsonLd data={websiteSchema()} />
      <JsonLd data={breadcrumbSchema([{ name: "Gallery", path: "/gallery" }])} />
      <main className="min-h-screen bg-[#FAF8F5]">
        <GalleryIndex collections={collections} />
      </main>
      <Footer />
    </>
  );
}
