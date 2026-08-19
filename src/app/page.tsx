import Hero from "./components/Hero";
import About from "./components/About";
import WhyChooseUs from "./components/WhyChooseUs";
import JourneyTimeline from "./components/JourneyTimeline";
import Packages from "./components/Packages";
import Offers from "./components/Offers";
import AffiliatedPartners from "./components/AffiliatedPartners";
import Testimonials from "./components/Testimonials";
import GallerySection from "./components/GallerySection";
import ContactSection from "./components/ContactSection";
import Footer from "./components/Footer";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#FAF8F5]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "TravelAgency",
            name: "Mufti Travels",
            url: "https://muftitravels.com",
            logo: "https://muftitravels.com/favicon.png",
            description:
              "Hajj, Umrah and Ziyarat packages from India with guided pilgrimage support.",
            areaServed: "India",
            serviceType: [
              "Hajj packages",
              "Umrah packages",
              "Ziyarat packages",
            ],
          }),
        }}
      />
      {/* 1. Atmospheric Sacred Hero */}
      <Hero />

      {/* 2. Airline & Hospitality Accreditation Marquee */}
      <AffiliatedPartners />

      {/* 3. About Mufti Travels (Khadim al-Hujjaj narrative) */}
      <About />

      {/* 4. The 5 Blessed Stages of Umrah (Signature Timeline Blueprint) */}
      <JourneyTimeline />

      {/* 5. Curated Packages Catalog (Fixed Group, Land Packages, Ziyarat) */}
      <Packages />

      {/* 6. Why Choose Us (Bento Grid Architecture) */}
      <WhyChooseUs />

      {/* 7. Special Offers & Ramadan Early Bird Perks */}
      <Offers />

      {/* 8. Pilgrim Reflections & Testimonials */}
      <Testimonials />

      {/* 9. Sacred Moments & Holy Sites Gallery */}
      <GallerySection />

      {/* 10. Consultation & Contact Experience */}
      <ContactSection />

      {/* 11. Luxury Obsidian Footer */}
      <Footer />
    </main>
  );
}
