import "./globals.css";
import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import Header from "./components/header";
import SetVh from "./components/SetVh"; // import the client-side effect

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "Mufti Travels",
  description: "Hajj and Umrah travel packages with care and convenience.",
  icons: {
    icon: "/favicon.png", // or "/favicon.png" if you prefer PNG
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={poppins.variable}>
      <body className={poppins.className}>
        <SetVh />
        <Header />
        {children}
      </body>
    </html>
  );
}
