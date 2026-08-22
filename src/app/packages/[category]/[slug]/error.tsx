"use client";

import Link from "next/link";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAF8F5] p-6">
      <div className="text-center">
        <h1 className="mb-3 font-display text-3xl font-bold text-[#06131D]">
          We could not open this package
        </h1>
        <p className="text-stone-600">
          Something went wrong loading this page. Try again, or browse the other
          packages.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-full gold-gradient-bg px-6 py-3 text-sm font-bold text-[#06131D] transition hover:brightness-110"
          >
            Try again
          </button>
          <Link
            href="/packages"
            className="rounded-full border border-stone-300 px-6 py-3 text-sm font-semibold text-[#06131D] transition hover:border-[#D4AF37] hover:text-[#946E19]"
          >
            See all packages
          </Link>
        </div>
      </div>
    </div>
  );
}
