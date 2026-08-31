"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FiDownload } from "react-icons/fi";
import { createClient } from "@/lib/supabase/client";
import { fyLabel, fyRange } from "@/lib/finance";
import { formatRupees } from "@/lib/money";
import {
  SERIES,
  STATUS_INK,
  barWidth,
  monthLabel,
  scaleMax,
  type CategoryTotal,
  type MonthlyFinancials,
  type TripFinancials,
} from "@/lib/reporting";
import { useToast } from "../../components/ui/toast/useToast";
import AdminLoginForm from "../AdminLoginForm";
import AdminShell from "../AdminShell";

/**
 * The one screen that answers "how is the business doing".
 *
 * Three questions, three forms, chosen by what the reader has to do:
 *
 *   - Four headline numbers -> a KPI row of stat tiles, not a four-bar chart.
 *   - Invoiced against spent, month by month -> two series on ONE shared scale.
 *     Never two axes: with two scales you can make any two lines tell any story
 *     you like, which is why a dual-axis chart is the most misleading form there
 *     is. Both figures are rupees, so one scale is also the honest one.
 *   - Where the money went -> ranked horizontal bars, one hue, length carries
 *     the magnitude. Category is the label, not a colour: a dozen categories
 *     would need a dozen hues nobody can tell apart.
 *
 * Every bar is direct-labelled with its value, so nothing is read off a colour
 * or judged against an axis, and the tables below are the same numbers again.
 */

type Period = "fy" | "12m" | "all";

const PERIODS: { value: Period; label: string }[] = [
  { value: "fy", label: "This financial year" },
  { value: "12m", label: "Last 12 months" },
  { value: "all", label: "All time" },
];

