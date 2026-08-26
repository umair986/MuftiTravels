"use client";

import { useCallback, useEffect, useState } from "react";
import { FiEdit3, FiPlus, FiTrash2 } from "react-icons/fi";
import { CmsPackageRecord } from "@/lib/packages";
import { createClient } from "@/lib/supabase/client";
import AdminLoginForm from "./AdminLoginForm";
import AdminShell from "./AdminShell";
import ManagedPackageEditor from "./ManagedPackageEditor";
import CreatePackageDialog from "./CreatePackageDialog";
import { useToast } from "../components/ui/toast/useToast";

export default function AdminPackageCollectionPage({
  title,
  description,
  category,
  categories,
}: {
  title: string;
  description: string;
  /** Single category filter (e.g. Hajj, Ramzan). */
  category?: string;
  /** Multi-category filter (e.g. Umrah). Takes precedence over `category`. */
  categories?: string[];
}) {
  const [records, setRecords] = useState<CmsPackageRecord[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Reserved for page-load failure — write outcomes go through toast.
  const [error, setError] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<CmsPackageRecord | null>(
    null,
  );
  const [supabase] = useState(createClient);
  const toast = useToast();

  const load = useCallback(async () => {
    if (!supabase) {
      setError("Supabase is not configured for this deployment.");
      setIsLoading(false);
      return;
    }
    const { data: userData } = await supabase.auth.getUser();
    setEmail(userData.user?.email ?? null);
    if (!userData.user) {
      setIsLoading(false);
      return;
    }
    let query = supabase.from("packages").select("*");
    if (categories?.length) {
      query = query.in("category", categories);
    } else if (category) {
      query = query.eq("category", category);
    }
    const { data, error: queryError } = await query.order("sort_order", {
      ascending: true,
    });
    if (queryError) setError(queryError.message);
    setRecords((data as CmsPackageRecord[]) ?? []);
    setIsLoading(false);
  }, [category, categories, supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  async function deletePackage(record: CmsPackageRecord) {
    if (!supabase) return;
    setPendingDelete(null);
    const { error: deleteError } = await supabase
      .from("packages")
      .delete()
      .eq("id", record.id);
    if (deleteError) {
      toast.error("Could not delete that package.", {
        description: deleteError.message,
      });
      return;
    }
    if (selectedSlug === record.slug) setSelectedSlug(null);
    toast.success(`"${record.name}" deleted.`);
    void load();
  }

  if (isLoading)
    return (
      <main className="grid min-h-screen place-items-center bg-[#F3EFEA] font-body text-sm text-[#526168]">
        Loading {title.toLowerCase()}...
      </main>
    );
  if (!email)
    return (
      <main className="grid min-h-screen place-items-center bg-[#06131D] px-6">
        <section className="w-full max-w-md rounded-2xl bg-[#0B1E28] p-8">
          <h1 className="font-display text-4xl text-white">Admin Login</h1>
          <div className="mt-8">
            <AdminLoginForm />
          </div>
        </section>
      </main>
    );

  return (
    <AdminShell
      title={title}
      description={description}
      email={email}
      headerAction={
        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-[#06131D] px-4 py-3 font-body text-sm font-bold text-[#F3E5AB] transition hover:bg-[#0D2A3A]"
        >
          <FiPlus /> Create new package
        </button>
      }
    >
      {error && (
        <p
          role="alert"
          className="mb-6 rounded-lg bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      <section className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-2xl border border-[#06131D]/10 bg-white p-6 shadow-sm">
          <h2 className="font-display text-3xl font-semibold text-[#06131D]">
            Package list
          </h2>
          <div className="mt-5 space-y-3">
            {records.map((record) => (
              <div
                key={record.id}
                className={`flex items-center justify-between gap-3 rounded-xl border p-4 ${selectedSlug === record.slug ? "border-[#D4AF37] bg-[#FFFCF3]" : "border-stone-200 bg-[#FAF8F5]"}`}
              >
                <div className="min-w-0">
                  <p className="truncate font-body text-sm font-semibold text-[#06131D]">
                    {record.name}
                  </p>
                  <p className="mt-1 text-xs text-[#526168]">
                    {record.is_published ? "Published" : "Draft"}
                  </p>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedSlug(record.slug)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#06131D]/15 px-3 py-2 text-xs font-bold"
                  >
                    <FiEdit3 /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDelete(record)}
                    aria-label={`Delete ${record.name}`}
                    className="inline-flex items-center rounded-lg border border-red-200 px-2.5 py-2 text-red-600 transition hover:bg-red-50"
                  >
                    <FiTrash2 />
                  </button>
                </div>
              </div>
            ))}
            {!records.length && (
              <p className="rounded-xl border border-dashed border-stone-300 p-6 text-center text-sm text-[#526168]">
                No {(category ?? "").toLowerCase() || "umrah"} packages yet. Use
                Create new package to add one.
              </p>
            )}
          </div>
        </div>
        <div className="rounded-2xl border border-[#06131D]/10 bg-white p-6 shadow-sm">
          {selectedSlug ? (
            <ManagedPackageEditor slug={selectedSlug} />
          ) : (
            <div className="grid min-h-64 place-items-center text-center text-sm text-[#526168]">
              Select a package to edit its details, tags and tiers.
            </div>
          )}
        </div>
      </section>

      <CreatePackageDialog
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        fixedCategory={category || undefined}
        allowedCategories={categories}
        existingSlugs={records.map((item) => item.slug)}
        knownCategories={records.map((item) => item.category)}
        onCreated={(slug, name) => {
          setIsCreateOpen(false);
          toast.success(`"${name}" created as a draft.`, {
            description: "Fill it in and publish.",
          });
          setSelectedSlug(slug);
          void load();
        }}
      />

      {pendingDelete && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#06131D]/60 px-5">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="font-display text-2xl font-semibold text-[#06131D]">
              Delete this package?
            </h3>
            <p className="mt-3 font-body text-sm text-[#526168]">
              <strong className="text-[#06131D]">{pendingDelete.name}</strong>{" "}
              and its prices will be removed for good. Any link to{" "}
              <code className="rounded bg-stone-100 px-1.5 py-0.5 text-xs">
                /packages/…/{pendingDelete.slug}
              </code>{" "}
              will stop working. This cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="rounded-lg border border-stone-200 px-4 py-2.5 font-body text-sm font-semibold text-[#06131D]"
              >
                Keep it
              </button>
              <button
                type="button"
                onClick={() => deletePackage(pendingDelete)}
                className="rounded-lg bg-red-600 px-4 py-2.5 font-body text-sm font-bold text-white hover:bg-red-700"
              >
                Delete package
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
