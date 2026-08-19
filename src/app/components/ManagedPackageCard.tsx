"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FiArrowRight, FiClock, FiMapPin } from "react-icons/fi";
import { createClient } from "@/lib/supabase/client";
import { CmsPackageRecord } from "@/lib/packages";

const packageSlug = "14-days-umrah-land-package";

export default function ManagedPackageCard({
  fallback,
}: {
  fallback: React.ReactNode;
}) {
  const router = useRouter();
  const [record, setRecord] = useState<CmsPackageRecord | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) {
      setHasLoaded(true);
      return;
    }

    supabase
      .from("packages")
      .select("*")
      .eq("slug", packageSlug)
      .eq("is_published", true)
      .maybeSingle()
      .then(({ data, error }) => {
        setRecord((data as CmsPackageRecord | null) ?? null);
        setHasError(Boolean(error));
        setHasLoaded(true);
      });
  }, []);

  if (!hasLoaded || hasError || !record) {
    return <>{fallback}</>;
  }

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
          Land Package
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
            Managed package
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
              Starting from
            </p>
            <p className="font-display text-2xl font-bold text-[#06131D]">
              {record.currency === "INR" ? "₹" : record.currency}
              {record.starting_price.toLocaleString("en-IN")}
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              router.push(
                `/packages/${record.category.toLowerCase().replaceAll(" ", "-")}/${record.slug}`,
              )
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
