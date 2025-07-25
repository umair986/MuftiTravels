import Hero from "./components/Hero";
import About from "./components/About";
import WhyChooseUs from "./components/WhyChooseUs";
import Packages from "./components/Packages";
import AffiliatedPartners from "./components/AffiliatedPartners";
import Testimonials from "./components/Testimonials";
import ContactSection from "./components/ContactSection";
import GallerySection from "./components/GallerySection";
import Footer from "./components/Footer";
import Offers from "./components/Offers";

export default function Home() {
  return (
    <main>
      <Hero />
      <About />
      <Offers />
      <WhyChooseUs />
      <Packages />
      <AffiliatedPartners />
      <Testimonials />
      <ContactSection />
      <GallerySection />
      <Footer />
    </main>
  );
}