export default function AdminFinancePage() {
  const [supabase] = useState(createClient);
  const toast = useToast();

  const [email, setEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [months, setMonths] = useState<MonthlyFinancials[]>([]);
  const [categories, setCategories] = useState<CategoryTotal[]>([]);
  const [trips, setTrips] = useState<TripFinancials[]>([]);
  const [period, setPeriod] = useState<Period>("fy");

  const range = useMemo(() => {
    if (period === "all") return null;
    if (period === "fy") return fyRange(fyLabel(new Date()));
    const to = new Date();
    const from = new Date(to.getFullYear(), to.getMonth() - 11, 1);
    const iso = (date: Date) =>
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
    return { from: iso(from), to: iso(to) };
  }, [period]);

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

    let monthly = supabase
      .from("finance_monthly")
      .select("*")
      .order("month", { ascending: false });
    let byCategory = supabase.from("expense_category_totals").select("*");

    if (range) {
      monthly = monthly.gte("month", range.from).lte("month", range.to);
      byCategory = byCategory.gte("month", range.from).lte("month", range.to);
    }

    const [
      { data: monthRows, error: monthError },
      { data: categoryRows },
      { data: tripRows },
    ] = await Promise.all([
      monthly,
      byCategory,
      supabase
        .from("trip_financials")
        .select("*")
        .order("departure_date", { ascending: false, nullsFirst: false })
        .limit(8),
    ]);

    if (monthError) {
      setError(
        monthError.message.includes("does not exist")
          ? "Run 019_finance_reporting.sql in Supabase to enable reporting."
          : monthError.message,
      );
    } else {
      setError("");
    }

    setMonths((monthRows as MonthlyFinancials[]) ?? []);
    setCategories((categoryRows as CategoryTotal[]) ?? []);
    setTrips((tripRows as TripFinancials[]) ?? []);
    setIsLoading(false);
  }, [supabase, range]);

  useEffect(() => {
    void load();
  }, [load]);

  const totals = useMemo(
    () =>
      months.reduce(
        (sum, month) => ({
          invoiced: sum.invoiced + month.invoiced_paise,
          received: sum.received + month.received_paise,
          spent: sum.spent + month.spent_paise,
          margin: sum.margin + month.margin_paise,
        }),
        { invoiced: 0, received: 0, spent: 0, margin: 0 },
      ),
    [months],
  );

  const monthMax = useMemo(
    () =>
      scaleMax(months.flatMap((m) => [m.invoiced_paise, m.spent_paise])),
    [months],
  );

  /** Categories summed across the period, biggest first. */
  const categoryRanked = useMemo(() => {
    const byName = new Map<
      string,
      { name: string; kind: string; spent: number }
    >();
    for (const row of categories) {
      const existing = byName.get(row.category_id);
      if (existing) existing.spent += row.spent_paise;
      else
        byName.set(row.category_id, {
          name: row.category_name,
          kind: row.category_kind,
          spent: row.spent_paise,
        });
    }
    return [...byName.values()].sort((a, b) => b.spent - a.spent);
  }, [categories]);

  const categoryMax = useMemo(
    () => scaleMax(categoryRanked.map((row) => row.spent)),
    [categoryRanked],
  );

  /**
   * The backup the design document asks for: a file the business owns outside
   * the database. One row per month, in rupees rather than paise, because it
   * gets opened in Excel.
   */
  function exportCsv() {
    const escape = (value: unknown) =>
      `"${String(value ?? "").replaceAll('"', '""')}"`;
    const rows = months.map((month) => [
      month.month.slice(0, 7),
      (month.invoiced_paise / 100).toFixed(2),
      (month.received_paise / 100).toFixed(2),
      (month.spent_paise / 100).toFixed(2),
      (month.margin_paise / 100).toFixed(2),
      month.invoice_count,
      month.expense_count,
    ]);
    const csv = [
      "month,invoiced_inr,received_inr,spent_inr,margin_inr,invoices,expenses",
      ...rows.map((row) => row.map(escape).join(",")),
    ].join("\n");

    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `finance-${period}-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Summary exported.");
  }

  if (isLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#F3EFEA] font-body text-sm text-[#526168]">
        Loading reports...
      </main>
    );
  }

  if (!email) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#06131D] px-6">
        <section className="w-full max-w-md rounded-2xl bg-[#0B1E28] p-8">
          <h1 className="font-display text-4xl text-white">Admin Login</h1>
          <p className="mt-2 font-body text-sm text-[#B8C2C5]">
            Sign in to view reports.
          </p>
          <div className="mt-8">
            <AdminLoginForm />
          </div>
        </section>
      </main>
    );
  }

  const hasData = months.length > 0;

  return (
    <AdminShell
      title="Reports"
      description="Money in, money out, and what each departure earned."
      email={email}
      headerAction={
        <button
          type="button"
          onClick={exportCsv}
          disabled={!hasData}
          className="inline-flex items-center gap-2 rounded-lg border border-[#06131D]/15 px-4 py-2.5 font-body text-sm font-semibold text-[#06131D] transition hover:border-[#997A15] hover:text-[#997A15] disabled:opacity-50"
        >
          <FiDownload /> Export
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

      <div className="mb-6 flex flex-wrap gap-2">
        {PERIODS.map((option) => {
          const isCurrent = period === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setPeriod(option.value)}
              aria-pressed={isCurrent}
              className={`rounded-full px-4 py-2 font-body text-sm font-semibold transition ${
                isCurrent
                  ? "bg-[#06131D] text-[#F3E5AB]"
                  : "border border-stone-200 bg-white text-[#526168] hover:border-[#D4AF37]"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {/* Four headline numbers: a KPI row, not a four-bar chart. */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile
          label="Invoiced"
          value={totals.invoiced}
          accent={SERIES.invoiced.color}
        />
        <Tile label="Received" value={totals.received} />
        <Tile label="Spent" value={totals.spent} accent={SERIES.spent.color} />
        <Tile label="Margin" value={totals.margin} signed />
      </section>

      {totals.invoiced - totals.received > 0 && (
        <p className="mt-3 font-body text-sm text-[#997A15]">
          {formatRupees(totals.invoiced - totals.received, {
            trimZeroPaise: true,
          })}{" "}
          invoiced but not yet received.{" "}
          <Link href="/admin/invoices" className="font-semibold underline">
            See outstanding invoices
          </Link>
          .
        </p>
      )}

      {/* ------------------------------------------------- month by month --- */}
      <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-display text-2xl font-semibold text-[#06131D]">
            Month by month
          </h2>
          <div className="flex gap-4">
            {Object.values(SERIES).map((series) => (
              <span
                key={series.label}
                className="inline-flex items-center gap-2 font-body text-xs text-[#526168]"
              >
                <span
                  aria-hidden="true"
                  className="h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: series.color }}
                />
                {series.label}
              </span>
            ))}
          </div>
        </div>

        {hasData ? (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[36rem] border-collapse">
              <caption className="sr-only">
                Invoiced and spent by month, with margin
              </caption>
              <thead>
                <tr className="border-b border-stone-200 text-left font-body text-[11px] uppercase tracking-[0.12em] text-[#526168]">
                  <th scope="col" className="pb-2 pr-3 font-semibold">
                    Month
                  </th>
                  <th scope="col" className="pb-2 pr-3 font-semibold">
                    Invoiced vs spent
                  </th>
                  <th scope="col" className="pb-2 pl-3 text-right font-semibold">
                    Margin
                  </th>
                </tr>
              </thead>
              <tbody>
                {months.map((month) => {
                  const isLoss = month.margin_paise < 0;
                  return (
                    <tr
                      key={month.month}
                      className="border-b border-stone-100 align-middle"
                    >
                      <th
                        scope="row"
                        className="whitespace-nowrap py-3 pr-3 text-left font-body text-sm font-semibold text-[#06131D]"
                      >
                        {monthLabel(month.month)}
                      </th>
                      <td className="py-3 pr-3">
                        {/* 2px gap between the two fills so adjacent bars never
                            read as one shape. */}
                        <div className="space-y-[2px]">
                          <MiniBar
                            value={month.invoiced_paise}
                            max={monthMax}
                            color={SERIES.invoiced.color}
                            label={SERIES.invoiced.label}
                          />
                          <MiniBar
                            value={month.spent_paise}
                            max={monthMax}
                            color={SERIES.spent.color}
                            label={SERIES.spent.label}
                          />
                        </div>
                      </td>
                      <td
                        className="whitespace-nowrap py-3 pl-3 text-right font-body text-sm font-bold"
                        style={{
                          color: isLoss
                            ? STATUS_INK.negative
                            : STATUS_INK.positive,
                        }}
                      >
                        {isLoss ? "−" : ""}
                        {formatRupees(Math.abs(month.margin_paise), {
                          trimZeroPaise: true,
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-5 font-body text-sm text-[#526168]">
            Nothing recorded in this period yet.
          </p>
        )}
      </section>

      {/* --------------------------------------------- where it went ------- */}
      <section className="mt-5 rounded-2xl border border-stone-200 bg-white p-6">
        <h2 className="font-display text-2xl font-semibold text-[#06131D]">
          Where it went
        </h2>
        <p className="mt-1 font-body text-sm text-[#526168]">
          Spending by category, largest first. Trip costs belong to a departure;
          operating costs the business carries regardless.
        </p>

        {categoryRanked.length ? (
          <ul className="mt-5 space-y-2.5">
            {categoryRanked.map((row) => (
              <li key={row.name} className="flex items-center gap-3">
                <span className="w-40 flex-shrink-0 truncate font-body text-sm text-[#06131D]">
                  {row.name}
                  <span className="ml-1.5 font-body text-[11px] text-[#526168]">
                    {row.kind === "operating" ? "op" : "trip"}
                  </span>
                </span>
                <span className="h-2.5 flex-1 overflow-hidden rounded-sm bg-stone-100">
                  <span
                    className="block h-full rounded-sm"
                    style={{
                      width: barWidth(row.spent, categoryMax),
                      backgroundColor: SERIES.spent.color,
                    }}
                  />
                </span>
                <span className="w-24 flex-shrink-0 text-right font-body text-sm font-semibold text-[#06131D]">
                  {formatRupees(row.spent, { trimZeroPaise: true })}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-5 font-body text-sm text-[#526168]">
            No expenses recorded in this period.
          </p>
        )}
      </section>

      {/* ---------------------------------------------- departures --------- */}
      <section className="mt-5 rounded-2xl border border-stone-200 bg-white p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-display text-2xl font-semibold text-[#06131D]">
            Recent departures
          </h2>
          <Link
            href="/admin/trips"
            className="font-body text-sm font-semibold text-[#997A15] hover:underline"
          >
            All departures
          </Link>
        </div>

        {trips.length ? (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[34rem] border-collapse">
              <thead>
                <tr className="border-b border-stone-200 text-left font-body text-[11px] uppercase tracking-[0.12em] text-[#526168]">
                  <th scope="col" className="pb-2 pr-3 font-semibold">
                    Departure
                  </th>
                  <th scope="col" className="pb-2 px-3 text-right font-semibold">
                    Invoiced
                  </th>
                  <th scope="col" className="pb-2 px-3 text-right font-semibold">
                    Spent
                  </th>
                  <th scope="col" className="pb-2 pl-3 text-right font-semibold">
                    Margin
                  </th>
                </tr>
              </thead>
              <tbody>
                {trips.map((trip) => {
                  const isLoss = trip.margin_paise < 0;
                  return (
                    <tr key={trip.trip_id} className="border-b border-stone-100">
                      <th
                        scope="row"
                        className="py-3 pr-3 text-left font-body text-sm font-semibold text-[#06131D]"
                      >
                        {trip.name}
                      </th>
                      <td className="whitespace-nowrap px-3 py-3 text-right font-body text-sm text-[#06131D]">
                        {formatRupees(trip.invoiced_paise, {
                          trimZeroPaise: true,
                        })}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-right font-body text-sm text-[#06131D]">
                        {formatRupees(trip.spent_paise, { trimZeroPaise: true })}
                      </td>
                      <td
                        className="whitespace-nowrap py-3 pl-3 text-right font-body text-sm font-bold"
                        style={{
                          color: isLoss
                            ? STATUS_INK.negative
                            : STATUS_INK.positive,
                        }}
                      >
                        {isLoss ? "−" : ""}
                        {formatRupees(Math.abs(trip.margin_paise), {
                          trimZeroPaise: true,
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-5 font-body text-sm text-[#526168]">
            No departures yet.{" "}
            <Link href="/admin/trips" className="font-semibold underline">
              Add one
            </Link>{" "}
            to see per-batch profit.
          </p>
        )}
      </section>
    </AdminShell>
  );
}

function Tile({
  label,
  value,
  accent,
  signed = false,
}: {
  label: string;
  value: number;
  accent?: string;
  signed?: boolean;
}) {
  const isLoss = signed && value < 0;
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5">
      <p className="flex items-center gap-2 font-body text-xs font-semibold uppercase tracking-[0.15em] text-[#526168]">
        {accent && (
          <span
            aria-hidden="true"
            className="h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: accent }}
          />
        )}
        {label}
      </p>
      <p
        className="mt-1.5 font-display text-3xl font-semibold"
        style={
          signed
            ? { color: isLoss ? STATUS_INK.negative : STATUS_INK.positive }
            : { color: "#06131D" }
        }
      >
        {isLoss ? "−" : ""}
        {formatRupees(Math.abs(value), { trimZeroPaise: true })}
      </p>
    </div>
  );
}

/** A row bar with its value written beside it — never read off colour alone. */
function MiniBar({
  value,
  max,
  color,
  label,
}: {
  value: number;
  max: number;
  color: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="h-2 flex-1 overflow-hidden rounded-sm bg-stone-100"
        title={`${label}: ${formatRupees(value, { trimZeroPaise: true })}`}
      >
        <span
          className="block h-full rounded-sm"
          style={{ width: barWidth(value, max), backgroundColor: color }}
        />
      </span>
      <span className="w-24 flex-shrink-0 text-right font-body text-xs text-[#526168]">
        <span className="sr-only">{label}: </span>
        {formatRupees(value, { trimZeroPaise: true })}
      </span>
    </div>
  );
}
