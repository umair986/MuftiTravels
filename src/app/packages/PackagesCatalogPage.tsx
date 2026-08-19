"use client";

import { FaKaaba, FaHotel, FaMosque } from "react-icons/fa";
import PackageCardMumbai from "@/app/components/PackageCard/UmrahFixedGroup/PackageCardMumbai";
import PackageCardLucknow from "@/app/components/PackageCard/UmrahFixedGroup/PackageCardLucknow";
import PackageCardDelhi from "@/app/components/PackageCard/UmrahFixedGroup/PackageCardDelhi";
import PackageCard14Days from "@/app/components/PackageCard/UmrahLandPackage/PackageCard14Days";
import PackageCard30Days from "@/app/components/PackageCard/UmrahLandPackage/PackageCard30Days";
import PackageCard25Days from "@/app/components/PackageCard/UmrahLandPackage/PackageCard25Days";
import ZiyaratCard from "@/app/components/PackageCard/Ziyarat/ZiyaratCard";
import ManagedPackagesCatalog from "@/app/components/ManagedPackagesCatalog";

const noop = () => undefined;

export default function PackagesCatalogPage() {
  return (
    <main className="min-h-screen bg-[#FAF8F5] px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mx-auto max-w-3xl text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-3.5 py-1 font-body text-xs font-semibold uppercase tracking-wider text-[#946E19]">
            <FaKaaba className="h-3.5 w-3.5" /> Curated pilgrimage packages
          </p>
          <h1 className="mt-4 font-display text-4xl font-bold tracking-tight text-[#06131D] sm:text-6xl">
            Choose Your Sacred Journey
          </h1>
          <p className="mt-4 font-body text-base leading-relaxed text-stone-600 sm:text-lg">
            Explore fixed-group, land-only and Umrah plus Ziyarat packages from
            India.
          </p>
        </header>

        <PackageGroup
          title="Fixed Group Packages"
          description="Air and hotel packages from Mumbai, Delhi and Lucknow."
          icon={<FaKaaba />}
          category="Umrah Fixed Group"
          fallback={
            <>
              <PackageCardMumbai handleBookNow={noop} />
              <PackageCardLucknow handleBookNow={noop} />
              <PackageCardDelhi handleBookNow={noop} />
            </>
          }
        />

        <PackageGroup
          title="Umrah Land Packages"
          description="Flexible hotel and ground-service options for your pilgrimage."
          icon={<FaHotel />}
          category="Umrah Land Package"
          fallback={
            <>
              <PackageCard14Days handleBookNow={noop} />
              <PackageCard30Days handleBookNow={noop} />
              <PackageCard25Days handleBookNow={noop} />
            </>
          }
        />

        <PackageGroup
          title="Umrah + Ziyarat"
          description="Extend your sacred journey with carefully planned heritage visits."
          icon={<FaMosque />}
          category="Ziyarat"
          fallback={
            <>
              <ZiyaratCard
                title="Umrah Plus Turkey Heritage Tour"
                image="/packages/package1.webp"
                price="₹2,30,786"
                days="18 Days / 17 Nights"
                destinations="Makkah • Madinah • Istanbul • Bursa"
                inclusions={[
                  "Umrah Visa",
                  "Turkey E-Visa",
                  "Bosphorus Cruise",
                  "5★ Hotels",
                ]}
                reviews={26}
                badgeText="Turkey Combo"
                handleBookNow={noop}
              />
              <ZiyaratCard
                title="Umrah Plus Dubai Luxury City Break"
                image="/packages/package2.webp"
                price="₹1,49,786"
                days="16 Days / 15 Nights"
                destinations="Makkah • Madinah • Dubai Marina"
                inclusions={[
                  "Umrah Visa",
                  "Dubai Visa",
                  "Desert Safari",
                  "4★/5★ Hotels",
                ]}
                reviews={28}
                badgeText="Dubai Combo"
                handleBookNow={noop}
              />
              <ZiyaratCard
                title="Umrah Plus Baitul Muqaddas (Al-Aqsa)"
                image="/packages/package3.webp"
                price="₹1,75,786"
                days="20 Days / 19 Nights"
                destinations="Makkah • Madinah • Jerusalem • Jordan"
                inclusions={[
                  "Masjid Al-Aqsa Visit",
                  "Jordan Visa",
                  "Historical Ziyarat",
                  "VIP Transport",
                ]}
                reviews={33}
                badgeText="3 Sacred Mosques"
                handleBookNow={noop}
              />
            </>
          }
        />
      </div>
    </main>
  );
}

function PackageGroup({
  title,
  description,
  icon,
  category,
  fallback,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  category: string;
  fallback: React.ReactNode;
}) {
  return (
    <section className="mt-20 first:mt-16">
      <div className="mb-8 flex items-end justify-between gap-4 border-b border-[#06131D]/10 pb-5">
        <div>
          <h2 className="flex items-center gap-3 font-display text-3xl font-bold text-[#06131D] sm:text-4xl">
            <span className="text-[#D4AF37]">{icon}</span>
            {title}
          </h2>
          <p className="mt-2 font-body text-sm text-stone-600">{description}</p>
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <ManagedPackagesCatalog category={category} fallback={fallback} />
      </div>
    </section>
  );
}
