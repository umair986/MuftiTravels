import Image from "next/image";
import {
  FaHandsHelping,
  FaKaaba,
  FaUserGraduate,
  FaUtensils,
  FaWhatsapp,
} from "react-icons/fa";
import { FiArrowRight } from "react-icons/fi";
import { FOUNDED_YEAR, PILGRIMS_SERVED } from "@/lib/business";

/**
 * The home page's one trust section, placed after the packages: by the time a
 * visitor reaches it they have seen a price, and this is the reason to book.
 *
 * It replaced two sections, "About" and a bento-grid "Why Choose Us", that
 * between them and the hero badges made the same four claims three times —
 * hotels near the Haram, scholar guidance, ground support, pilgrims served —
 * and on a phone ran to roughly five screens. Each claim is now made once,
 * in a sentence. The section keeps the `about` id because the header's
 * "About Us" link and the footer point at it.
 */

const REASONS = [
  {
    icon: <FaKaaba />,
    title: "Hotels close to the Haram",
    desc: "4★ and 5★ hotels in the Clock Tower and Markaziah areas, so elders and families walk to prayer instead of waiting for shuttles.",
  },
  {
    icon: <FaUserGraduate />,
    title: "Scholar-led guidance",
    desc: "Experienced Muftis travel with our groups to guide every rite of Umrah and lead the Ziyarat.",
  },
  {
    icon: <FaUtensils />,
    title: "Hygienic Indian meals",
    desc: "Three fresh buffet meals a day from Indian chefs — familiar food, pure halal.",
  },
  {
    icon: <FaHandsHelping />,
    title: "24/7 Khadim support",
    desc: "Our Arabic & Urdu-speaking team in Makkah & Madinah handles transfers, check-ins, Rawdah permits and medical needs.",
  },
];

const STATS = [
  { value: PILGRIMS_SERVED, label: "Happy Pilgrims" },
  { value: "100%", label: "Visa Success Rate" },
  { value: "4.9 / 5★", label: "Google Rating" },
];

export default function WhyChooseUs() {
  return (
    <section
      className="relative overflow-hidden bg-[#06131D] py-16 text-white sm:py-20"
      id="about"
    >
      <div className="islamic-pattern-dark pointer-events-none absolute inset-0 opacity-20" />
      <div className="pointer-events-none absolute -right-24 top-0 h-72 w-72 rounded-full bg-[#D4AF37]/10 blur-3xl" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-10 max-w-3xl text-center sm:mb-14">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-[#F3E5AB]">
            <FaKaaba className="h-3.5 w-3.5" />
            <span>Khadim al-Hujjaj &bull; Since {FOUNDED_YEAR}</span>
          </div>
          <h2 className="mb-4 font-display text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Why pilgrims travel with{" "}
            <span className="gold-gradient-text italic">Mufti Travels</span>
          </h2>
          <p className="font-body text-base leading-relaxed text-stone-300 sm:text-lg">
            Every traveller is a guest of Allah, and we look after them that
            way — from the visa in India to the last Tawaf.
          </p>
        </div>

        <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12 lg:gap-8">
          <div className="relative h-64 overflow-hidden rounded-3xl border-2 border-[#D4AF37]/30 shadow-2xl sm:h-80 lg:col-span-5 lg:h-auto">
            <Image
              src="/about.jpg"
              alt="Pilgrims at Masjid Al-Haram with Mufti Travels"
              fill
              sizes="(min-width: 1024px) 40vw, 100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#06131D]/90 via-transparent to-transparent" />
            <div className="absolute bottom-5 left-5 right-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#F3E5AB]">
                Our Sacred Promise
              </p>
              <p className="mt-0.5 font-serif text-base italic sm:text-lg">
                &ldquo;You focus solely on your Ibadah & prayers; we take care
                of every worldly detail.&rdquo;
              </p>
            </div>
          </div>

          <div className="flex flex-col lg:col-span-7">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {REASONS.map((reason) => (
                <div
                  key={reason.title}
                  className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 transition-colors hover:border-[#D4AF37]/40"
                >
                  <div className="gold-gradient-bg flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-[#06131D]">
                    {reason.icon}
                  </div>
                  <div>
                    <h3 className="font-display text-xl font-bold text-white">
                      {reason.title}
                    </h3>
                    <p className="mt-1 font-body text-sm leading-relaxed text-stone-300">
                      {reason.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 grid grid-cols-3 gap-4 border-t border-white/10 pt-6 text-center">
              {STATS.map((stat) => (
                <div key={stat.label}>
                  <p className="font-display text-2xl font-bold text-[#F3E5AB] sm:text-3xl">
                    {stat.value}
                  </p>
                  <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-stone-400 sm:text-xs">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row lg:mt-auto lg:pt-8">
              <a
                href="#packages"
                className="gold-gradient-bg flex items-center justify-center gap-2 rounded-full px-7 py-3.5 font-body text-sm font-bold text-[#06131D] shadow-lg transition hover:brightness-110"
              >
                See This Month&apos;s Packages <FiArrowRight />
              </a>
              <a
                href="https://wa.me/919323063712?text=As-salamu%20alaykum,%20I%20would%20like%20to%20consult%20for%20an%20Umrah%20package."
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2.5 rounded-full border border-[#D4AF37]/40 bg-white/10 px-7 py-3.5 font-body text-sm font-semibold text-white transition hover:bg-white/15"
              >
                <FaWhatsapp className="h-5 w-5 text-emerald-400" /> Ask Our Team
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
