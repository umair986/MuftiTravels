import Image from "next/image";
import Hero from "./components/Hero";
import About from "./components/About";
import WhyChooseUs from "./components/WhyChooseUs";
import Packages from "./components/Packages";
import ItineraryTimeline from "./components/itinerary/page";
import AffiliatedPartners from "./components/AffiliatedPartners";

export default function Home() {
  return (
    <main>
      <Hero />
      <About />
      <WhyChooseUs />
      <Packages />
      <ItineraryTimeline />
      <AffiliatedPartners />
    </main>
  );
}
