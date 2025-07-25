import Hero from "./components/Hero";
import About from "./components/About";
import WhyChooseUs from "./components/WhyChooseUs";
import Packages from "./components/Packages";
import ItineraryTimeline from "./components/ItineraryTimeline";
import AffiliatedPartners from "./components/AffiliatedPartners";
import Testimonials from "./components/Testimonials";
import ContactSection from "./components/ContactSection";
import GallerySection from "./components/GallerySection";
import Footer from "./components/Footer";

export default function Home() {
  return (
    <main>
      <Hero />
      <About />
      <WhyChooseUs />
      <Packages />
      <ItineraryTimeline />
      <AffiliatedPartners />
      <Testimonials />
      <ContactSection />
      <GallerySection />
      <Footer />
    </main>
  );
}
