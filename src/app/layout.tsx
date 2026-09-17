import "./globals.css";
import type { Metadata } from "next";
import {
  Amiri,
  Cormorant_Garamond,
  Playfair_Display,
  Plus_Jakarta_Sans,
} from "next/font/google";
import Header from "./components/header";
import SetVh from "./components/SetVh";
import { ToastProvider } from "./components/ui/toast/ToastProvider";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cormorant",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

// Package card titles only. Cormorant's hairlines thin out at card size (24px);
// Playfair keeps the same high-contrast serif character with sturdier strokes.
const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-playfair",
  display: "swap",
});

const amiri = Amiri({
  subsets: ["arabic", "latin"],
  weight: ["400", "700"],
  variable: "--font-amiri",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://muftitravels.com",
  ),
  title: {
    default: "Mufti Travels | Hajj & Umrah Packages from India",
    template: "%s | Mufti Travels",
  },
  description:
    "Explore trusted Hajj, Umrah and Ziyarat packages from India with Mufti Travels, including Haram-adjacent hotels, guided support and direct flight options.",
  keywords: [
    "Mufti Travels",
    "Umrah Packages Mumbai",
    "Hajj Packages Delhi",
    "Luxury Umrah India",
    "Ziyarat Packages",
    "Clock Tower Hotel Umrah",
  ],
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: "/favicon.png",
  },
  openGraph: {
    title: "Mufti Travels | Hajj & Umrah Packages from India",
    description:
      "Hajj, Umrah and Ziyarat packages with comfortable hotels, guided support and trusted pilgrimage services.",
    siteName: "Mufti Travels",
    locale: "en_IN",
    type: "website",
    // Without this every WhatsApp and Facebook share of the site renders as a
    // bare text link. Package pages override it with their own photo.
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Mufti Travels — Hajj & Umrah packages from India",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mufti Travels | Hajj & Umrah Packages from India",
    description:
      "Explore trusted Hajj, Umrah and Ziyarat packages from India with Mufti Travels.",
    images: ["/og-image.jpg"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${playfair.variable} ${jakarta.variable} ${amiri.variable} scroll-smooth`}
    >
      <body className="font-sans antialiased bg-[#FAF8F5] text-[#1A1A1A] selection:bg-[#D4AF37]/30 selection:text-[#06131D]">
        <SetVh />
        <ToastProvider>
          <Header />
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
