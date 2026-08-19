import type { Metadata } from "next";
import AdminSessionTimeout from "./AdminSessionTimeout";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AdminSessionTimeout />
      {children}
    </>
  );
}
