import { FiInfo } from "react-icons/fi";

/**
 * Umrah prices follow the rupee, airfares and hotel availability, so a price
 * on the site is today's rate, not a promise. The payment policy already says
 * so, but inside a tab nobody opens; this line sits where the price is read.
 * It names when the price becomes fixed — on the booking advance — so it
 * reads as how booking works rather than as a hidden-charges escape hatch.
 *
 * One note, one place: change it here and every page follows.
 */
const LEAD =
  "Prices may change without notice due to exchange rates, airfare and hotel availability.";
const FIXED = "Your price is confirmed once your booking advance is received.";

export default function PriceChangeNote({
  tone = "light",
  className = "",
}: {
  /** "dark" on the navy price box, "light" on the cream listing pages. */
  tone?: "light" | "dark";
  className?: string;
}) {
  const dark = tone === "dark";
  return (
    <p
      className={`flex items-start gap-2 font-body text-xs leading-relaxed ${
        dark ? "text-stone-400" : "text-[#526168]"
      } ${className}`}
    >
      <FiInfo
        aria-hidden="true"
        className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${dark ? "text-[#D4AF37]" : "text-[#997A15]"}`}
      />
      <span>
        {LEAD}{" "}
        <span className={`font-semibold ${dark ? "text-stone-200" : "text-[#06131D]"}`}>
          {FIXED}
        </span>
      </span>
    </p>
  );
}
