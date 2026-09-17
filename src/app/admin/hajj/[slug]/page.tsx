import type { Metadata } from "next";
import AdminPackageEditPage from "../../AdminPackageEditPage";

export const metadata: Metadata = {
  title: "Edit package",
  robots: { index: false, follow: false },
};

export default async function AdminEditPackageRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <AdminPackageEditPage
      slug={decodeURIComponent(slug)}
      backHref="/admin/hajj"
      backLabel="Hajj Packages"
    />
  );
}
