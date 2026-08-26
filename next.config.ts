import type { NextConfig } from "next";

/**
 * Supabase storage host, derived from the project URL so this does not have to
 * be edited when the project changes.
 */
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseHost
      ? [
          {
            protocol: "https",
            hostname: supabaseHost,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },

  /**
   * Security headers.
   *
   * The admin panel is cookie-authenticated (@supabase/ssr), so without
   * frame-ancestors an attacker page could iframe /admin/packages and overlay
   * bait above a destructive control. That is the concrete risk here; the rest
   * is defence in depth.
   *
   * No Content-Security-Policy yet — Next emits inline bootstrap scripts, so a
   * meaningful CSP needs nonces and would break the site if bolted on blind.
   * Worth doing as its own change, in Report-Only first.
   */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'none'",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
      {
        // Belt and braces against the admin area being indexed if a route's own
        // robots metadata is ever missed. Caching needs nothing here: Next
        // already serves these pages `no-store` and overrides any value set at
        // this layer (verified against a production build).
        source: "/admin/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
