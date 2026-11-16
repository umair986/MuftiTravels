import { getPublicCatalog } from "@/lib/packages.server";
import { getHomeCollections } from "@/lib/gallery.server";
import { organizationSchema, websiteSchema } from "@/lib/seo";
import JsonLd from "../components/layout/JsonLd";
import Hero from "../components/home/Hero";
import WhyChooseUs from "../components/home/WhyChooseUs";
import DepartureCities from "../components/home/DepartureCities";
import AffiliatedPartners from "../components/home/AffiliatedPartners";
import Testimonials from "../components/home/Testimonials";
import GallerySection from "../components/home/GallerySection";
import ContactSection from "../components/home/ContactSection";
import Footer from "../components/layout/Footer";

export default async function Home() {
  const [{ packages }, galleryCollections] = await Promise.all([
    getPublicCatalog(),
    getHomeCollections(),
  ]);

  return (
    <main className="min-h-screen bg-[#FAF8F5]">
      <JsonLd data={organizationSchema()} />
      <JsonLd data={websiteSchema()} />
      {/* Order follows the sale: offer, prices, reasons to trust, proof,
          contact. The 5-stage Umrah timeline used to sit before the prices;
          that teaching lives at /guides/how-to-perform-umrah-step-by-step. */}

      {/* 1. Hero — headline and one way to the prices */}
      <Hero />

      {/* 2. Departure cities — this month's packages, Mumbai featured */}
      <DepartureCities packages={packages} />

      {/* 3. Why Mufti Travels (About + Why Choose Us, merged) */}
      <WhyChooseUs />

      {/* 4. Airline partners */}
      <AffiliatedPartners />

      {/* 5. Pilgrim Reflections & Testimonials */}
      <Testimonials />

      {/* 6. Sacred Moments & Holy Sites Gallery */}
      <GallerySection collections={galleryCollections} />

      {/* 7. Consultation & Contact Experience */}
      <ContactSection />

      {/* 8. Luxury Obsidian Footer */}
      <Footer />
    </main>
  );
}
