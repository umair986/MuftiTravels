import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Header from "./components/header";
import SetVh from "./components/SetVh"; // import the client-side effect

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Mufti Travels",
  description: "Hajj and Umrah travel packages with care and convenience.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SetVh /> {/* now safe to use useEffect */}
        <Header />
        {children}
      </body>
    </html>
  );
}
