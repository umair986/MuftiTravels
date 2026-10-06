"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FiEdit2, FiEye, FiPlus, FiSend, FiTrash2 } from "react-icons/fi";
import { createClient } from "@/lib/supabase/client";
import type { BusinessProfileRecord } from "@/lib/invoices";
import {
  QUOTATION_PAGE_SIZE,
  QUOTATION_STATUS_STYLES,
  quotationDisplayStatus,
  quotationStatusLabel,
  type QuotationOverview,
} from "@/lib/quotations";
import { formatRupees } from "@/lib/money";
import { useToast } from "../../components/ui/toast/useToast";
import AdminLoginForm from "../AdminLoginForm";
import AdminShell from "../AdminShell";

/**
 * The quotation list.
 *
 * Reads public.quotation_overview rather than the table, because "has this
 * offer expired?" is a comparison against today and migration 018 already
 * settled where that belongs: in SQL, because the browser's today is whatever
 * the viewer's device says it is. The view returns is_expired alongside every
 * column this screen shows, so there is no second query to merge — which is the
 * one way this list is simpler than the invoice list beside it.
 */

/**
 * Five filters over four stored statuses. "Expiring" is not a status at all —
 * it is sent, still valid, and close enough to its date to be worth a phone call
 * — so like the invoice list's unpaid and overdue filters it resolves to a set
 * of ids before the page query runs. See `load`.
 */
const FILTERS = [
  { value: "all", label: "All", kind: "status" },
  { value: "draft", label: "Drafts", kind: "status" },
  { value: "sent", label: "Sent", kind: "status" },
  { value: "expiring", label: "Expiring", kind: "derived" },
  { value: "accepted", label: "Accepted", kind: "status" },
  { value: "declined", label: "Declined", kind: "status" },
] as const;

type Filter = (typeof FILTERS)[number]["value"];

/** A quotation worth chasing: sent, not expired, and due within three days. */
const EXPIRING_WITHIN_DAYS = 3;

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

/** Whole days from today to an ISO date. Negative once it is past. */
function daysUntil(value: string | null): number | null {
  if (!value) return null;
  const target = new Date(`${value}T00:00:00`);
  if (Number.isNaN(target.valueOf())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.valueOf() - today.valueOf()) / 86400000);
}

