"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiDownload,
  FiEdit2,
  FiPaperclip,
  FiPlus,
  FiTrash2,
} from "react-icons/fi";
import { createClient } from "@/lib/supabase/client";
import { paymentMethodLabel } from "@/lib/finance";
import {
  EXPENSE_CSV_COLUMNS,
  EXPENSE_FETCH_CAP,
  EXPENSE_PAGE_SIZE,
  EXPENSE_PERIODS,
  PERIOD_CAP_NOTICE,
  periodLabel,
  periodRange,
  type ExpenseCategory,
  type ExpenseDraft,
  type ExpensePeriod,
  type ExpenseRecord,
  type Trip,
} from "@/lib/expenses";
import { formatRupees, formatRupeesCompact } from "@/lib/money";
import { useToast } from "../../components/ui/toast/useToast";
import AdminLoginForm from "../AdminLoginForm";
import AdminShell from "../AdminShell";
import ExpenseFormDialog from "./ExpenseFormDialog";

/**
 * The expense ledger.
 *
 * Rows are fetched for the selected period and totalled in the browser rather
 * than paged in the database, which is the opposite of what AdminEnquiriesPage
 * does. The reason is the totals bar: it has to cover the whole filtered set,
 * not the page on screen, and PostgREST has no dependable aggregate here. A
 * period is naturally bounded, so this stays small — and when it does not,
 * EXPENSE_FETCH_CAP is reported rather than silently truncating a total.
 */

function formatDate(value: string) {
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.valueOf())
    ? value
    : parsed.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
}

