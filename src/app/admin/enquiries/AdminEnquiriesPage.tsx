"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FiDownload, FiFileText, FiMail, FiPhone, FiSave } from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createDraftFromLead } from "@/lib/invoices";
import { useToast } from "../../components/ui/toast/useToast";
import AdminLoginForm from "../AdminLoginForm";
import AdminShell from "../AdminShell";

type Status = "new" | "contacted" | "closed";

type Enquiry = {
  id: string;
  name: string;
  email: string;
  phone: string;
  departure_city: string;
  package_preference: string;
  package_name: string;
  adults: number;
  children: number;
  preferred_date: string | null;
  notes: string;
  admin_notes: string;
  status: Status;
  created_at: string;
};

const STATUSES: { value: Status | "all"; label: string }[] = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "closed", label: "Closed" },
  { value: "all", label: "All" },
];

const PAGE_SIZE = 25;

function formatDate(value: string | null) {
  if (!value) return "";
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf())
    ? value
    : parsed.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
}

/** Digits only, so a number typed as "+91 93230 63712" still opens WhatsApp. */
function whatsappUrl(phone: string, name: string) {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  const withCountry = digits.length === 10 ? `91${digits}` : digits;
  const text = encodeURIComponent(
    `As-salamu alaykum ${name || ""}, this is Mufti Travels replying to your enquiry.`.trim(),
  );
  return `https://wa.me/${withCountry}?text=${text}`;
}

