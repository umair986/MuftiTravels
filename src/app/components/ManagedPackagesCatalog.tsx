"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FiArrowRight, FiClock, FiMapPin } from "react-icons/fi";
import { CmsPackageRecord } from "@/lib/packages";
import { PackageTier } from "@/app/components/packageData";
import { createClient } from "@/lib/supabase/client";

export default function ManagedPackagesCatalog({
  category,
  fallback,
}: {
  category: string;
  fallback: React.ReactNode;
}) {
  const [packages, setPackages] = useState<CmsPackageRecord[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    createClient()
      .from("packages")
      .select("*")
      .eq("category", category)
      .eq("is_published", true)
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        setPackages((data as CmsPackageRecord[]) ?? []);
        setIsLoaded(true);
      });
  }, [category]);

  if (!isLoaded || packages.length === 0) {
    return <>{fallback}</>;
  }

  return (
    <>
      {packages.map((item) => (
        <ManagedPackageCard key={item.id} record={item} />
      ))}
    </>
  );
}

function ManagedPackageCard({ record }: { record: CmsPackageRecord }) {
  const router = useRouter();
  const preferredTier = record.prices["Super Saver"]
    ? "Super Saver"
    : (Object.keys(record.prices)[0] as PackageTier | undefined);
  const preferredPrices = preferredTier
    ? record.prices[preferredTier]
    : undefined;
  const preferredPrice =
    preferredPrices?.Quint ??
    Object.values(preferredPrices ?? {})[0] ??
    record.starting_price;
  const categorySlug = record.category.toLowerCase().replaceAll(" ", "-");

  return (
    <article className="group flex flex-col overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm transition-all duration-300 hover:border-[#D4AF37]/50 hover:shadow-2xl">
      <div className="relative h-60 w-full overflow-hidden bg-stone-900">
        <Image
          src={record.image_url}
          alt={record.name}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#06131D]/80 via-transparent to-transparent" />
        <span className="absolute left-3 top-3 rounded-full bg-amber-700/90 px-3 py-1 text-xs font-bold text-white">
          {preferredTier || "Package"}
        </span>
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full border border-[#D4AF37]/30 bg-[#06131D]/85 px-3 py-1 text-xs font-medium text-[#F3E5AB]">
          <FiMapPin className="h-3.5 w-3.5 text-[#D4AF37]" />
          <span>{record.destinations}</span>
        </div>
        <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-lg bg-black/60 px-2.5 py-1 text-xs font-semibold text-white">
          <FiClock className="h-3.5 w-3.5 text-[#D4AF37]" />
          <span>{record.duration_days} Days</span>
        </div>
      </div>
      <div className="flex flex-1 flex-col justify-between p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">
            {record.category}
          </p>
          <h3 className="mt-2 line-clamp-2 font-display text-2xl font-bold text-[#06131D] transition-colors group-hover:text-[#946E19]">
            {record.name}
          </h3>
          <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-stone-600">
            {record.description}
          </p>
        </div>
        <div className="mt-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">
              {preferredTier ? `${preferredTier} · Quint` : "Starting from"}
            </p>
            <p className="font-display text-2xl font-bold text-[#06131D]">
              {record.currency === "INR" ? "₹" : record.currency}
              {Number(preferredPrice).toLocaleString("en-IN")}
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              router.push(`/packages/${categorySlug}/${record.slug}`)
            }
            className="flex items-center gap-1.5 rounded-xl gold-gradient-bg px-4 py-2.5 text-xs font-bold text-[#06131D] shadow-md transition-all hover:brightness-110 sm:text-sm"
          >
            <span>Book Now</span>
            <FiArrowRight />
          </button>
        </div>
      </div>
    </article>
  );
}
