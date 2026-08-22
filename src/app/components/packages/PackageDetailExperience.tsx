"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  FaKaaba,
  FaPassport,
  FaPlane,
  FaStar,
  FaUtensils,
  FaWhatsapp,
} from "react-icons/fa";
import {
  FiArrowRight,
  FiCalendar,
  FiCheck,
  FiMinus,
  FiPlus,
  FiShield,
  FiX,
} from "react-icons/fi";

import Footer from "@/app/components/Footer";
import {
  exclusions,
  inclusions,
  notes,
  policies,
} from "@/app/components/policyData";
import {
  PackageData,
  PackageTier,
  SharingType,
} from "@/app/components/packageData";
import { createClient } from "@/lib/supabase/client";
import { tierName } from "@/lib/taxonomy";
import PackageTagBadges from "@/app/components/PackageTagBadges";
import type { PackageTagRecord, PackageTierRecord } from "@/lib/taxonomy";

const sharingTypes: SharingType[] = ["Quint", "Quad", "Triple", "Double"];

type DetailProps = { pkg: PackageData; categoryName: string };

function EnquiryDialog({
  pkgName,
  onClose,
}: {
  pkgName: string;
  onClose: () => void;
}) {
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const passengers = [
    { label: "Adults", count: adults, update: setAdults, minimum: 1 },
    { label: "Children", count: children, update: setChildren, minimum: 0 },
  ];

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-[#06131D]/85 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="enquiry-title"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-[#D4AF37]/30 bg-[#FAF8F5] p-6 shadow-2xl sm:p-8"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close enquiry form"
          className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full border border-stone-200 text-stone-600 transition-colors hover:border-[#D4AF37] hover:text-[#946E19]"
        >
          <FiX className="h-5 w-5" />
        </button>
        {submitted ? (
          <div className="py-12 text-center">
            <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full bg-emerald-500/10 text-emerald-700">
              <FiCheck className="h-7 w-7" />
            </div>
            <h2
              id="enquiry-title"
              className="font-display text-3xl font-bold text-[#06131D]"
            >
              Enquiry received
            </h2>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-stone-600">
              Our pilgrim advisors will contact you shortly to help plan your
              journey.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-7 rounded-full gold-gradient-bg px-6 py-3 text-sm font-bold text-[#06131D]"
            >
              Close
            </button>
          </div>
        ) : (
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              setIsSubmitting(true);
              setError("");
              const formData = new FormData(event.currentTarget);
              const supabase = createClient();

              if (supabase) {
                const { error: insertError } = await supabase
                  .from("enquiries")
                  .insert({
                    name: String(formData.get("name") || ""),
                    email: String(formData.get("email") || ""),
                    phone: String(formData.get("phone") || ""),
                    package_name: pkgName,
                    adults,
                    children,
                    preferred_date: String(formData.get("date") || "") || null,
                  });

                if (insertError) {
                  setError("We could not save your enquiry. Please try again.");
                  setIsSubmitting(false);
                  return;
                }
              }

              setSubmitted(true);
              setIsSubmitting(false);
            }}
            className="space-y-5"
          >
            <div className="pr-10">
              <p className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#946E19]">
                <FaKaaba /> Sacred journey enquiry
              </p>
              <h2
                id="enquiry-title"
                className="font-display text-3xl font-bold text-[#06131D]"
              >
                Speak with a pilgrim advisor
              </h2>
              <p className="mt-2 text-sm text-stone-600">
                Enquiring for:{" "}
                <span className="font-semibold text-[#06131D]">{pkgName}</span>
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" name="name" />
              <Field label="Phone number" name="phone" type="tel" />
            </div>
            <Field label="Email address" name="email" type="email" />
            <div className="grid gap-4 sm:grid-cols-2">
              {passengers.map(({ label, count, update, minimum }) => (
                <div
                  key={label}
                  className="rounded-xl border border-stone-200 bg-white p-3.5"
                >
                  <p className="text-sm font-semibold text-[#06131D]">
                    {label}
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <button
                      type="button"
                      aria-label={`Reduce ${label}`}
                      onClick={() =>
                        update((value) => Math.max(minimum, value - 1))
                      }
                      className="grid h-9 w-9 place-items-center rounded-full border border-stone-200 text-stone-600 hover:border-[#D4AF37]"
                    >
                      <FiMinus />
                    </button>
                    <span className="font-display text-2xl font-bold text-[#06131D]">
                      {count}
                    </span>
                    <button
                      type="button"
                      aria-label={`Increase ${label}`}
                      onClick={() => update((value) => value + 1)}
                      className="grid h-9 w-9 place-items-center rounded-full border border-stone-200 text-stone-600 hover:border-[#D4AF37]"
                    >
                      <FiPlus />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <Field
              label="Preferred departure date"
              name="date"
              type="date"
              required={false}
            />
            {error && (
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-full gold-gradient-bg px-6 py-3.5 text-sm font-bold text-[#06131D] shadow-lg shadow-[#D4AF37]/20 transition hover:brightness-110"
            >
              {isSubmitting ? "Saving enquiry..." : "Send enquiry"}{" "}
              <FiArrowRight />
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  required = true,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="space-y-1.5 text-sm font-semibold text-[#06131D]">
      {label}
      <input
        required={required}
        name={name}
        type={type}
        className="block w-full rounded-lg border border-stone-200 bg-white px-3.5 py-3 font-normal outline-none transition focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
      />
    </label>
  );
}

function InfoList({
  title,
  items,
  tone = "gold",
}: {
  title: string;
  items: string[];
  tone?: "gold" | "emerald" | "rose";
}) {
  const iconClass =
    tone === "emerald"
      ? "bg-emerald-500/10 text-emerald-700"
      : tone === "rose"
        ? "bg-rose-500/10 text-rose-700"
        : "bg-[#D4AF37]/10 text-[#946E19]";
  return (
    <section>
      <h3 className="mb-4 flex items-center gap-3 font-display text-2xl font-bold text-[#06131D]">
        <span
          className={`grid h-9 w-9 place-items-center rounded-lg ${iconClass}`}
        >
          <FiCheck className="h-4 w-4" />
        </span>
        {title}
      </h3>
      <ul className="space-y-3">
        {items.map((item) => (
          <li
            key={item}
            className="flex gap-3 text-sm leading-relaxed text-stone-600"
          >
            <FiCheck className="mt-1 h-4 w-4 shrink-0 text-[#B2891E]" />
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

function PriceSelector({
  pkg,
  onEnquire,
  tierRegistry,
}: {
  pkg: PackageData;
  onEnquire: () => void;
  tierRegistry: PackageTierRecord[];
}) {
  const availableTiers = useMemo(
    () => Object.keys(pkg.prices) as PackageTier[],
    [pkg.prices],
  );
  const [tier, setTier] = useState<PackageTier>(
    availableTiers.includes("Silver") ? "Silver" : availableTiers[0],
  );
  const [sharing, setSharing] = useState<SharingType>("Quad");
  useEffect(() => {
    if (!pkg.prices[tier]?.[sharing])
      setSharing(
        sharingTypes.find((type) => pkg.prices[tier]?.[type] !== undefined) ??
          "Quad",
      );
  }, [pkg.prices, sharing, tier]);
  const price = pkg.prices[tier]?.[sharing];
  return (
    <aside className="sticky top-24 overflow-hidden rounded-2xl border border-[#D4AF37]/25 bg-[#06131D] shadow-2xl">
      <div className="islamic-pattern-dark border-b border-[#D4AF37]/20 px-6 py-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#F3E5AB]">
          Tailor your stay
        </p>
        <h2 className="mt-1 font-display text-3xl font-bold text-white">
          Configure your package
        </h2>
      </div>
      <div className="space-y-6 p-5 sm:p-6">
        <fieldset>
          <legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone-400">
            Accommodation tier
          </legend>
          <div className="grid grid-cols-2 gap-2">
            {availableTiers.map((item) => {
              const enabled = availableTiers.includes(item);
              return (
                <button
                  key={item}
                  type="button"
                  disabled={!enabled}
                  onClick={() => setTier(item)}
                  className={`min-h-11 rounded-lg border px-2 text-xs font-semibold transition ${tier === item ? "border-[#D4AF37] bg-[#D4AF37] text-[#06131D]" : "border-white/10 bg-white/5 text-stone-300 hover:border-[#D4AF37]/60"} disabled:cursor-not-allowed disabled:border-white/5 disabled:bg-transparent disabled:text-stone-600`}
                >
                  {tierName(item, tierRegistry)}
                </button>
              );
            })}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone-400">
            Room sharing
          </legend>
          <div className="flex flex-wrap gap-2">
            {sharingTypes.map((item) => {
              const enabled = pkg.prices[tier]?.[item] !== undefined;
              return (
                <button
                  key={item}
                  type="button"
                  disabled={!enabled}
                  onClick={() => setSharing(item)}
                  className={`min-h-10 rounded-full border px-3 text-xs font-semibold transition ${sharing === item ? "border-[#D4AF37] bg-[#D4AF37]/15 text-[#F3E5AB]" : "border-white/10 text-stone-300 hover:border-[#D4AF37]/60"} disabled:cursor-not-allowed disabled:border-white/5 disabled:text-stone-600`}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </fieldset>
        <div className="rounded-xl border border-[#D4AF37]/30 bg-[#D4AF37]/10 p-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#F3E5AB]">
            Starting from
          </p>
          <p className="mt-1 font-display text-4xl font-bold text-white">
            {price ? `INR ${price.toLocaleString("en-IN")}` : "On request"}
          </p>
          <p className="mt-1 text-xs text-stone-400">
            Per pilgrim, based on selected sharing
          </p>
        </div>
        <button
          type="button"
          onClick={onEnquire}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full gold-gradient-bg px-5 text-sm font-bold text-[#06131D] transition hover:brightness-110"
        >
          Enquire about this package <FiArrowRight />
        </button>
        <a
          href="https://wa.me/919323063712"
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-11 items-center justify-center gap-2 text-sm font-semibold text-emerald-400 transition hover:text-emerald-300"
        >
          <FaWhatsapp className="h-4 w-4" />
          Instant WhatsApp support
        </a>
      </div>
    </aside>
  );
}

export default function PackageDetailExperience({
  pkg,
  categoryName,
  tiers,
  tags: heroTags,
}: DetailProps & {
  tiers: PackageTierRecord[];
  tags: PackageTagRecord[];
}) {
  const [activeTab, setActiveTab] = useState("Overview");
  const [isFormOpen, setIsFormOpen] = useState(false);
  useEffect(() => {
    document.body.style.overflow = isFormOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isFormOpen]);
  const tabs = ["Overview", "Inclusions", "Policies", "Important notes"];
  return (
    <>
      <AnimatePresence>
        {isFormOpen && (
          <EnquiryDialog
            pkgName={pkg.name}
            onClose={() => setIsFormOpen(false)}
          />
        )}
      </AnimatePresence>
      <main className="bg-[#FAF8F5]">
        <section className="relative isolate min-h-[25rem] overflow-hidden bg-[#06131D]">
          <Image
            src={pkg.image}
            alt={pkg.name}
            fill
            priority
            className="object-cover opacity-50"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#06131D] via-[#06131D]/80 to-[#06131D]/35" />
          <div className="absolute inset-0 islamic-pattern-dark opacity-25" />
          <div className="relative mx-auto flex min-h-[25rem] max-w-7xl flex-col justify-end px-4 pb-16 pt-24 sm:px-6 lg:px-8">
            <nav
              aria-label="Breadcrumb"
              className="mb-5 flex flex-wrap gap-2 text-xs font-medium text-stone-300"
            >
              <Link href="/" className="transition hover:text-[#D4AF37]">
                Home
              </Link>
              <span aria-hidden="true">/</span>
              <span>{categoryName}</span>
              <span aria-hidden="true">/</span>
              <span className="text-[#F3E5AB]">Package details</span>
            </nav>
            <p className="mb-3 inline-flex w-fit items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#F3E5AB]">
              <FaKaaba className="text-[#D4AF37]" /> Curated pilgrimage
            </p>
            <PackageTagBadges
              tagKeys={pkg.card_tags}
              registry={heroTags}
              className="mb-4"
            />
            <h1 className="max-w-4xl font-display text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
              {pkg.name}
            </h1>
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-stone-300">
              <span className="flex items-center gap-1.5 text-[#F3E5AB]">
                {Array.from({ length: pkg.rating }).map((_, index) => (
                  <FaStar key={index} className="h-3.5 w-3.5 text-[#D4AF37]" />
                ))}
                <span className="ml-1 text-stone-200">{pkg.rating}.0</span>
              </span>
              <span>{pkg.reviews} pilgrim reviews</span>
              <span className="inline-flex items-center gap-1.5">
                <FiShield className="text-emerald-400" />
                MoFA-authorized service
              </span>
            </div>
          </div>
        </section>
        <section className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="absolute inset-0 islamic-pattern opacity-30" />
          <div className="relative grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_23rem]">
            <article className="rounded-2xl border border-stone-200 bg-white p-5 shadow-[0_12px_35px_-18px_rgba(6,19,29,0.25)] sm:p-8">
              <div className="mb-7 flex flex-col justify-between gap-4 border-b border-stone-200 pb-6 sm:flex-row sm:items-end">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#946E19]">
                    A journey with care
                  </p>
                  <h2 className="mt-1 font-display text-3xl font-bold text-[#06131D]">
                    Your sacred itinerary
                  </h2>
                </div>
                <div className="flex items-center gap-2 text-sm text-stone-600">
                  <FiCalendar className="text-[#B2891E]" />
                  15 days of guided worship
                </div>
              </div>
              <div
                className="mb-8 flex gap-1 overflow-x-auto border-b border-stone-200"
                role="tablist"
                aria-label="Package information"
              >
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === tab}
                    onClick={() => setActiveTab(tab)}
                    className={`shrink-0 border-b-2 px-3 py-3 text-sm font-semibold transition ${activeTab === tab ? "border-[#D4AF37] text-[#946E19]" : "border-transparent text-stone-500 hover:text-[#06131D]"}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  {activeTab === "Overview" && (
                    <div>
                      <h3 className="font-display text-2xl font-bold text-[#06131D]">
                        A pilgrimage arranged around your peace of mind
                      </h3>
                      <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-600">
                        Travel with the reassurance of thoughtful planning,
                        comfortable accommodation, and guidance throughout your
                        Umrah. Every arrangement is made so you can give your
                        attention to worship in Makkah and Madinah.
                      </p>
                      <div className="mt-6 grid gap-3 sm:grid-cols-3">
                        {pkg.features.map((feature) => (
                          <div
                            key={feature}
                            className="rounded-xl border border-[#D4AF37]/20 bg-[#FAF8F5] p-4 text-sm font-semibold text-[#06131D]"
                          >
                            <FaKaaba className="mb-3 h-4 w-4 text-[#B2891E]" />
                            {feature}
                          </div>
                        ))}
                      </div>
                      <div className="mt-8 grid gap-4 md:grid-cols-3">
                        <InfoTile
                          icon={<FaPlane />}
                          title="Flights & transfers"
                          text="Coordinated airport and ground transfers for a smooth journey."
                        />
                        <InfoTile
                          icon={<FaUtensils />}
                          title="Meals"
                          text="Buffet meals are included with regular packages."
                        />
                        <InfoTile
                          icon={<FaPassport />}
                          title="Visa & insurance"
                          text="Saudi Umrah visa support and essential coverage included."
                        />
                      </div>
                    </div>
                  )}
                  {activeTab === "Inclusions" && (
                    <div className="grid gap-10 md:grid-cols-2">
                      <InfoList
                        title="What is included"
                        items={inclusions}
                        tone="emerald"
                      />
                      <InfoList
                        title="Not included"
                        items={exclusions}
                        tone="rose"
                      />
                    </div>
                  )}
                  {activeTab === "Policies" && (
                    <div className="space-y-10">
                      <InfoList
                        title="Payment policy"
                        items={policies.payment}
                      />
                      <InfoList
                        title="Cancellation policy"
                        items={policies.cancellation}
                        tone="rose"
                      />
                    </div>
                  )}
                  {activeTab === "Important notes" && (
                    <div className="space-y-10">
                      <InfoList
                        title="Important travel notes"
                        items={notes.main}
                      />
                      <InfoList
                        title="Required documents"
                        items={notes.documents}
                        tone="emerald"
                      />
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </article>
            <PriceSelector tierRegistry={tiers} pkg={pkg} onEnquire={() => setIsFormOpen(true)} />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function InfoTile({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-xl border border-stone-200 p-4">
      <span className="mb-3 grid h-9 w-9 place-items-center rounded-lg bg-[#D4AF37]/10 text-[#946E19]">
        {icon}
      </span>
      <h4 className="font-semibold text-[#06131D]">{title}</h4>
      <p className="mt-1 text-xs leading-relaxed text-stone-600">{text}</p>
    </div>
  );
}
