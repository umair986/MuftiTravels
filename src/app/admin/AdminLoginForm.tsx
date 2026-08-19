"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AdminLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const supabase = createClient();
    if (!supabase) {
      setError("Supabase is not configured for this deployment.");
      setIsSubmitting(false);
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword(
      {
        email,
        password,
      },
    );

    if (signInError) {
      setError("Invalid email or password. Please try again.");
      setIsSubmitting(false);
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div>
        <label
          htmlFor="email"
          className="mb-2 block font-body text-sm font-semibold text-[#FAF8F5]"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          className="w-full rounded-lg border border-[#FAF8F5]/20 bg-[#06131D] px-4 py-3 font-body text-sm text-[#FAF8F5] outline-none transition placeholder:text-[#879397] focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
          placeholder="Enter email"
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
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          className="w-full rounded-lg border border-[#FAF8F5]/20 bg-[#06131D] px-4 py-3 font-body text-sm text-[#FAF8F5] outline-none transition placeholder:text-[#879397] focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
          placeholder="Enter password"
        />
      </div>

      {error && (
        <p role="alert" className="font-body text-sm text-red-300">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg bg-[#D4AF37] px-4 py-3 font-body text-sm font-bold text-[#06131D] transition hover:bg-[#F3E5AB] focus:outline-none focus:ring-2 focus:ring-[#F3E5AB] focus:ring-offset-2 focus:ring-offset-[#0B1E28] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Signing In..." : "Sign In"}
      </button>
    </form>
  );
}
