import { getPublicCatalog } from "@/lib/packages.server";
import { getHomeCollections } from "@/lib/gallery.server";
import { organizationSchema, websiteSchema } from "@/lib/seo";
import JsonLd from "./components/JsonLd";
import Hero from "./components/Hero";
import About from "./components/About";
import WhyChooseUs from "./components/WhyChooseUs";
import JourneyTimeline from "./components/JourneyTimeline";
import Packages from "./components/Packages";
import AffiliatedPartners from "./components/AffiliatedPartners";
import Testimonials from "./components/Testimonials";
import GallerySection from "./components/GallerySection";
import ContactSection from "./components/ContactSection";
import Footer from "./components/Footer";

export default async function Home() {
  const [{ packages, tiers, tags }, galleryCollections] = await Promise.all([
    getPublicCatalog(),
    getHomeCollections(),
  ]);

  return (
    <main className="min-h-screen bg-[#FAF8F5]">
      <JsonLd data={organizationSchema()} />
      <JsonLd data={websiteSchema()} />
      {/* 1. Atmospheric Sacred Hero */}
      <Hero />

      {/* 2. Airline & Hospitality Accreditation Marquee */}
      <AffiliatedPartners />

      {/* 3. About Mufti Travels (Khadim al-Hujjaj narrative) */}
      <About />

      {/* 4. The 5 Blessed Stages of Umrah (Signature Timeline Blueprint) */}
      <JourneyTimeline />

      {/* 5. Curated Packages Catalog (Fixed Group, Land Packages, Ziyarat) */}
      <Packages packages={packages} tiers={tiers} tags={tags} />

      {/* 6. Why Choose Us (Bento Grid Architecture) */}
      <WhyChooseUs />

      {/* 7. Pilgrim Reflections & Testimonials */}
      <Testimonials />

      {/* 8. Sacred Moments & Holy Sites Gallery */}
      <GallerySection collections={galleryCollections} />

      {/* 9. Consultation & Contact Experience */}
      <ContactSection />

      {/* 10. Luxury Obsidian Footer */}
      <Footer />
    </main>
  );
}
