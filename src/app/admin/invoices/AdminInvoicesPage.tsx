"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FiEdit2, FiEye, FiFileText, FiPlus, FiTrash2 } from "react-icons/fi";
import { createClient } from "@/lib/supabase/client";
import {
  INVOICE_STATUS_STYLES,
  invoiceStatusLabel,
  paymentStatusLabel,
} from "@/lib/finance";
import {
  INVOICE_PAGE_SIZE,
  type BusinessProfileRecord,
  type InvoiceBalance,
  type InvoiceRecord,
} from "@/lib/invoices";
import { formatRupees } from "@/lib/money";
import { useToast } from "../../components/ui/toast/useToast";
import AdminLoginForm from "../AdminLoginForm";
import AdminShell from "../AdminShell";

/**
 * The invoice list.
 *
 * Payment status comes from public.invoice_balances rather than a column,
 * because a stored paid/unpaid flag is one more thing to keep in sync and to be
 * wrong about. PostgREST cannot join a view to a table without a declared
 * relationship, so the balances for the visible page are fetched by id and
 * merged here.
 */

/**
 * Two kinds of filter share one row. The first four are invoice status, a
 * column on `invoices`. "Unpaid" and "Overdue" are payment status, which is
 * derived in `invoice_balances` and cannot be queried from the table at all —
 * so those two resolve to a set of ids first. See `load`.
 */
const FILTERS = [
  { value: "all", label: "All", kind: "status" },
  { value: "draft", label: "Drafts", kind: "status" },
  { value: "issued", label: "Issued", kind: "status" },
  { value: "unpaid", label: "Unpaid", kind: "balance" },
  { value: "overdue", label: "Overdue", kind: "balance" },
  { value: "cancelled", label: "Cancelled", kind: "status" },
] as const;

type Filter = (typeof FILTERS)[number]["value"];

function formatDate(value: string | null) {
  if (!value) return "—";
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.valueOf())
    ? value
    : parsed.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
}