export default function AdminExpensesPage() {
  const [supabase] = useState(createClient);
  const toast = useToast();

  const [email, setEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [wasCapped, setWasCapped] = useState(false);

  const [period, setPeriod] = useState<ExpensePeriod>("this_month");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [tripFilter, setTripFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseRecord | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);

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
      .from("expenses")
      .select("*")
      .is("deleted_at", null)
      .order("spent_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(EXPENSE_FETCH_CAP);

    const range = periodRange(period);
    if (range) {
      query = query.gte("spent_on", range.from).lte("spent_on", range.to);
    }
    if (categoryFilter !== "all") query = query.eq("category_id", categoryFilter);
    if (tripFilter !== "all") query = query.eq("trip_id", tripFilter);

    const [
      { data: rows, error: loadError },
      { data: categoryRows },
      { data: tripRows },
    ] = await Promise.all([
      query,
      supabase
        .from("expense_categories")
        .select("id, name, kind, sort_order, is_active")
        .order("sort_order")
        .order("name"),
      supabase
        .from("trips")
        .select("id, name, category, departure_date, status")
        .order("departure_date", { ascending: false, nullsFirst: false }),
    ]);

    if (loadError) {
      setError(
        loadError.message.includes("does not exist")
          ? "Run 017_finance.sql in Supabase to create the finance tables."
          : loadError.message,
      );
    } else {
      setError("");
      const list = (rows as ExpenseRecord[]) ?? [];
      setExpenses(list);
      setWasCapped(list.length >= EXPENSE_FETCH_CAP);
    }

    setCategories((categoryRows as ExpenseCategory[]) ?? []);
    setTrips((tripRows as Trip[]) ?? []);
    setIsLoading(false);
  }, [supabase, period, categoryFilter, tripFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(0);
  }, [period, categoryFilter, tripFilter, search]);

  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );
  const tripById = useMemo(
    () => new Map(trips.map((trip) => [trip.id, trip])),
    [trips],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return expenses;
    return expenses.filter((expense) =>
      `${expense.vendor} ${expense.description} ${expense.reference} ${expense.notes} ${categoryById.get(expense.category_id)?.name ?? ""}`
        .toLowerCase()
        .includes(term),
    );
  }, [expenses, search, categoryById]);

  /**
   * Totals over the whole filtered set. The trip/operating split is what keeps
   * a departure's margin from quietly absorbing the office rent.
   */
  const totals = useMemo(() => {
    let all = 0;
    let trip = 0;
    let operating = 0;
    const byCategory = new Map<string, number>();

    for (const expense of filtered) {
      all += expense.amount_paise;
      const category = categoryById.get(expense.category_id);
      if (category?.kind === "operating") operating += expense.amount_paise;
      else trip += expense.amount_paise;
      const name = category?.name ?? "Uncategorised";
      byCategory.set(name, (byCategory.get(name) ?? 0) + expense.amount_paise);
    }

    return {
      all,
      trip,
      operating,
      count: filtered.length,
      top: [...byCategory.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5),
    };
  }, [filtered, categoryById]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / EXPENSE_PAGE_SIZE));
  const visible = filtered.slice(
    page * EXPENSE_PAGE_SIZE,
    page * EXPENSE_PAGE_SIZE + EXPENSE_PAGE_SIZE,
  );

  /* ------------------------------------------------------------------ writes */

  async function saveExpense(draft: ExpenseDraft): Promise<boolean> {
    if (!supabase) return false;
    const { id, ...fields } = draft;

    if (id) {
      const { error: updateError } = await supabase
        .from("expenses")
        .update(fields)
        .eq("id", id);
      if (updateError) {
        toast.error("Could not save that expense.", {
          description: updateError.message,
        });
        return false;
      }
      toast.success("Expense updated.");
    } else {
      const { data: userData } = await supabase.auth.getUser();
      const { error: insertError } = await supabase
        .from("expenses")
        .insert({ ...fields, created_by: userData.user?.id ?? null });
      if (insertError) {
        toast.error("Could not record that expense.", {
          description: insertError.message,
        });
        return false;
      }
      toast.success(`Recorded ${formatRupees(fields.amount_paise)}.`);
    }

    void load();
    return true;
  }

  /**
   * Soft delete. A financial row does not vanish — last month's total has to
   * stay explainable — so this stamps deleted_at and the list filters it out.
   * The receipt file is left in the bucket for the same reason.
   */
  async function deleteExpense(expense: ExpenseRecord) {
    if (!supabase) return;
    const { error: deleteError } = await supabase
      .from("expenses")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", expense.id);

    setConfirmingDelete(null);
    if (deleteError) {
      toast.error("Could not remove that expense.", {
        description: deleteError.message,
      });
      return;
    }
    toast.success("Expense removed.");
    void load();
  }

  /** Signed URL, because the receipts bucket is private. */
  async function openReceipt(path: string) {
    if (!supabase) return;
    const { data, error: signError } = await supabase.storage
      .from("expense-receipts")
      .createSignedUrl(path, 60 * 10);
    if (signError || !data?.signedUrl) {
      toast.error("Could not open that receipt.", {
        description: signError?.message,
      });
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  function exportCsv() {
    // Amounts go out in rupees: this file is opened in Excel, where a paise
    // integer would be read as rupees by whoever receives it.
    const escape = (value: unknown) =>
      `"${String(value ?? "").replaceAll('"', '""')}"`;

    const rows = filtered.map((expense) => {
      const category = categoryById.get(expense.category_id);
      return [
        expense.spent_on,
        category?.name ?? "",
        category?.kind ?? "",
        expense.trip_id ? (tripById.get(expense.trip_id)?.name ?? "") : "",
        expense.vendor,
        expense.description,
        (expense.amount_paise / 100).toFixed(2),
        expense.original_currency,
        expense.original_amount_minor
          ? (expense.original_amount_minor / 100).toFixed(2)
          : "",
        expense.fx_rate ?? "",
        paymentMethodLabel(expense.payment_method),
        expense.reference,
        expense.receipt_path ? "yes" : "no",
        expense.notes,
      ];
    });

    const csv = [
      EXPENSE_CSV_COLUMNS.join(","),
      ...rows.map((row) => row.map(escape).join(",")),
    ].join("\n");

    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `expenses-${period}-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(
      rows.length === 1 ? "1 expense exported." : `${rows.length} expenses exported.`,
    );
  }

  /* ------------------------------------------------------------------ render */

  if (isLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#F3EFEA] font-body text-sm text-[#526168]">
        Loading expenses...
      </main>
    );
  }

  if (!email) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#06131D] px-6">
        <section className="w-full max-w-md rounded-2xl bg-[#0B1E28] p-8">
          <h1 className="font-display text-4xl text-white">Admin Login</h1>
          <p className="mt-2 font-body text-sm text-[#B8C2C5]">
            Sign in to review expenses.
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
      title="Expenses"
      description="What the business spent, and on what."
      email={email}
      headerAction={
        <div className="flex gap-2">
          <button
            type="button"
            onClick={exportCsv}
            disabled={!filtered.length}
            className="inline-flex items-center gap-2 rounded-lg border border-[#06131D]/15 px-4 py-2.5 font-body text-sm font-semibold text-[#06131D] transition hover:border-[#997A15] hover:text-[#997A15] disabled:opacity-50"
          >
            <FiDownload /> Export
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setIsDialogOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-[#D4AF37] px-4 py-2.5 font-body text-sm font-bold text-[#06131D] transition hover:bg-[#F3E5AB]"
          >
            <FiPlus /> Record expense
          </button>
        </div>
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

      {wasCapped && (
        <p
          role="status"
          className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-3 font-body text-sm text-amber-800"
        >
          {PERIOD_CAP_NOTICE}
        </p>
      )}

      {/* Totals — the whole point of the screen, so they sit above the list */}
      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#D4AF37]/40 bg-[#FFFCF3] p-5">
          <p className="font-body text-xs font-semibold uppercase tracking-[0.15em] text-[#997A15]">
            Spent · {periodLabel(period)}
          </p>
          <p className="mt-1.5 font-display text-4xl font-semibold text-[#06131D]">
            {formatRupees(totals.all, { trimZeroPaise: true })}
          </p>
          <p className="mt-1 font-body text-xs text-[#526168]">
            {totals.count} {totals.count === 1 ? "entry" : "entries"}
          </p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-5">
          <p className="font-body text-xs font-semibold uppercase tracking-[0.15em] text-[#526168]">
            Trip costs
          </p>
          <p className="mt-1.5 font-display text-3xl font-semibold text-[#06131D]">
            {formatRupees(totals.trip, { trimZeroPaise: true })}
          </p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-5">
          <p className="font-body text-xs font-semibold uppercase tracking-[0.15em] text-[#526168]">
            Operating costs
          </p>
          <p className="mt-1.5 font-display text-3xl font-semibold text-[#06131D]">
            {formatRupees(totals.operating, { trimZeroPaise: true })}
          </p>
        </div>
      </section>

      {totals.top.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {totals.top.map(([name, amount]) => (
            <span
              key={name}
              className="rounded-full border border-stone-200 bg-white px-3 py-1.5 font-body text-xs text-[#526168]"
            >
              {name}{" "}
              <span className="font-semibold text-[#06131D]">
                {formatRupeesCompact(amount)}
              </span>
            </span>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="mt-6 flex flex-wrap items-end gap-3">
        <label className="min-w-[10rem]">
          <span className="mb-1.5 block font-body text-xs font-semibold uppercase tracking-[0.12em] text-[#526168]">
            Period
          </span>
          <select
            value={period}
            onChange={(event) =>
              setPeriod(event.target.value as ExpensePeriod)
            }
            className="w-full rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 font-body text-sm outline-none transition focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
          >
            {EXPENSE_PERIODS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="min-w-[12rem]">
          <span className="mb-1.5 block font-body text-xs font-semibold uppercase tracking-[0.12em] text-[#526168]">
            Category
          </span>
          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            className="w-full rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 font-body text-sm outline-none transition focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
          >
            <option value="all">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        {trips.length > 0 && (
          <label className="min-w-[12rem]">
            <span className="mb-1.5 block font-body text-xs font-semibold uppercase tracking-[0.12em] text-[#526168]">
              Departure
            </span>
            <select
              value={tripFilter}
              onChange={(event) => setTripFilter(event.target.value)}
              className="w-full rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 font-body text-sm outline-none transition focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
            >
              <option value="all">All departures</option>
              {trips.map((trip) => (
                <option key={trip.id} value={trip.id}>
                  {trip.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="min-w-[14rem] flex-1">
          <span className="sr-only">Search expenses</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search vendor, description or reference"
            className="w-full rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 font-body text-sm outline-none transition focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
          />
        </label>
      </div>

      {/* List */}
      <section className="mt-5 overflow-hidden rounded-2xl border border-stone-200 bg-white">
        {visible.map((expense, index) => {
          const category = categoryById.get(expense.category_id);
          const isConfirming = confirmingDelete === expense.id;
          return (
            <article
              key={expense.id}
              className={`flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 ${
                index ? "border-t border-stone-100" : ""
              }`}
            >
              <div className="w-24 flex-shrink-0 font-body text-xs text-[#526168]">
                {formatDate(expense.spent_on)}
              </div>

              <div className="min-w-[12rem] flex-1">
                <p className="font-body text-sm font-semibold text-[#06131D]">
                  {expense.vendor || category?.name || "Expense"}
                </p>
                <p className="mt-0.5 font-body text-xs text-[#526168]">
                  {[
                    category?.name,
                    expense.description,
                    expense.reference && `#${expense.reference}`,
                    paymentMethodLabel(expense.payment_method),
                    expense.trip_id && tripById.get(expense.trip_id)?.name,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>

              <div className="text-right">
                <p className="font-body text-sm font-bold text-[#06131D]">
                  {formatRupees(expense.amount_paise, { trimZeroPaise: true })}
                </p>
                {expense.original_currency !== "INR" &&
                  expense.original_amount_minor && (
                    <p className="font-body text-[11px] text-[#526168]">
                      {expense.original_currency}{" "}
                      {(expense.original_amount_minor / 100).toFixed(2)}
                    </p>
                  )}
              </div>

              <div className="flex flex-shrink-0 items-center gap-1">
                {expense.receipt_path && (
                  <button
                    type="button"
                    onClick={() => void openReceipt(expense.receipt_path)}
                    aria-label="View receipt"
                    title="View receipt"
                    className="rounded-lg p-2 text-[#526168] transition hover:bg-stone-100 hover:text-[#06131D]"
                  >
                    <FiPaperclip />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setEditing(expense);
                    setIsDialogOpen(true);
                  }}
                  aria-label="Edit expense"
                  className="rounded-lg p-2 text-[#526168] transition hover:bg-stone-100 hover:text-[#06131D]"
                >
                  <FiEdit2 />
                </button>
                {isConfirming ? (
                  <span className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => void deleteExpense(expense)}
                      className="rounded-lg bg-red-600 px-3 py-1.5 font-body text-xs font-semibold text-white transition hover:bg-red-700"
                    >
                      Remove
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingDelete(null)}
                      className="rounded-lg px-2 py-1.5 font-body text-xs text-[#526168] hover:underline"
                    >
                      Cancel
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(expense.id)}
                    aria-label="Remove expense"
                    className="rounded-lg p-2 text-[#526168] transition hover:bg-red-50 hover:text-red-600"
                  >
                    <FiTrash2 />
                  </button>
                )}
              </div>
            </article>
          );
        })}

        {!filtered.length && (
          <div className="p-12 text-center font-body text-sm text-[#526168]">
            {search
              ? `Nothing matches "${search}".`
              : `No expenses recorded for ${periodLabel(period)}.`}
          </div>
        )}
      </section>

      {pageCount > 1 && (
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
            Page {page + 1} of {pageCount} · {filtered.length} total
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

      <ExpenseFormDialog
        open={isDialogOpen}
        expense={editing}
        categories={categories}
        trips={trips}
        onClose={() => setIsDialogOpen(false)}
        onSaved={saveExpense}
      />
    </AdminShell>
  );
}
