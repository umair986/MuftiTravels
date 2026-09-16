"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FiAlertTriangle,
  FiFileText,
  FiSave,
  FiTrash2,
  FiUploadCloud,
  FiMail,
  FiPhone,
} from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createDraftFromLead } from "@/lib/invoices";
import {
  META_LEAD_STATUSES,
  STATUS_STYLES,
  readLeadFile,
  statusLabel,
  whatsappUrl,
  type MetaLeadRecord,
  type MetaLeadStatus,
  type ParseResult,
} from "@/lib/metaLeads";
import { useToast } from "../../components/ui/toast/useToast";
import AdminLoginForm from "../AdminLoginForm";
import AdminShell from "../AdminShell";

const PAGE_SIZE = 25;
/** Supabase rejects very large single inserts; 500 rows per call is comfortable. */
const INSERT_CHUNK = 500;
/** Far above any realistic Meta export; guards the browser, not the server. */
const MAX_IMPORT_BYTES = 10 * 1024 * 1024;

type StatusFilter = MetaLeadStatus | "all";

function formatDate(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf())
    ? value
    : parsed.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
}

export default function AdminMetaLeadsPage() {
  const [leads, setLeads] = useState<MetaLeadRecord[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("new");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [totalMatching, setTotalMatching] = useState(0);
  const [email, setEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<ParseResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [supabase] = useState(createClient);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const router = useRouter();

  /**
   * Lead to bill in two clicks. Details are copied into an editable draft,
   * never linked back — see createDraftFromLead.
   */
  async function createInvoice(lead: MetaLeadRecord) {
    if (!supabase) return;
    const { id, error: createError } = await createDraftFromLead(supabase, {
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      metaLeadId: lead.id,
    });
    if (!id) {
      toast.error("Could not start an invoice.", {
        description: createError ?? undefined,
      });
      return;
    }
    router.push(`/admin/invoices/${id}`);
  }

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

    let query = supabase
      .from("meta_leads")
      .select("*", { count: "exact" })
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
    if (statusFilter !== "all") query = query.eq("status", statusFilter);

    const countFor = (status?: MetaLeadStatus) => {
      let q = supabase
        .from("meta_leads")
        .select("id", { count: "exact", head: true })
        .is("deleted_at", null);
      if (status) q = q.eq("status", status);
      return q;
    };

    const [{ data, count, error: loadError }, ...statusCounts] =
      await Promise.all([
        query,
        ...META_LEAD_STATUSES.map((option) => countFor(option.value)),
        countFor(),
      ]);

    if (loadError) {
      setError(
        loadError.message.includes("meta_leads")
          ? "Run 015_meta_leads.sql in Supabase to create the Meta leads table."
          : loadError.message,
      );
    } else {
      setError("");
      setLeads((data as MetaLeadRecord[]) ?? []);
      setTotalMatching(count ?? 0);
    }

    const next: Record<string, number> = {};
    META_LEAD_STATUSES.forEach((option, index) => {
      next[option.value] = statusCounts[index]?.count ?? 0;
    });
    next.all = statusCounts[META_LEAD_STATUSES.length]?.count ?? 0;
    setCounts(next);
    setIsLoading(false);
  }, [supabase, statusFilter, page]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(0);
  }, [statusFilter]);

  async function onFilePicked(file: File | undefined) {
    if (!file) return;
    // Parsing happens in this tab. A very large workbook freezes the browser
    // before it ever reaches the mapping code, so stop it here.
    if (file.size > MAX_IMPORT_BYTES) {
      toast.error(`"${file.name}" is larger than 10 MB.`, {
        description:
          "Export a shorter date range from Meta and upload that instead.",
      });
      return;
    }
    setIsReading(true);
    setPreview(null);
    try {
      const result = await readLeadFile(file);
      if (!result.rows.length) {
        toast.error("No usable rows in that file.", {
          description:
            "Every row needs at least a name or a phone number. Check you exported the leads sheet.",
        });
        return;
      }
      setPreview(result);
    } catch (readError) {
      toast.error("Could not read that file.", {
        description:
          readError instanceof Error ? readError.message : "Unknown error.",
      });
    } finally {
      setIsReading(false);
      // Let the same file be picked again after a failed read.
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  /**
   * Upsert rather than insert, ignoring conflicts on dedupe_key. Re-uploading a
   * sheet that overlaps last week's therefore adds only what is new and never
   * resets a status somebody already set.
   */
  async function runImport() {
    if (!supabase || !preview) return;
    setIsImporting(true);

    const before = counts.all ?? 0;
    let failed = 0;

    for (let index = 0; index < preview.rows.length; index += INSERT_CHUNK) {
      const chunk = preview.rows.slice(index, index + INSERT_CHUNK);
      const { error: insertError } = await supabase
        .from("meta_leads")
        .upsert(chunk, { onConflict: "dedupe_key", ignoreDuplicates: true });
      if (insertError) {
        failed += chunk.length;
        setError(insertError.message);
      }
    }

    // The honest number of new rows is the change in total, since duplicates
    // are silently ignored by the upsert rather than reported. Deleted leads
    // are excluded on both sides of the subtraction: a removed lead whose row
    // is in this sheet again stays removed, and counts as a duplicate.
    const { count: after } = await supabase
      .from("meta_leads")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null);
    const added = Math.max(0, (after ?? 0) - before);
    const duplicates = preview.rows.length - added - failed;

    setIsImporting(false);
    setPreview(null);

    if (failed) {
      toast.error(`${failed} rows could not be imported.`, {
        description: "See the message above the list.",
      });
    } else {
      toast.success(
        added === 1 ? "1 new lead imported." : `${added} new leads imported.`,
        {
          description:
            duplicates > 0
              ? `${duplicates} were already in the list and were left untouched.`
              : undefined,
        },
      );
    }
    setStatusFilter("new");
    setPage(0);
    void load();
  }

  async function updateStatus(id: string, status: MetaLeadStatus) {
    if (!supabase) return;
    const previous = leads.find((lead) => lead.id === id)?.status;
    setLeads((current) =>
      current.map((lead) => (lead.id === id ? { ...lead, status } : lead)),
    );

    const { error: updateError } = await supabase
      .from("meta_leads")
      .update({ status })
      .eq("id", id);

    if (updateError) {
      toast.error("Could not update that lead.", {
        description: updateError.message,
      });
      if (previous) {
        setLeads((current) =>
          current.map((lead) =>
            lead.id === id ? { ...lead, status: previous } : lead,
          ),
        );
      }
      return;
    }
    toast.success(`Marked as ${statusLabel(status).toLowerCase()}.`, {
      key: `meta-status-${id}`,
    });
    void load();
  }

  async function saveNotes(id: string, adminNotes: string) {
    if (!supabase) return { ok: false };
    const { error: saveError } = await supabase
      .from("meta_leads")
      .update({ admin_notes: adminNotes })
      .eq("id", id);
    if (saveError) {
      toast.error("Could not save that note.", {
        description: saveError.message,
      });
      return { ok: false };
    }
    toast.success("Note saved.");
    setLeads((current) =>
      current.map((lead) =>
        lead.id === id ? { ...lead, admin_notes: adminNotes } : lead,
      ),
    );
    return { ok: true };
  }

  /**
   * Soft delete, and it has to be: the table dedupes on dedupe_key, so a row
   * removed outright would come straight back — still marked New — with the
   * next sheet upload, since every export overlaps the last one. Keeping the
   * row keeps the key, and the import's ignoreDuplicates leaves it alone.
   */
  async function deleteLead(lead: MetaLeadRecord) {
    if (!supabase) return;
    const { error: deleteError } = await supabase
      .from("meta_leads")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", lead.id);

    if (deleteError) {
      toast.error("Could not remove that lead.", {
        description: deleteError.message,
      });
      return;
    }

    setLeads((current) => current.filter((item) => item.id !== lead.id));
    toast.success(`${lead.name || "Lead"} removed.`, {
      // Longer than the 4s default: undo is only useful if it is still on
      // screen when the mistake registers.
      duration: 10000,
      action: { label: "Undo", onClick: () => void restoreLead(lead.id) },
    });
    void load();
  }

  async function restoreLead(id: string) {
    if (!supabase) return;
    const { error: restoreError } = await supabase
      .from("meta_leads")
      .update({ deleted_at: null })
      .eq("id", id);
    if (restoreError) {
      toast.error("Could not restore that lead.", {
        description: restoreError.message,
      });
      return;
    }
    toast.success("Lead restored.");
    void load();
  }

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return leads;
    return leads.filter((lead) =>
      `${lead.name} ${lead.phone} ${lead.email} ${lead.city} ${lead.campaign_name}`
        .toLowerCase()
        .includes(term),
    );
  }, [leads, search]);

  const pageCount = Math.max(1, Math.ceil(totalMatching / PAGE_SIZE));

  if (isLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#F3EFEA] font-body text-sm text-[#526168]">
        Loading Meta leads...
      </main>
    );
  }

  if (!email) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#06131D] px-6">
        <section className="w-full max-w-md rounded-2xl bg-[#0B1E28] p-8">
          <h1 className="font-display text-4xl text-white">Admin Login</h1>
          <p className="mt-2 font-body text-sm text-[#B8C2C5]">
            Sign in to review Meta leads.
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
      title="Meta Ads"
      description="Leads imported from your Facebook and Instagram lead forms."
      email={email}
      headerAction={
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="sr-only"
            onChange={(event) => void onFilePicked(event.target.files?.[0])}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isReading}
            className="inline-flex items-center gap-2 rounded-lg bg-[#06131D] px-4 py-3 font-body text-sm font-bold text-[#F3E5AB] transition hover:bg-[#0D2A3A] disabled:opacity-60"
          >
            <FiUploadCloud /> {isReading ? "Reading..." : "Upload leads file"}
          </button>
        </>
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

      {preview && (
        <ImportPreview
          preview={preview}
          isImporting={isImporting}
          onConfirm={() => void runImport()}
          onCancel={() => setPreview(null)}
        />
      )}

      {/* Status filter — opens on New, which is what needs calling */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {[...META_LEAD_STATUSES, { value: "all", label: "All" } as const].map(
            (option) => {
              const isCurrent = statusFilter === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setStatusFilter(option.value as StatusFilter)}
                  aria-pressed={isCurrent}
                  className={`rounded-full px-3.5 py-2 font-body text-sm font-semibold transition ${
                    isCurrent
                      ? "bg-[#06131D] text-[#F3E5AB]"
                      : "border border-stone-200 bg-white text-[#526168] hover:border-[#D4AF37]"
                  }`}
                >
                  {option.label}
                  <span
                    className={`ml-2 text-xs ${isCurrent ? "text-[#D4AF37]" : "text-stone-400"}`}
                  >
                    {counts[option.value] ?? 0}
                  </span>
                </button>
              );
            },
          )}
        </div>

        <label className="lg:w-72">
          <span className="sr-only">Search Meta leads</span>
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
        {filtered.map((lead) => (
          <LeadCard
            key={lead.id}
            lead={lead}
            onStatusChange={updateStatus}
            onSaveNotes={saveNotes}
            onCreateInvoice={createInvoice}
            onDelete={deleteLead}
          />
        ))}

        {!filtered.length && (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-12 text-center font-body text-sm text-[#526168]">
            {search
              ? `Nothing matches "${search}".`
              : counts.all
                ? `No ${statusLabel(statusFilter).toLowerCase()} leads.`
                : "No leads imported yet. Download the leads sheet from Meta and upload it above."}
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

/* ========================================================================== */
/* Import preview                                                             */
/* ========================================================================== */

function ImportPreview({
  preview,
  isImporting,
  onConfirm,
  onCancel,
}: {
  preview: ParseResult;
  isImporting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const sample = preview.rows.slice(0, 3);

  return (
    <section className="mb-6 rounded-2xl border border-[#D4AF37] bg-[#FFFCF3] p-6">
      <h2 className="font-display text-2xl font-semibold text-[#06131D]">
        Ready to import {preview.rows.length}{" "}
        {preview.rows.length === 1 ? "lead" : "leads"}
      </h2>
      <p className="mt-1 font-body text-sm text-[#526168]">
        Leads already in the list are matched on their Meta lead id and left
        untouched, so importing the same sheet twice is safe.
      </p>

      {(preview.skipped > 0 || preview.duplicatesInFile > 0) && (
        <ul className="mt-3 space-y-1 font-body text-sm text-[#526168]">
          {preview.skipped > 0 && (
            <li>
              {preview.skipped} row{preview.skipped === 1 ? "" : "s"} skipped —
              no name and no phone number.
            </li>
          )}
          {preview.duplicatesInFile > 0 && (
            <li>
              {preview.duplicatesInFile} duplicate row
              {preview.duplicatesInFile === 1 ? "" : "s"} within the file
              itself.
            </li>
          )}
        </ul>
      )}

      {/* Excel rewrites +919867678793 as 9.19867E+11 on save. A lead with no
          number cannot be called, so this is worth stopping for. */}
      {preview.missingPhone > 0 && (
        <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3">
          <p className="flex items-center gap-2 font-body text-sm font-semibold text-amber-900">
            <FiAlertTriangle className="flex-shrink-0" />
            {preview.missingPhone} of these {preview.rows.length} have no usable
            phone number
          </p>
          <p className="mt-1 font-body text-xs text-amber-900">
            This usually means the sheet was opened and saved in Excel, which
            rewrites a number like +919867678793 as 9.19867E+11. Re-download the
            file from Meta and upload it without opening it first.
          </p>
        </div>
      )}

      {preview.extraHeaders.length > 0 && (
        <div className="mt-4 rounded-xl border border-[#06131D]/10 bg-white p-3">
          <p className="font-body text-sm font-semibold text-[#06131D]">
            Form questions captured
          </p>
          <p className="mt-1 font-body text-xs text-[#526168]">
            {preview.extraHeaders.join(" · ")}
          </p>
        </div>
      )}

      {/* What actually got read, so a mis-mapped column is caught before import */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[36rem] border-collapse text-left font-body text-sm">
          <thead>
            <tr className="border-b border-[#06131D]/10 text-xs uppercase tracking-wider text-[#526168]">
              <th className="py-2 pr-4 font-semibold">Name</th>
              <th className="py-2 pr-4 font-semibold">Phone</th>
              <th className="py-2 pr-4 font-semibold">Email</th>
              <th className="py-2 font-semibold">City</th>
            </tr>
          </thead>
          <tbody>
            {sample.map((row) => (
              <tr
                key={row.dedupe_key}
                className="border-b border-[#06131D]/5 text-[#06131D]"
              >
                <td className="py-2 pr-4">{row.name || "—"}</td>
                <td className="py-2 pr-4">{row.phone || "—"}</td>
                <td className="py-2 pr-4">{row.email || "—"}</td>
                <td className="py-2">{row.city || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {preview.rows.length > sample.length && (
          <p className="mt-2 font-body text-xs text-[#526168]">
            Showing the first {sample.length} of {preview.rows.length}.
          </p>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onConfirm}
          disabled={isImporting}
          className="inline-flex items-center gap-2 rounded-lg bg-[#06131D] px-4 py-2.5 font-body text-sm font-bold text-[#F3E5AB] transition hover:bg-[#0D2A3A] disabled:opacity-60"
        >
          {isImporting ? "Importing..." : `Import ${preview.rows.length}`}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isImporting}
          className="rounded-lg border border-[#06131D]/15 px-4 py-2.5 font-body text-sm font-semibold text-[#06131D] transition hover:border-[#997A15] disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </section>
  );
}

/* ========================================================================== */
/* One lead                                                                   */
/* ========================================================================== */

function LeadCard({
  lead,
  onStatusChange,
  onSaveNotes,
  onCreateInvoice,
  onDelete,
}: {
  lead: MetaLeadRecord;
  onStatusChange: (id: string, status: MetaLeadStatus) => void;
  onSaveNotes: (id: string, notes: string) => Promise<{ ok: boolean }>;
  onCreateInvoice: (lead: MetaLeadRecord) => void;
  onDelete: (lead: MetaLeadRecord) => void;
}) {
  const [notes, setNotes] = useState(lead.admin_notes ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  useEffect(() => setNotes(lead.admin_notes ?? ""), [lead.admin_notes]);

  const isDirty = notes !== (lead.admin_notes ?? "");
  const whatsapp = whatsappUrl(lead.phone, lead.name);
  const origin = [lead.campaign_name, lead.ad_name, lead.form_name]
    .filter(Boolean)
    .join(" · ");

  return (
    <article className="rounded-2xl border border-[#06131D]/10 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-display text-2xl font-semibold text-[#06131D]">
              {lead.name || "Unnamed lead"}
            </h2>
            <span
              className={`rounded-full border px-2.5 py-0.5 font-body text-[11px] font-semibold ${
                STATUS_STYLES[lead.status] ??
                "border-stone-300 bg-stone-100 text-stone-600"
              }`}
            >
              {statusLabel(lead.status)}
            </span>
          </div>
          <p className="mt-1 font-body text-xs text-[#526168]">
            {formatDate(lead.created_at)}
            {origin && ` · ${origin}`}
          </p>
        </div>

        <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
          {whatsapp && (
            <a
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-2.5 font-body text-sm font-bold text-white transition hover:bg-emerald-700"
            >
              <FaWhatsapp className="h-4 w-4" /> WhatsApp
            </a>
          )}
          <button
            type="button"
            onClick={() => onCreateInvoice(lead)}
            className="inline-flex items-center gap-2 rounded-lg border border-stone-200 px-3.5 py-2.5 font-body text-sm font-bold text-[#526168] transition hover:border-[#D4AF37] hover:text-[#997A15]"
          >
            <FiFileText className="h-4 w-4" /> Invoice
          </button>
          <label className="sr-only" htmlFor={`status-${lead.id}`}>
            Status for {lead.name || "this lead"}
          </label>
          <select
            id={`status-${lead.id}`}
            value={lead.status}
            onChange={(event) =>
              onStatusChange(lead.id, event.target.value as MetaLeadStatus)
            }
            className="rounded-lg border border-stone-200 bg-white px-3 py-2.5 font-body text-sm text-[#06131D] outline-none transition focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
          >
            {META_LEAD_STATUSES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* Two clicks — the sheet this row came from is not re-importable
              once it has been removed, by design. */}
          {isConfirmingDelete ? (
            <span className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setIsConfirmingDelete(false);
                  onDelete(lead);
                }}
                className="rounded-lg bg-red-600 px-3.5 py-2.5 font-body text-sm font-bold text-white transition hover:bg-red-700"
              >
                Remove
              </button>
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(false)}
                className="rounded-lg px-2 py-2.5 font-body text-sm text-[#526168] hover:underline"
              >
                Cancel
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setIsConfirmingDelete(true)}
              aria-label={`Remove ${lead.name || "this lead"}`}
              title="Remove lead"
              className="rounded-lg p-2.5 text-[#526168] transition hover:bg-red-50 hover:text-red-600"
            >
              <FiTrash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-3 border-t border-stone-100 pt-4 sm:grid-cols-2 lg:grid-cols-3">
        <Detail label="Phone" icon={<FiPhone />}>
          {lead.phone ? (
            <a href={`tel:${lead.phone}`} className="hover:text-[#997A15]">
              {lead.phone}
            </a>
          ) : (
            "—"
          )}
        </Detail>
        <Detail label="Email" icon={<FiMail />}>
          {lead.email ? (
            <a href={`mailto:${lead.email}`} className="hover:text-[#997A15]">
              {lead.email}
            </a>
          ) : (
            "—"
          )}
        </Detail>
        <Detail label="City">{lead.city || "—"}</Detail>
      </div>

      {/* The lead form's own questions — usually where travel date and package
          interest live, so they belong on the card, not buried in the row. */}
      {lead.extra && Object.keys(lead.extra).length > 0 && (
        <div className="mt-3 grid gap-3 rounded-xl bg-[#FAF8F5] p-3 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(lead.extra).map(([question, answer]) => (
            <Detail key={question} label={question}>
              {answer}
            </Detail>
          ))}
        </div>
      )}

      <div className="mt-4">
        <label
          htmlFor={`notes-${lead.id}`}
          className="font-body text-xs font-semibold uppercase tracking-wider text-[#526168]"
        >
          Follow-up notes (internal)
        </label>
        <textarea
          id={`notes-${lead.id}`}
          rows={2}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Called twice, no answer. Trying again Tuesday."
          className="mt-1.5 w-full rounded-lg border border-stone-200 bg-[#FAF8F5] p-3 font-body text-sm outline-none transition focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
        />
        {isDirty && (
          <button
            type="button"
            disabled={isSaving}
            onClick={async () => {
              setIsSaving(true);
              await onSaveNotes(lead.id, notes);
              setIsSaving(false);
            }}
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[#06131D] px-3.5 py-2 font-body text-sm font-bold text-[#F3E5AB] transition hover:bg-[#0D2A3A] disabled:opacity-60"
          >
            <FiSave /> {isSaving ? "Saving..." : "Save note"}
          </button>
        )}
      </div>
    </article>
  );
}

function Detail({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p className="font-body text-[11px] font-semibold uppercase tracking-wider text-[#526168]">
        {label}
      </p>
      <p className="mt-0.5 flex items-center gap-1.5 truncate font-body text-sm text-[#06131D]">
        {icon && <span className="flex-shrink-0 text-stone-400">{icon}</span>}
        {children}
      </p>
    </div>
  );
}
