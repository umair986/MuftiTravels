import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getGalleryCollection, getGalleryIndex } from "@/lib/gallery.server";
import { breadcrumbSchema, galleryCollectionSchema, SITE_URL } from "@/lib/seo";
import JsonLd from "@/app/components/JsonLd";
import Footer from "@/app/components/Footer";
import CollectionGallery from "./CollectionGallery";

type RouteParams = { slug: string };

// Backstop for the cache tag in gallery.server.ts: if a revalidateGallery()
// call is ever missed, this route self-corrects within the hour instead of
// staying frozen at build time indefinitely.
export const revalidate = 3600;

export async function generateStaticParams() {
  const collections = await getGalleryIndex();
  return collections.map((collection) => ({ slug: collection.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { slug } = await params;
  const collection = await getGalleryCollection(slug);
  if (!collection) return { title: "Collection Not Found" };

  const description =
    collection.description ||
    `${collection.photos.length} photos from ${collection.title}.`;
  const coverUrl = collection.cover_image_url?.startsWith("http")
    ? collection.cover_image_url
    : `${SITE_URL}${collection.cover_image_url || "/og-image.jpg"}`;

  return {
    title: collection.title,
    description,
    alternates: { canonical: `/gallery/${collection.slug}` },
    openGraph: {
      title: `${collection.title} | Mufti Travels Gallery`,
      description,
      type: "website",
      images: [{ url: coverUrl, alt: collection.title }],
    },
  };
}

export default async function GalleryCollectionPage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { slug } = await params;
  const collection = await getGalleryCollection(slug);
  if (!collection) notFound();

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Gallery", path: "/gallery" },
          { name: collection.title, path: `/gallery/${collection.slug}` },
        ])}
      />
      <JsonLd data={galleryCollectionSchema(collection)} />
      <main className="min-h-screen bg-[#FAF8F5]">
        <CollectionGallery collection={collection} />
      </main>
      <Footer />
    </>
  );
}
