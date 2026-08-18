import "./globals.css";
import type { Metadata } from "next";
import { Cormorant_Garamond, Plus_Jakarta_Sans, Amiri } from "next/font/google";
import Header from "./components/header";
import SetVh from "./components/SetVh";

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

const amiri = Amiri({
  subsets: ["arabic", "latin"],
  weight: ["400", "700"],
  variable: "--font-amiri",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Mufti Travels | Premium Hajj & Umrah Pilgrimage Experiences",
  description:
    "Experience your sacred journey to Makkah and Madinah with peace of mind. Luxury hotels adjacent to the Haram, scholar-led spiritual guidance, direct flights, and 24/7 ground khadim support.",
  keywords: [
    "Mufti Travels",
    "Umrah Packages Mumbai",
    "Hajj Packages Delhi",
    "Umrah 2025",
    "Luxury Umrah India",
    "Ziyarat Packages",
    "Clock Tower Hotel Umrah",
  ],
  icons: {
    icon: "/favicon.png",
  },
  openGraph: {
    title: "Mufti Travels | Sacred Hajj & Umrah Journeys",
    description:
      "Crafted with devotion and luxury. Direct flights, 5-star Haram-adjacent hotels, and complete spiritual guidance.",
    url: "https://muftitravels.com",
    siteName: "Mufti Travels",
    locale: "en_IN",
    type: "website",
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
      className={`${cormorant.variable} ${jakarta.variable} ${amiri.variable} scroll-smooth`}
    >
      <body className="font-sans antialiased bg-[#FAF8F5] text-[#1A1A1A] selection:bg-[#D4AF37]/30 selection:text-[#06131D]">
        <SetVh />
        <Header />
        {children}
      </body>
    </html>
  );
}
