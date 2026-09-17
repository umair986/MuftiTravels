"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FiEdit2, FiImage, FiPlus, FiSearch, FiTrash2 } from "react-icons/fi";
import { CmsPackageRecord } from "@/lib/packages";
import { formatRupees } from "@/lib/money";
import { createClient } from "@/lib/supabase/client";
import AdminLoginForm from "./AdminLoginForm";
import AdminShell from "./AdminShell";
import CreatePackageDialog from "./CreatePackageDialog";
import { useToast } from "../components/ui/toast/useToast";

type StatusFilter = "all" | "published" | "draft";

/**
 * The list screen for one slice of the catalogue (Umrah, Hajj, Ramzan): a table
 * of packages with edit and delete on each row. Editing happens on its own
 * page, `${basePath}/<slug>` — see AdminPackageEditPage.
 *
 * This used to be a master–detail split, list on the left and editor on the
 * right. The editor is a long form, and squeezed into 60% of the column it was
 * cramped on a laptop and stacked below the whole list on a phone.
 */
export default function AdminPackageCollectionPage({
  title,
  description,
  basePath,
  category,
  categories,
}: {
  title: string;
  description: string;
  /** This screen's route; edit pages live beneath it. */
  basePath: string;
  /** Single category filter (e.g. Hajj, Ramzan). */
  category?: string;
  /** Multi-category filter (e.g. Umrah). Takes precedence over `category`. */
  categories?: string[];
}) {
  const [records, setRecords] = useState<CmsPackageRecord[]>([]);
  const [email, setEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Reserved for page-load failure — write outcomes go through toast.
  const [error, setError] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<CmsPackageRecord | null>(
    null,
  );
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [supabase] = useState(createClient);
  const toast = useToast();
  const router = useRouter();

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

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return records.filter((record) => {
      if (status === "published" && !record.is_published) return false;
      if (status === "draft" && record.is_published) return false;
      if (!needle) return true;
      return [record.name, record.slug, record.category, record.destinations]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [records, search, status]);

  const publishedCount = records.filter((record) => record.is_published).length;

  const editHref = (slug: string) =>
    `${basePath}/${encodeURIComponent(slug)}`;

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

  const emptyLabel = (category ?? "").toLowerCase() || "umrah";

  return (
    <AdminShell
      title={title}
      description={description}
      email={email}
      headerAction={
        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#06131D] px-4 py-3 font-body text-sm font-bold text-[#F3E5AB] transition hover:bg-[#0D2A3A] sm:w-auto"
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

      <section className="overflow-hidden rounded-2xl border border-[#06131D]/10 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-stone-100 p-4 sm:flex-row sm:items-center sm:p-5">
          <p className="font-body text-sm text-[#526168]">
            <strong className="text-[#06131D]">{records.length}</strong>{" "}
            {records.length === 1 ? "package" : "packages"} ·{" "}
            <span className="text-emerald-700">{publishedCount} published</span>
          </p>
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:justify-end">
            <label className="relative block sm:w-64">
              <span className="sr-only">Search packages</span>
              <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#526168]" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name or destination"
                className="w-full rounded-lg border border-stone-200 bg-white py-2.5 pl-9 pr-3 font-body text-sm outline-none transition focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
              />
            </label>
            <label>
              <span className="sr-only">Filter by status</span>
              <select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as StatusFilter)
                }
                className="h-full w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 font-body text-sm outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 sm:w-auto"
              >
                <option value="all">All statuses</option>
                <option value="published">Published</option>
                <option value="draft">Drafts</option>
              </select>
            </label>
          </div>
        </div>

        {/* Desktop and tablet: a table. */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full font-body text-sm">
            <thead>
              <tr className="bg-[#FAF8F5] text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-[#526168]">
                <th scope="col" className="px-5 py-3">
                  Package
                </th>
                <th scope="col" className="px-4 py-3">
                  Duration
                </th>
                <th scope="col" className="px-4 py-3">
                  From
                </th>
                <th scope="col" className="px-4 py-3">
                  Status
                </th>
                <th scope="col" className="px-5 py-3 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {visible.map((record) => (
                <tr
                  key={record.id}
                  className="transition hover:bg-[#FFFCF3]"
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Thumbnail record={record} />
                      <div className="min-w-0">
                        <Link
                          href={editHref(record.slug)}
                          className="block truncate font-semibold text-[#06131D] hover:text-[#997A15]"
                        >
                          {record.name}
                        </Link>
                        <p className="mt-0.5 truncate text-xs text-[#526168]">
                          {record.category}
                          {record.destinations
                            ? ` · ${record.destinations}`
                            : ""}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-[#526168]">
                    {formatDuration(record)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-semibold text-[#06131D]">
                    {formatStartingPrice(record)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge isPublished={record.is_published} />
                  </td>
                  <td className="px-5 py-3">
                    <RowActions
                      record={record}
                      href={editHref(record.slug)}
                      onDelete={() => setPendingDelete(record)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Phones: the same rows as cards. */}
        <ul className="divide-y divide-stone-100 md:hidden">
          {visible.map((record) => (
            <li key={record.id} className="flex gap-3 p-4">
              <Thumbnail record={record} />
              <div className="min-w-0 flex-1">
                <Link
                  href={editHref(record.slug)}
                  className="block font-body text-sm font-semibold text-[#06131D]"
                >
                  {record.name}
                </Link>
                <p className="mt-0.5 font-body text-xs text-[#526168]">
                  {formatDuration(record)} · {formatStartingPrice(record)}
                </p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <StatusBadge isPublished={record.is_published} />
                  <RowActions
                    record={record}
                    href={editHref(record.slug)}
                    onDelete={() => setPendingDelete(record)}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>

        {!records.length && (
          <p className="m-5 rounded-xl border border-dashed border-stone-300 p-8 text-center font-body text-sm text-[#526168]">
            No {emptyLabel} packages yet. Use Create new package to add one.
          </p>
        )}
        {Boolean(records.length) && !visible.length && (
          <p className="m-5 rounded-xl border border-dashed border-stone-300 p-8 text-center font-body text-sm text-[#526168]">
            No packages match these filters.
          </p>
        )}
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
          router.push(editHref(slug));
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
              <code className="break-all rounded bg-stone-100 px-1.5 py-0.5 text-xs">
                /packages/…/{pendingDelete.slug}
              </code>{" "}
              will stop working. This cannot be undone.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
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

function formatDuration(record: CmsPackageRecord) {
  if (!record.duration_days) return "—";
  return `${record.duration_days}D / ${record.duration_nights}N`;
}

/** `starting_price` is whole rupees; money.ts formats paise. */
function formatStartingPrice(record: CmsPackageRecord) {
  const rupees = Number(record.starting_price) || 0;
  if (rupees <= 0) return "No price";
  return formatRupees(Math.round(rupees * 100), { trimZeroPaise: true });
}

function Thumbnail({ record }: { record: CmsPackageRecord }) {
  return (
    <div className="relative h-12 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-[#06131D]">
      {record.image_url ? (
        <Image
          src={record.image_url}
          alt=""
          fill
          sizes="64px"
          className="object-cover"
          unoptimized
        />
      ) : (
        <FiImage className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[#D4AF37]/60" />
      )}
    </div>
  );
}

function StatusBadge({ isPublished }: { isPublished: boolean }) {
  return isPublished ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 font-body text-xs font-semibold text-emerald-700">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Published
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 font-body text-xs font-semibold text-amber-700">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Draft
    </span>
  );
}

function RowActions({
  record,
  href,
  onDelete,
}: {
  record: CmsPackageRecord;
  href: string;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center justify-end gap-1.5">
      <Link
        href={href}
        aria-label={`Edit ${record.name}`}
        title="Edit"
        className="grid h-9 w-9 place-items-center rounded-lg border border-[#06131D]/15 text-[#06131D] transition hover:border-[#D4AF37] hover:bg-[#FFFCF3] hover:text-[#997A15]"
      >
        <FiEdit2 />
      </Link>
      <button
        type="button"
        onClick={onDelete}
        aria-label={`Delete ${record.name}`}
        title="Delete"
        className="grid h-9 w-9 place-items-center rounded-lg border border-red-200 text-red-600 transition hover:bg-red-50"
      >
        <FiTrash2 />
      </button>
    </div>
  );
}
