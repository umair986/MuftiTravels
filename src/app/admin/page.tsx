import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Login | Mufti Travels",
  description: "Sign in to the Mufti Travels admin area.",
};

export default function AdminLoginPage() {
  return (
    <main className="islamic-pattern flex min-h-[calc(100vh-5rem)] items-center justify-center bg-[#06131D] px-6 py-16">
      <section className="w-full max-w-md rounded-2xl border border-[#D4AF37]/30 bg-[#0B1E28] p-8 shadow-2xl shadow-black/20 sm:p-10">
        <div className="mb-8 text-center">
          <p className="mb-3 font-body text-xs font-semibold uppercase tracking-[0.25em] text-[#D4AF37]">
            Mufti Travels
          </p>
          <h1 className="font-display text-4xl font-semibold text-[#FAF8F5]">
            Admin Login
          </h1>
          <p className="mt-3 font-body text-sm text-[#B8C2C5]">
            Enter your details to continue.
          </p>
        </div>

        <form className="space-y-5">
          <div>
            <label
              htmlFor="username"
              className="mb-2 block font-body text-sm font-semibold text-[#FAF8F5]"
            >
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
              className="w-full rounded-lg border border-[#FAF8F5]/20 bg-[#06131D] px-4 py-3 font-body text-sm text-[#FAF8F5] outline-none transition placeholder:text-[#879397] focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
              placeholder="Enter username"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block font-body text-sm font-semibold text-[#FAF8F5]"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="w-full rounded-lg border border-[#FAF8F5]/20 bg-[#06131D] px-4 py-3 font-body text-sm text-[#FAF8F5] outline-none transition placeholder:text-[#879397] focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
              placeholder="Enter password"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-[#D4AF37] px-4 py-3 font-body text-sm font-bold text-[#06131D] transition hover:bg-[#F3E5AB] focus:outline-none focus:ring-2 focus:ring-[#F3E5AB] focus:ring-offset-2 focus:ring-offset-[#0B1E28]"
          >
            Sign In
          </button>
        </form>
      </section>
    </main>
  );
}