export default function AdminEnquiriesPage() {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [statusFilter, setStatusFilter] = useState<Status | "all">("new");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [totalMatching, setTotalMatching] = useState(0);
  const [email, setEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Reserved for page-load failure — write outcomes go through toast.
  const [error, setError] = useState("");
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

    // Page in the database, not in JavaScript. This used to select every
    // matching row and slice client-side, so the admin downloaded the whole
    // table on each visit.
    let query = supabase
      .from("enquiries")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
    if (statusFilter !== "all") query = query.eq("status", statusFilter);

    // Counts come back as headers rather than rows.
    const countFor = (status?: Status) => {
      let q = supabase
        .from("enquiries")
        .select("id", { count: "exact", head: true });
      if (status) q = q.eq("status", status);
      return q;
    };

    const [
      { data, count, error: loadError },
      newCount,
      contactedCount,
      closedCount,
      allCount,
    ] = await Promise.all([
      query,
      countFor("new"),
      countFor("contacted"),
      countFor("closed"),
      countFor(),
    ]);

    if (loadError) {
      setError(
        loadError.message.includes("admin_notes")
          ? "Run 009_enquiry_admin_notes.sql in Supabase to enable follow-up notes."
          : loadError.message,
      );
    } else {
      setError("");
      setEnquiries((data as Enquiry[]) ?? []);
      setTotalMatching(count ?? 0);
    }

    setCounts({
      new: newCount.count ?? 0,
      contacted: contactedCount.count ?? 0,
      closed: closedCount.count ?? 0,
      all: allCount.count ?? 0,
    });
    setIsLoading(false);
  }, [supabase, statusFilter, page]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(0);
  }, [statusFilter]);

  /**
   * The status write used to be fire-and-forget: the badge flipped locally
   * whether or not the database agreed. A failed write meant a customer was
   * marked contacted and never called again, silently.
   */
  async function updateStatus(id: string, status: Status) {
    if (!supabase) return;
    const previous = enquiries.find((item) => item.id === id)?.status;
    setEnquiries((current) =>
      current.map((item) => (item.id === id ? { ...item, status } : item)),
    );

    const { error: updateError } = await supabase
      .from("enquiries")
      .update({ status })
      .eq("id", id);

    if (updateError) {
      toast.error("Could not update that enquiry.", {
        description: updateError.message,
      });
      if (previous) {
        setEnquiries((current) =>
          current.map((item) =>
            item.id === id ? { ...item, status: previous } : item,
          ),
        );
      }
      return;
    }
    const label =
      STATUSES.find((option) => option.value === status)?.label ?? status;
    toast.success(`Marked as ${label.toLowerCase()}.`, { key: `status-${id}` });
    void load();
  }

  async function saveNotes(id: string, adminNotes: string) {
    if (!supabase) return { ok: false };
    const { error: saveError } = await supabase
      .from("enquiries")
      .update({ admin_notes: adminNotes })
      .eq("id", id);
    if (saveError) {
      toast.error("Could not save that note.", {
        description: saveError.message,
      });
      return { ok: false };
    }
    toast.success("Note saved.");
    setEnquiries((current) =>
      current.map((item) =>
        item.id === id ? { ...item, admin_notes: adminNotes } : item,
      ),
    );
    return { ok: true };
  }

  /**
   * Lead to bill in two clicks. The details are copied into an editable draft,
   * not linked — see createDraftFromLead.
   */
  async function createInvoice(enquiry: Enquiry) {
    if (!supabase) return;
    const { id, error: createError } = await createDraftFromLead(supabase, {
      name: enquiry.name,
      phone: enquiry.phone,
      email: enquiry.email,
      enquiryId: enquiry.id,
    });
    if (!id) {
      toast.error("Could not start an invoice.", { description: createError ?? undefined });
      return;
    }
    router.push(`/admin/invoices/${id}`);
  }

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return enquiries;
    return enquiries.filter((item) =>
      `${item.name} ${item.phone} ${item.email} ${item.departure_city} ${item.package_name}`
        .toLowerCase()
        .includes(term),
    );
  }, [enquiries, search]);

  const visible = filtered;
  const pageCount = Math.max(1, Math.ceil(totalMatching / PAGE_SIZE));

  async function exportCsv() {
    if (!supabase) return;
    // Export the whole filtered set, not just the page on screen.
    let exportQuery = supabase
      .from("enquiries")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5000);
    if (statusFilter !== "all")
      exportQuery = exportQuery.eq("status", statusFilter);
    const { data: rows, error: exportError } = await exportQuery;
    if (exportError) {
      toast.error("Could not export.", { description: exportError.message });
      return;
    }
    const exportRows = (rows as Enquiry[]) ?? [];
    const columns: (keyof Enquiry)[] = [
      "created_at",
      "status",
      "name",
      "phone",
      "email",
      "departure_city",
      "package_name",
      "package_preference",
      "adults",
      "children",
      "preferred_date",
      "notes",
      "admin_notes",
    ];
    const escape = (value: unknown) =>
      `"${String(value ?? "").replaceAll('"', '""')}"`;
    const csv = [
      columns.join(","),
      ...exportRows.map((row) =>
        columns.map((key) => escape(row[key])).join(","),
      ),
    ].join("\n");

    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `enquiries-${statusFilter}-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(
      exportRows.length === 1
        ? "1 enquiry exported."
        : `${exportRows.length} enquiries exported.`,
    );
  }

  if (isLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#F3EFEA] font-body text-sm text-[#526168]">
        Loading enquiries...
      </main>
    );
  }

  if (!email) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#06131D] px-6">
        <section className="w-full max-w-md rounded-2xl bg-[#0B1E28] p-8">
          <h1 className="font-display text-4xl text-white">Admin Login</h1>
          <p className="mt-2 font-body text-sm text-[#B8C2C5]">
            Sign in to review enquiries.
          </p>
          <div className="mt-8">
            <AdminLoginForm />
          </div>
        </section>
      </main>
    );
  }

  return (
    <AdminShell
      title="Enquiries"
      description="Every enquiry submitted through the website appears here."
      email={email}
      headerAction={
        <button
          type="button"
          onClick={() => void exportCsv()}
          disabled={!totalMatching}
          className="inline-flex items-center gap-2 rounded-lg border border-[#06131D]/15 px-4 py-2.5 font-body text-sm font-semibold text-[#06131D] transition hover:border-[#997A15] hover:text-[#997A15] disabled:opacity-50"
        >
          <FiDownload /> Export CSV
        </button>
      }
    >
      {error && (
        <p
          role="alert"
          className="mb-6 rounded-lg bg-red-50 p-3 font-body text-sm text-red-700"
        >
          {error}
        </p>
      )}

      {/* Status filter — the page opens on New, which is what needs action */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((option) => {
            const isCurrent = statusFilter === option.value;
            const count = counts[option.value] ?? 0;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setStatusFilter(option.value)}
                aria-pressed={isCurrent}
                className={`rounded-full px-4 py-2 font-body text-sm font-semibold transition ${
                  isCurrent
                    ? "bg-[#06131D] text-[#F3E5AB]"
                    : "border border-stone-200 bg-white text-[#526168] hover:border-[#D4AF37]"
                }`}
              >
                {option.label}
                <span
                  className={`ml-2 text-xs ${isCurrent ? "text-[#D4AF37]" : "text-stone-400"}`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <label className="sm:w-72">
          <span className="sr-only">Search enquiries</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search this page"
            className="w-full rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 font-body text-sm outline-none transition focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
          />
        </label>
      </div>

      <section className="mt-6 space-y-4">
        {visible.map((enquiry) => (
          <EnquiryCard
            key={enquiry.id}
            enquiry={enquiry}
            onStatusChange={updateStatus}
            onSaveNotes={saveNotes}
            onCreateInvoice={createInvoice}
          />
        ))}

        {!filtered.length && (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-12 text-center font-body text-sm text-[#526168]">
            {search
              ? `Nothing matches "${search}".`
              : statusFilter === "all"
                ? "No enquiries yet."
                : `No ${statusFilter} enquiries.`}
          </div>
        )}

        {pageCount > 1 && (
          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((current) => Math.max(0, current - 1))}
              className="rounded-lg border border-stone-200 bg-white px-4 py-2.5 font-body text-sm font-semibold text-[#06131D] transition hover:border-[#D4AF37] disabled:opacity-40"
            >
              Previous
            </button>
            <p className="font-body text-sm text-[#526168]">
              Page {page + 1} of {pageCount} · {totalMatching} total
            </p>
            <button
              type="button"
              disabled={page + 1 >= pageCount}
              onClick={() => setPage((current) => current + 1)}
              className="rounded-lg border border-stone-200 bg-white px-4 py-2.5 font-body text-sm font-semibold text-[#06131D] transition hover:border-[#D4AF37] disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </section>
    </AdminShell>
  );
}

function EnquiryCard({
  enquiry,
  onStatusChange,
  onSaveNotes,
  onCreateInvoice,
}: {
  enquiry: Enquiry;
  onStatusChange: (id: string, status: Status) => void;
  onSaveNotes: (id: string, notes: string) => Promise<{ ok: boolean }>;
  onCreateInvoice: (enquiry: Enquiry) => void;
}) {
  const [notes, setNotes] = useState(enquiry.admin_notes ?? "");
  const [isSaving, setIsSaving] = useState(false);
  useEffect(() => setNotes(enquiry.admin_notes ?? ""), [enquiry.admin_notes]);

  const isDirty = notes !== (enquiry.admin_notes ?? "");
  const whatsapp = whatsappUrl(enquiry.phone, enquiry.name);

  return (
    <article className="rounded-2xl border border-[#06131D]/10 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-display text-2xl font-semibold text-[#06131D]">
              {enquiry.name}
            </h2>
            <span
              className={`rounded-full px-3 py-1 font-body text-xs font-semibold ${
                enquiry.status === "new"
                  ? "bg-amber-100 text-amber-800"
                  : enquiry.status === "contacted"
                    ? "bg-blue-100 text-blue-800"
                    : "bg-emerald-100 text-emerald-800"
              }`}
            >
              {enquiry.status}
            </span>
          </div>
          <p className="mt-1 font-body text-xs text-[#526168]">
            {new Date(enquiry.created_at).toLocaleString("en-IN")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {whatsapp && (
            <a
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 font-body text-xs font-bold text-white transition hover:bg-emerald-700"
            >
              <FaWhatsapp className="h-4 w-4" /> WhatsApp
            </a>
          )}
          <button
            type="button"
            onClick={() => onCreateInvoice(enquiry)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-2 font-body text-xs font-bold text-[#526168] transition hover:border-[#D4AF37] hover:text-[#997A15]"
          >
            <FiFileText className="h-4 w-4" /> Invoice
          </button>
          <label>
            <span className="sr-only">Status for {enquiry.name}</span>
            <select
              value={enquiry.status}
              onChange={(event) =>
                onStatusChange(enquiry.id, event.target.value as Status)
              }
              className="rounded-lg border border-stone-200 bg-white px-3 py-2 font-body text-sm text-[#06131D] outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
            >
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="closed">Closed</option>
            </select>
          </label>
        </div>
      </div>

      <div className="mt-5 grid gap-4 border-t border-stone-100 pt-5 sm:grid-cols-2 lg:grid-cols-4">
        <EnquiryItem
          label="Phone"
          value={enquiry.phone}
          href={`tel:${enquiry.phone}`}
          icon={<FiPhone />}
        />
        <EnquiryItem
          label="Email"
          value={enquiry.email}
          href={`mailto:${enquiry.email}`}
          icon={<FiMail />}
        />
        <EnquiryItem
          label="Package"
          value={
            enquiry.package_name ||
            enquiry.package_preference ||
            "General enquiry"
          }
        />
        <EnquiryItem
          label="Journey"
          value={`${enquiry.departure_city || "Not specified"} · ${enquiry.adults} adults, ${enquiry.children} children`}
        />
      </div>

      {(enquiry.preferred_date || enquiry.notes) && (
        <div className="mt-4 rounded-lg bg-[#FAF8F5] p-4 font-body text-sm text-[#526168]">
          {enquiry.preferred_date && (
            <p>
              <strong>Preferred date:</strong>{" "}
              {formatDate(enquiry.preferred_date)}
            </p>
          )}
          {enquiry.notes && (
            <p className="mt-1">
              <strong>From the customer:</strong> {enquiry.notes}
            </p>
          )}
        </div>
      )}

      <div className="mt-4">
        <label
          htmlFor={`notes-${enquiry.id}`}
          className="font-body text-xs font-semibold uppercase tracking-wider text-stone-400"
        >
          Follow-up notes (internal)
        </label>
        <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
          <textarea
            id={`notes-${enquiry.id}`}
            rows={2}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Called twice, no answer. Trying again Tuesday."
            className="flex-1 resize-y rounded-lg border border-stone-200 bg-white px-3 py-2 font-body text-sm outline-none transition focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
          />
          {isDirty && (
            <button
              type="button"
              disabled={isSaving}
              onClick={async () => {
                setIsSaving(true);
                await onSaveNotes(enquiry.id, notes);
                setIsSaving(false);
              }}
              className="inline-flex h-10 items-center justify-center gap-1.5 self-start rounded-lg bg-[#D4AF37] px-4 font-body text-xs font-bold text-[#06131D] disabled:opacity-60"
            >
              <FiSave /> {isSaving ? "Saving..." : "Save"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function EnquiryItem({
  label,
  value,
  href,
  icon,
}: {
  label: string;
  value: string;
  href?: string;
  icon?: React.ReactNode;
}) {
  const content = (
    <>
      <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">
        {label}
      </p>
      <p className="mt-1 flex items-center gap-1.5 break-words text-sm text-[#06131D]">
        {icon}
        {value}
      </p>
    </>
  );
  return href ? (
    <a href={href} className="block hover:text-[#997A15]">
      {content}
    </a>
  ) : (
    <div>{content}</div>
  );
}