export default function AdminInvoicesPage() {
  const [supabase] = useState(createClient);
  const toast = useToast();
  const router = useRouter();

  const [email, setEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");

  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [balances, setBalances] = useState<Record<string, InvoiceBalance>>({});
  /** Every issued invoice with money still owed — drives the banner and counts. */
  const [owedRows, setOwedRows] = useState<InvoiceBalance[]>([]);
  const [business, setBusiness] = useState<BusinessProfileRecord | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [totalMatching, setTotalMatching] = useState(0);

  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [pendingDelete, setPendingDelete] = useState<InvoiceRecord | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);

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

    // Every unpaid or overdue balance, for the banner and the two derived
    // filters. Bounded by what is actually owed rather than by the whole
    // invoice history, so it stays small even after years of trading.
    const { data: owedResult } = await supabase
      .from("invoice_balances")
      .select("*")
      .eq("invoice_status", "issued")
      .in("payment_status", ["unpaid", "partial"]);
    const owed = (owedResult as InvoiceBalance[]) ?? [];

    let query = supabase
      .from("invoices")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(page * INVOICE_PAGE_SIZE, page * INVOICE_PAGE_SIZE + INVOICE_PAGE_SIZE - 1);

    if (filter === "unpaid" || filter === "overdue") {
      const ids = owed
        .filter((row) => filter === "unpaid" || row.is_overdue)
        .map((row) => row.id);
      // .in() with an empty list matches nothing, which is the right answer,
      // but PostgREST rejects the empty parenthesis — so short-circuit.
      if (!ids.length) {
        setError("");
        setInvoices([]);
        setTotalMatching(0);
        setBalances({});
        setOwedRows([]);
        setIsLoading(false);
        return;
      }
      query = query.in("id", ids);
    } else if (filter !== "all") {
      query = query.eq("status", filter);
    }

    const countFor = (status?: string) => {
      let q = supabase.from("invoices").select("id", { count: "exact", head: true });
      if (status) q = q.eq("status", status);
      return q;
    };

    const [
      { data: rows, count, error: loadError },
      { data: businessRow },
      draftCount,
      issuedCount,
      cancelledCount,
      allCount,
    ] = await Promise.all([
      query,
      supabase.from("business_profile").select("*").eq("id", 1).maybeSingle(),
      countFor("draft"),
      countFor("issued"),
      countFor("cancelled"),
      countFor(),
    ]);

    if (loadError) {
      setError(
        loadError.message.includes("does not exist")
          ? "Run 017_finance.sql in Supabase to create the finance tables."
          : loadError.message,
      );
      setIsLoading(false);
      return;
    }

    const list = (rows as InvoiceRecord[]) ?? [];
    setError("");
    setInvoices(list);
    setTotalMatching(count ?? 0);
    setBusiness((businessRow as BusinessProfileRecord) ?? null);
    setOwedRows(owed);
    setCounts({
      draft: draftCount.count ?? 0,
      issued: issuedCount.count ?? 0,
      cancelled: cancelledCount.count ?? 0,
      all: allCount.count ?? 0,
      unpaid: owed.length,
      overdue: owed.filter((row) => row.is_overdue).length,
    });

    if (list.length) {
      const { data: balanceRows } = await supabase
        .from("invoice_balances")
        .select("*")
        .in(
          "id",
          list.map((invoice) => invoice.id),
        );
      const byId: Record<string, InvoiceBalance> = {};
      for (const row of (balanceRows as InvoiceBalance[]) ?? []) {
        byId[row.id] = row;
      }
      setBalances(byId);
    } else {
      setBalances({});
    }

    setIsLoading(false);
  }, [supabase, filter, page]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(0);
  }, [filter]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return invoices;
    return invoices.filter((invoice) =>
      `${invoice.number ?? ""} ${invoice.customer_name} ${invoice.customer_phone} ${invoice.customer_email}`
        .toLowerCase()
        .includes(term),
    );
  }, [invoices, search]);

  /**
   * Money issued and not yet received, across the whole book — not just the
   * page on screen. An "outstanding" figure that changed when you turned the
   * page would be worse than not showing one.
   */
  const receivables = useMemo(() => {
    let total = 0;
    let overdueTotal = 0;
    for (const row of owedRows) {
      total += row.balance_paise;
      if (row.is_overdue) overdueTotal += row.balance_paise;
    }
    return { total, overdueTotal, count: owedRows.length };
  }, [owedRows]);

  async function createDraft() {
    if (!supabase) return;
    setIsCreating(true);
    const { data, error: createError } = await supabase
      .from("invoices")
      .insert({
        // Defaults copied from the profile, not read live at render time.
        tax_mode: business?.default_tax_mode ?? "none",
        tax_rate_bp:
          business?.default_tax_mode === "none"
            ? 0
            : (business?.default_tax_rate_bp ?? 0),
      })
      .select("id")
      .single();
    setIsCreating(false);

    if (createError || !data) {
      toast.error("Could not create a draft.", {
        description: createError?.message,
      });
      return;
    }
    router.push(`/admin/invoices/${data.id}`);
  }

  /**
   * Drafts only. An issued invoice has a number in a series that must stay
   * unbroken, so it is cancelled from its own page instead — migration 018
   * refuses the delete in the database regardless. Filtering on status as well
   * as id, and asking for the deleted row back, turns "a stale list tried to
   * delete something since issued" into an error instead of a silent no-op.
   */
  async function deleteDraft(invoice: InvoiceRecord) {
    if (!supabase) return;
    setIsDeleting(true);
    const { data, error: deleteError } = await supabase
      .from("invoices")
      .delete()
      .eq("id", invoice.id)
      .eq("status", "draft")
      .select("id");
    setIsDeleting(false);
    setPendingDelete(null);
    if (deleteError || !data?.length) {
      toast.error("Could not delete this draft.", {
        description:
          deleteError?.message ??
          "It may have been issued in the meantime. Refresh the list.",
      });
      void load();
      return;
    }
    toast.success("Draft deleted.");
    void load();
  }

  if (isLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#F3EFEA] font-body text-sm text-[#526168]">
        Loading invoices...
      </main>
    );
  }

  if (!email) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#06131D] px-6">
        <section className="w-full max-w-md rounded-2xl bg-[#0B1E28] p-8">
          <h1 className="font-display text-4xl text-white">Admin Login</h1>
          <p className="mt-2 font-body text-sm text-[#B8C2C5]">
            Sign in to raise invoices.
          </p>
          <div className="mt-8">
            <AdminLoginForm />
          </div>
        </section>
      </main>
    );
  }

  const needsProfile = !business?.legal_name || !business?.address_line1;

  return (
    <AdminShell
      title="Invoices"
      description="Raise, issue and send bills."
      email={email}
      headerAction={
        <button
          type="button"
          onClick={() => void createDraft()}
          disabled={isCreating}
          className="inline-flex items-center gap-2 rounded-lg bg-[#D4AF37] px-4 py-2.5 font-body text-sm font-bold text-[#06131D] transition hover:bg-[#F3E5AB] disabled:opacity-50"
        >
          <FiPlus /> {isCreating ? "Creating..." : "New invoice"}
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

      {needsProfile && (
        <p className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-3 font-body text-sm text-amber-800">
          Your company name and address are not filled in yet, so invoices will
          print without them.{" "}
          <Link
            href="/admin/settings/business"
            className="font-semibold underline"
          >
            Add business details
          </Link>
          .
        </p>
      )}

      {receivables.count > 0 && (
        <section className="mb-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-[#D4AF37]/40 bg-[#FFFCF3] p-5">
            <p className="font-body text-xs font-semibold uppercase tracking-[0.15em] text-[#997A15]">
              Outstanding
            </p>
            <p className="mt-1.5 font-display text-4xl font-semibold text-[#06131D]">
              {formatRupees(receivables.total, { trimZeroPaise: true })}
            </p>
            <p className="mt-1 font-body text-xs text-[#526168]">
              across {receivables.count}{" "}
              {receivables.count === 1 ? "invoice" : "invoices"}
            </p>
          </div>
          {receivables.overdueTotal > 0 && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
              <p className="font-body text-xs font-semibold uppercase tracking-[0.15em] text-red-700">
                Overdue
              </p>
              <p className="mt-1.5 font-display text-4xl font-semibold text-[#06131D]">
                {formatRupees(receivables.overdueTotal, { trimZeroPaise: true })}
              </p>
              <p className="mt-1 font-body text-xs text-red-700">
                past the due date
              </p>
            </div>
          )}
        </section>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((option) => {
            const isCurrent = filter === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setFilter(option.value)}
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
                  {counts[option.value] ?? 0}
                </span>
              </button>
            );
          })}
        </div>

        <label className="sm:w-72">
          <span className="sr-only">Search invoices</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search this page"
            className="w-full rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 font-body text-sm outline-none transition focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
          />
        </label>
      </div>

      <section className="mt-5 overflow-hidden rounded-2xl border border-stone-200 bg-white">
        {visible.map((invoice, index) => {
          const balance = balances[invoice.id];
          const badge =
            invoice.status === "issued" && balance
              ? balance.payment_status
              : invoice.status;
          return (
            <div
              key={invoice.id}
              className={`flex flex-wrap items-center gap-x-4 gap-y-2 border-l-4 px-4 py-4 transition hover:bg-[#FFFCF3] sm:px-5 ${
                balance?.is_overdue ? "border-l-red-400" : "border-l-transparent"
              } ${index ? "border-t border-stone-100" : ""}`}
            >
              <div className="w-32 flex-shrink-0">
                <Link
                  href={`/admin/invoices/${invoice.id}`}
                  className="font-body text-sm font-semibold text-[#06131D] hover:text-[#997A15]"
                >
                  {invoice.number ?? "Draft"}
                </Link>
                <p className="font-body text-xs text-[#526168]">
                  {formatDate(invoice.issue_date)}
                </p>
                {invoice.due_date && balance && balance.balance_paise > 0 && (
                  <p
                    className={`font-body text-[11px] ${
                      balance.is_overdue ? "text-red-600" : "text-[#526168]"
                    }`}
                  >
                    due {formatDate(invoice.due_date)}
                  </p>
                )}
              </div>

              <div className="min-w-[10rem] flex-1">
                <p className="font-body text-sm text-[#06131D]">
                  {invoice.customer_name || "No customer yet"}
                </p>
                {invoice.customer_phone && (
                  <p className="font-body text-xs text-[#526168]">
                    {invoice.customer_phone}
                  </p>
                )}
              </div>

              <span
                className={`rounded-full border px-3 py-1 font-body text-xs font-semibold ${
                  balance?.is_overdue
                    ? "border-red-200 bg-red-50 text-red-700"
                    : (INVOICE_STATUS_STYLES[badge] ?? "")
                }`}
              >
                {balance?.is_overdue
                  ? "Overdue"
                  : invoice.status === "issued" && balance
                    ? paymentStatusLabel(balance.payment_status)
                    : invoiceStatusLabel(invoice.status)}
              </span>

              <div className="w-28 text-right">
                <p className="font-body text-sm font-bold text-[#06131D]">
                  {formatRupees(invoice.total_paise, { trimZeroPaise: true })}
                </p>
                {balance && balance.paid_paise > 0 && balance.balance_paise > 0 && (
                  <p className="font-body text-[11px] text-[#526168]">
                    {formatRupees(balance.balance_paise, {
                      trimZeroPaise: true,
                    })}{" "}
                    due
                  </p>
                )}
              </div>

              <div className="ml-auto flex items-center gap-1.5">
                {invoice.status === "draft" ? (
                  <>
                    <Link
                      href={`/admin/invoices/${invoice.id}`}
                      aria-label="Edit draft invoice"
                      title="Edit"
                      className="grid h-9 w-9 place-items-center rounded-lg border border-[#06131D]/15 text-[#06131D] transition hover:border-[#D4AF37] hover:bg-white hover:text-[#997A15]"
                    >
                      <FiEdit2 />
                    </Link>
                    <button
                      type="button"
                      onClick={() => setPendingDelete(invoice)}
                      aria-label="Delete draft invoice"
                      title="Delete draft"
                      className="grid h-9 w-9 place-items-center rounded-lg border border-red-200 text-red-600 transition hover:bg-red-50"
                    >
                      <FiTrash2 />
                    </button>
                  </>
                ) : (
                  // Issued and cancelled invoices are read-only: no edit, no
                  // delete. The spacer keeps the amount column aligned.
                  <>
                    <Link
                      href={`/admin/invoices/${invoice.id}`}
                      aria-label={`View invoice ${invoice.number ?? ""}`}
                      title="View"
                      className="grid h-9 w-9 place-items-center rounded-lg border border-[#06131D]/15 text-[#06131D] transition hover:border-[#D4AF37] hover:bg-white hover:text-[#997A15]"
                    >
                      <FiEye />
                    </Link>
                    <span aria-hidden="true" className="hidden h-9 w-9 sm:block" />
                  </>
                )}
              </div>
            </div>
          );
        })}

        {!visible.length && (
          <div className="p-12 text-center">
            <FiFileText className="mx-auto h-8 w-8 text-stone-300" />
            <p className="mt-3 font-body text-sm text-[#526168]">
              {search
                ? `Nothing matches "${search}".`
                : filter === "all"
                  ? "No invoices yet."
                  : `No ${filter} invoices.`}
            </p>
          </div>
        )}
      </section>

      {pendingDelete && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-draft-title"
          className="fixed inset-0 z-50 grid place-items-center bg-[#06131D]/60 px-5"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3
              id="delete-draft-title"
              className="font-display text-2xl font-semibold text-[#06131D]"
            >
              Delete this draft?
            </h3>
            <p className="mt-3 font-body text-sm text-[#526168]">
              The draft invoice
              {pendingDelete.customer_name ? (
                <>
                  {" "}for{" "}
                  <strong className="text-[#06131D]">
                    {pendingDelete.customer_name}
                  </strong>
                </>
              ) : null}{" "}
              and its lines will be removed for good. It was never issued, so
              no invoice number is lost. This cannot be undone.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                disabled={isDeleting}
                className="rounded-lg border border-stone-200 px-4 py-2.5 font-body text-sm font-semibold text-[#06131D]"
              >
                Keep it
              </button>
              <button
                type="button"
                onClick={() => void deleteDraft(pendingDelete)}
                disabled={isDeleting}
                className="rounded-lg bg-red-600 px-4 py-2.5 font-body text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {isDeleting ? "Deleting..." : "Delete draft"}
              </button>
            </div>
          </div>
        </div>
      )}

      {totalMatching > INVOICE_PAGE_SIZE && (
        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={page === 0}
            onClick={() => setPage((current) => Math.max(0, current - 1))}
            className="rounded-lg border border-stone-200 bg-white px-4 py-2.5 font-body text-sm font-semibold text-[#06131D] transition hover:border-[#D4AF37] disabled:opacity-40"
          >
            Previous
          </button>
          <p className="font-body text-sm text-[#526168]">
            Page {page + 1} of{" "}
            {Math.max(1, Math.ceil(totalMatching / INVOICE_PAGE_SIZE))} ·{" "}
            {totalMatching} total
          </p>
          <button
            type="button"
            disabled={(page + 1) * INVOICE_PAGE_SIZE >= totalMatching}
            onClick={() => setPage((current) => current + 1)}
            className="rounded-lg border border-stone-200 bg-white px-4 py-2.5 font-body text-sm font-semibold text-[#06131D] transition hover:border-[#D4AF37] disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </AdminShell>
  );
}