export default function AdminQuotationsPage() {
  const [supabase] = useState(createClient);
  const toast = useToast();
  const router = useRouter();

  const [email, setEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");

  const [rows, setRows] = useState<QuotationOverview[]>([]);
  /** Every live offer, for the stat tiles and the derived filter counts. */
  const [liveRows, setLiveRows] = useState<QuotationOverview[]>([]);
  const [business, setBusiness] = useState<BusinessProfileRecord | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [totalMatching, setTotalMatching] = useState(0);

  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [pendingDelete, setPendingDelete] = useState<QuotationOverview | null>(
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

    // Every offer still on the table. Bounded by what is live rather than by the
    // whole history, so it stays small after years of quoting.
    const { data: liveResult } = await supabase
      .from("quotation_overview")
      .select("*")
      .eq("status", "sent");
    const live = (liveResult as QuotationOverview[]) ?? [];

    let query = supabase
      .from("quotation_overview")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(
        page * QUOTATION_PAGE_SIZE,
        page * QUOTATION_PAGE_SIZE + QUOTATION_PAGE_SIZE - 1,
      );

    if (filter === "expiring") {
      const ids = live
        .filter((row) => {
          if (row.is_expired) return false;
          const days = daysUntil(row.valid_until);
          return days !== null && days <= EXPIRING_WITHIN_DAYS;
        })
        .map((row) => row.id);
      // .in() with an empty list matches nothing, which is the right answer, but
      // PostgREST rejects the empty parenthesis — so short-circuit.
      if (!ids.length) {
        setError("");
        setRows([]);
        setTotalMatching(0);
        setLiveRows(live);
        setCounts((current) => ({ ...current, expiring: 0 }));
        setIsLoading(false);
        return;
      }
      query = query.in("id", ids);
    } else if (filter !== "all") {
      query = query.eq("status", filter);
    }

    const countFor = (status?: string) => {
      let q = supabase
        .from("quotation_overview")
        .select("id", { count: "exact", head: true });
      if (status) q = q.eq("status", status);
      return q;
    };

    const [
      { data: pageRows, count, error: loadError },
      { data: businessRow },
      draftCount,
      sentCount,
      acceptedCount,
      declinedCount,
      allCount,
    ] = await Promise.all([
      query,
      supabase.from("business_profile").select("*").eq("id", 1).maybeSingle(),
      countFor("draft"),
      countFor("sent"),
      countFor("accepted"),
      countFor("declined"),
      countFor(),
    ]);

    if (loadError) {
      setError(
        loadError.message.includes("does not exist")
          ? "Run 024_quotations.sql in Supabase to create the quotation tables."
          : loadError.message,
      );
      setIsLoading(false);
      return;
    }

    setError("");
    setRows((pageRows as QuotationOverview[]) ?? []);
    setTotalMatching(count ?? 0);
    setBusiness((businessRow as BusinessProfileRecord) ?? null);
    setLiveRows(live);
    setCounts({
      draft: draftCount.count ?? 0,
      sent: sentCount.count ?? 0,
      accepted: acceptedCount.count ?? 0,
      declined: declinedCount.count ?? 0,
      all: allCount.count ?? 0,
      expiring: live.filter((row) => {
        if (row.is_expired) return false;
        const days = daysUntil(row.valid_until);
        return days !== null && days <= EXPIRING_WITHIN_DAYS;
      }).length,
    });

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
    if (!term) return rows;
    return rows.filter((row) =>
      `${row.number ?? ""} ${row.customer_name} ${row.customer_phone} ${row.departure_city}`
        .toLowerCase()
        .includes(term),
    );
  }, [rows, search]);

  /**
   * What is on the table, across the whole book rather than the page on screen.
   * A figure that changed when you turned the page would be worse than none.
   */
  const pipeline = useMemo(() => {
    let openValue = 0;
    let expiringValue = 0;
    let expiringCount = 0;
    for (const row of liveRows) {
      if (row.is_expired) continue;
      openValue += row.total_paise;
      const days = daysUntil(row.valid_until);
      if (days !== null && days <= EXPIRING_WITHIN_DAYS) {
        expiringValue += row.total_paise;
        expiringCount += 1;
      }
    }
    return {
      openValue,
      openCount: liveRows.filter((row) => !row.is_expired).length,
      expiringValue,
      expiringCount,
    };
  }, [liveRows]);

  async function createQuotation() {
    if (!supabase) return;
    setIsCreating(true);
    const { data, error: createError } = await supabase
      .from("quotations")
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
      toast.error("Could not start a quotation.", {
        description: createError?.message,
      });
      return;
    }
    router.push(`/admin/quotations/${data.id}`);
  }

  /**
   * Drafts only. A sent quotation has a number the customer may already be
   * holding, so it is declined rather than deleted. Filtering on status as well
   * as id, and asking for the deleted row back, turns "a stale list tried to
   * delete something since sent" into an error instead of a silent no-op.
   */
  async function deleteDraft(row: QuotationOverview) {
    if (!supabase) return;
    setIsDeleting(true);
    const { data, error: deleteError } = await supabase
      .from("quotations")
      .delete()
      .eq("id", row.id)
      .eq("status", "draft")
      .select("id");
    setIsDeleting(false);
    setPendingDelete(null);
    if (deleteError || !data?.length) {
      toast.error("Could not delete this draft.", {
        description:
          deleteError?.message ??
          "It may have been sent in the meantime. Refresh the list.",
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
        Loading quotations...
      </main>
    );
  }

  if (!email) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#06131D] px-6">
        <section className="w-full max-w-md rounded-2xl bg-[#0B1E28] p-8">
          <h1 className="font-display text-4xl text-white">Admin Login</h1>
          <p className="mt-2 font-body text-sm text-[#B8C2C5]">
            Sign in to send quotations.
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
      title="Quotations"
      description="Price a package, send it, convert the ones that land."
      email={email}
      headerAction={
        <button
          type="button"
          onClick={() => void createQuotation()}
          disabled={isCreating}
          className="inline-flex items-center gap-2 rounded-lg bg-[#D4AF37] px-4 py-2.5 font-body text-sm font-bold text-[#06131D] transition hover:bg-[#F3E5AB] disabled:opacity-50"
        >
          <FiPlus /> {isCreating ? "Creating..." : "New quotation"}
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
          Your company name and address are not filled in yet, so quotations will
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

      {pipeline.openCount > 0 && (
        <section className="mb-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-[#D4AF37]/40 bg-[#FFFCF3] p-5">
            <p className="font-body text-xs font-semibold uppercase tracking-[0.15em] text-[#997A15]">
              On the table
            </p>
            <p className="mt-1.5 font-display text-4xl font-semibold text-[#06131D]">
              {formatRupees(pipeline.openValue, { trimZeroPaise: true })}
            </p>
            <p className="mt-1 font-body text-xs text-[#526168]">
              across {pipeline.openCount}{" "}
              {pipeline.openCount === 1 ? "live quotation" : "live quotations"}
            </p>
          </div>
          {pipeline.expiringCount > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <p className="font-body text-xs font-semibold uppercase tracking-[0.15em] text-amber-800">
                Worth a phone call
              </p>
              <p className="mt-1.5 font-display text-4xl font-semibold text-[#06131D]">
                {formatRupees(pipeline.expiringValue, { trimZeroPaise: true })}
              </p>
              <p className="mt-1 font-body text-xs text-amber-800">
                {pipeline.expiringCount} expiring within {EXPIRING_WITHIN_DAYS}{" "}
                days
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
          <span className="sr-only">Search quotations</span>
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
        {visible.map((row, index) => {
          const badge = quotationDisplayStatus(row.status, row.is_expired);
          const days = daysUntil(row.valid_until);
          const expiringSoon =
            row.status === "sent" &&
            !row.is_expired &&
            days !== null &&
            days <= EXPIRING_WITHIN_DAYS;
          return (
            <div
              key={row.id}
              className={`flex flex-wrap items-center gap-x-4 gap-y-2 border-l-4 px-4 py-4 transition hover:bg-[#FFFCF3] sm:px-5 ${
                row.is_expired || expiringSoon
                  ? "border-l-amber-400"
                  : "border-l-transparent"
              } ${index ? "border-t border-stone-100" : ""}`}
            >
              <div className="w-32 flex-shrink-0">
                <Link
                  href={`/admin/quotations/${row.id}`}
                  className="font-body text-sm font-semibold text-[#06131D] hover:text-[#997A15]"
                >
                  {row.number ?? "Draft"}
                </Link>
                <p className="font-body text-xs text-[#526168]">
                  {formatDate(row.sent_on ?? row.quote_date)}
                  {row.revision > 1 ? ` · r${row.revision}` : ""}
                </p>
                {row.status === "sent" && row.valid_until && (
                  <p
                    className={`font-body text-[11px] ${
                      row.is_expired || expiringSoon
                        ? "text-amber-700"
                        : "text-[#526168]"
                    }`}
                  >
                    {row.is_expired
                      ? `lapsed ${formatDate(row.valid_until)}`
                      : days === 0
                        ? "valid today"
                        : `${days} day${days === 1 ? "" : "s"} left`}
                  </p>
                )}
              </div>

              <div className="min-w-[10rem] flex-1">
                <p className="font-body text-sm text-[#06131D]">
                  {row.customer_name || "No customer yet"}
                </p>
                <p className="font-body text-xs text-[#526168]">
                  {[
                    row.customer_phone,
                    row.departure_city,
                    row.pax ? `${row.pax} pax` : "",
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>

              <span
                className={`rounded-full border px-3 py-1 font-body text-xs font-semibold ${
                  QUOTATION_STATUS_STYLES[badge] ?? ""
                }`}
              >
                {quotationStatusLabel(badge)}
              </span>

              <div className="w-28 text-right">
                <p className="font-body text-sm font-bold text-[#06131D]">
                  {formatRupees(row.total_paise, { trimZeroPaise: true })}
                </p>
                {row.pax && row.pax > 1 && (
                  <p className="font-body text-[11px] text-[#526168]">
                    {formatRupees(Math.floor(row.total_paise / row.pax), {
                      trimZeroPaise: true,
                    })}{" "}
                    each
                  </p>
                )}
              </div>

              <div className="ml-auto flex items-center gap-1.5">
                {row.converted_invoice_id ? (
                  <Link
                    href={`/admin/invoices/${row.converted_invoice_id}`}
                    title="Open the invoice this became"
                    className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 font-body text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                  >
                    Invoiced
                  </Link>
                ) : null}
                {row.status === "draft" ? (
                  <>
                    <Link
                      href={`/admin/quotations/${row.id}`}
                      aria-label="Edit draft quotation"
                      title="Edit"
                      className="grid h-9 w-9 place-items-center rounded-lg border border-[#06131D]/15 text-[#06131D] transition hover:border-[#D4AF37] hover:bg-white hover:text-[#997A15]"
                    >
                      <FiEdit2 />
                    </Link>
                    <button
                      type="button"
                      onClick={() => setPendingDelete(row)}
                      aria-label="Delete draft quotation"
                      title="Delete draft"
                      className="grid h-9 w-9 place-items-center rounded-lg border border-red-200 text-red-600 transition hover:bg-red-50"
                    >
                      <FiTrash2 />
                    </button>
                  </>
                ) : (
                  // A sent quotation stays editable — that is the point of the
                  // document — so this is an edit link, not a view link. The
                  // invoice list is the opposite, and deliberately so.
                  <>
                    <Link
                      href={`/admin/quotations/${row.id}`}
                      aria-label={`Open quotation ${row.number ?? ""}`}
                      title={row.status === "sent" ? "Edit or re-send" : "Open"}
                      className="grid h-9 w-9 place-items-center rounded-lg border border-[#06131D]/15 text-[#06131D] transition hover:border-[#D4AF37] hover:bg-white hover:text-[#997A15]"
                    >
                      {row.status === "sent" ? <FiEdit2 /> : <FiEye />}
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
            <FiSend className="mx-auto h-8 w-8 text-stone-300" />
            <p className="mt-3 font-body text-sm text-[#526168]">
              {search
                ? `Nothing matches "${search}".`
                : filter === "all"
                  ? "No quotations yet. Start one from here, or from an enquiry."
                  : `No ${filter} quotations.`}
            </p>
          </div>
        )}
      </section>

      {pendingDelete && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-quotation-title"
          className="fixed inset-0 z-50 grid place-items-center bg-[#06131D]/60 px-5"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3
              id="delete-quotation-title"
              className="font-display text-2xl font-semibold text-[#06131D]"
            >
              Delete this draft?
            </h3>
            <p className="mt-3 font-body text-sm text-[#526168]">
              The draft quotation
              {pendingDelete.customer_name ? (
                <>
                  {" "}for{" "}
                  <strong className="text-[#06131D]">
                    {pendingDelete.customer_name}
                  </strong>
                </>
              ) : null}{" "}
              and its lines will be removed for good. It was never sent, so
              nothing was promised to anybody. This cannot be undone.
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

      {totalMatching > QUOTATION_PAGE_SIZE && (
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
            {Math.max(1, Math.ceil(totalMatching / QUOTATION_PAGE_SIZE))} ·{" "}
            {totalMatching} total
          </p>
          <button
            type="button"
            disabled={(page + 1) * QUOTATION_PAGE_SIZE >= totalMatching}
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
