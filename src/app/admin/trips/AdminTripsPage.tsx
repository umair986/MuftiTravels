"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FiEdit2, FiPlus, FiTrash2, FiX } from "react-icons/fi";
import { createClient } from "@/lib/supabase/client";
import { TRIP_STATUSES, tripStatusLabel, type TripStatus } from "@/lib/finance";
import { SERIES, STATUS_INK, barWidth, scaleMax, type TripFinancials } from "@/lib/reporting";
import { formatRupees } from "@/lib/money";
import { useToast } from "../../components/ui/toast/useToast";
import AdminLoginForm from "../AdminLoginForm";
import AdminShell from "../AdminShell";

/**
 * Departures, and whether each one made money.
 *
 * A trip is a typed name and a date — deliberately not chosen from the package
 * catalogue (Decision 5). Its only job is to be the thing an expense and an
 * invoice can both point at, which is what lets the two ledgers meet.
 */

const FIELD =
  "w-full rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 font-body text-sm text-[#06131D] outline-none transition focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20";

const LABEL =
  "mb-1.5 block font-body text-xs font-semibold uppercase tracking-[0.12em] text-[#526168]";

const CATEGORIES = ["umrah", "hajj", "ramzan", "ziyarat", "other"];

type TripDraft = {
  id?: string;
  name: string;
  category: string;
  departure_date: string | null;
  return_date: string | null;
  status: TripStatus;
  notes: string;
};

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

export default function AdminTripsPage() {
  const [supabase] = useState(createClient);
  const toast = useToast();

  const [email, setEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [rows, setRows] = useState<TripFinancials[]>([]);

  const [editing, setEditing] = useState<TripDraft | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);

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

    const { data, error: loadError } = await supabase
      .from("trip_financials")
      .select("*")
      .order("departure_date", { ascending: false, nullsFirst: false });

    if (loadError) {
      setError(
        loadError.message.includes("does not exist")
          ? "Run 019_finance_reporting.sql in Supabase to enable departure reporting."
          : loadError.message,
      );
    } else {
      setError("");
      setRows((data as TripFinancials[]) ?? []);
    }
    setIsLoading(false);
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  // One scale across every bar, so two departures can be compared by eye.
  const max = useMemo(
    () => scaleMax(rows.flatMap((row) => [row.invoiced_paise, row.spent_paise])),
    [rows],
  );

  const totals = useMemo(
    () =>
      rows.reduce(
        (sum, row) => ({
          invoiced: sum.invoiced + row.invoiced_paise,
          spent: sum.spent + row.spent_paise,
          margin: sum.margin + row.margin_paise,
        }),
        { invoiced: 0, spent: 0, margin: 0 },
      ),
    [rows],
  );

  async function save() {
    if (!supabase || !editing) return;
    const name = editing.name.trim();
    if (!name) return setError("A departure needs a name.");

    setIsSaving(true);
    setError("");
    const payload = {
      name,
      category: editing.category,
      departure_date: editing.departure_date || null,
      return_date: editing.return_date || null,
      status: editing.status,
      notes: editing.notes.trim(),
    };

    const { error: saveError } = editing.id
      ? await supabase.from("trips").update(payload).eq("id", editing.id)
      : await supabase.from("trips").insert(payload);
    setIsSaving(false);

    if (saveError) {
      toast.error("Could not save that departure.", {
        description: saveError.message,
      });
      return;
    }
    toast.success(editing.id ? "Departure updated." : `Added "${name}".`);
    setEditing(null);
    void load();
  }

  /**
   * Both FKs pointing here are ON DELETE SET NULL, so removing a departure
   * releases its expenses and invoices rather than taking them with it. The
   * money stays in the books; it just stops being attributed to a batch.
   */
  async function remove(row: TripFinancials) {
    if (!supabase) return;
    setConfirming(null);
    const { error: deleteError } = await supabase
      .from("trips")
      .delete()
      .eq("id", row.trip_id);
    if (deleteError) {
      toast.error("Could not delete that departure.", {
        description: deleteError.message,
      });
      return;
    }
    toast.success(`"${row.name}" deleted. Its entries were kept.`);
    void load();
  }

  if (isLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#F3EFEA] font-body text-sm text-[#526168]">
        Loading departures...
      </main>
    );
  }

  if (!email) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#06131D] px-6">
        <section className="w-full max-w-md rounded-2xl bg-[#0B1E28] p-8">
          <h1 className="font-display text-4xl text-white">Admin Login</h1>
          <p className="mt-2 font-body text-sm text-[#B8C2C5]">
            Sign in to manage departures.
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
      title="Departures"
      description="Group a batch's bills and costs, and see what it earned."
      email={email}
      headerAction={
        <button
          type="button"
          onClick={() =>
            setEditing({
              name: "",
              category: "umrah",
              departure_date: null,
              return_date: null,
              status: "planned",
              notes: "",
            })
          }
          className="inline-flex items-center gap-2 rounded-lg bg-[#D4AF37] px-4 py-2.5 font-body text-sm font-bold text-[#06131D] transition hover:bg-[#F3E5AB]"
        >
          <FiPlus /> New departure
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

      {rows.length > 0 && (
        <section className="mb-6 grid gap-3 sm:grid-cols-3">
          <Tile label="Invoiced" value={totals.invoiced} accent={SERIES.invoiced.color} />
          <Tile label="Spent" value={totals.spent} accent={SERIES.spent.color} />
          <Tile label="Margin" value={totals.margin} signed />
        </section>
      )}

      {/* Two series on one scale, always legended — colour is never the only cue,
          since every bar carries its own value label. */}
      {rows.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-4">
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
      )}

      <section className="space-y-3">
        {rows.map((row) => {
          const isConfirming = confirming === row.trip_id;
          const isLoss = row.margin_paise < 0;
          return (
            <article
              key={row.trip_id}
              className="rounded-2xl border border-stone-200 bg-white p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-display text-xl font-semibold text-[#06131D]">
                    {row.name}
                  </h2>
                  <p className="mt-0.5 font-body text-xs text-[#526168]">
                    {[
                      row.category,
                      formatDate(row.departure_date),
                      tripStatusLabel(row.status),
                      `${row.invoice_count} ${row.invoice_count === 1 ? "invoice" : "invoices"}`,
                      `${row.expense_count} ${row.expense_count === 1 ? "expense" : "expenses"}`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>

                <div className="flex flex-shrink-0 items-center gap-3">
                  <div className="text-right">
                    <p className="font-body text-[11px] uppercase tracking-[0.12em] text-[#526168]">
                      Margin
                    </p>
                    <p
                      className="font-display text-2xl font-semibold"
                      style={{
                        color: isLoss ? STATUS_INK.negative : STATUS_INK.positive,
                      }}
                    >
                      {isLoss ? "−" : ""}
                      {formatRupees(Math.abs(row.margin_paise), {
                        trimZeroPaise: true,
                      })}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setEditing({
                        id: row.trip_id,
                        name: row.name,
                        category: row.category,
                        departure_date: row.departure_date,
                        return_date: row.return_date,
                        status: row.status,
                        notes: "",
                      })
                    }
                    aria-label={`Edit ${row.name}`}
                    className="rounded-lg p-2 text-[#526168] transition hover:bg-stone-100 hover:text-[#06131D]"
                  >
                    <FiEdit2 />
                  </button>
                  {isConfirming ? (
                    <span className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => void remove(row)}
                        className="rounded-lg bg-red-600 px-3 py-1.5 font-body text-xs font-semibold text-white"
                      >
                        Delete
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirming(null)}
                        className="rounded-lg px-2 py-1.5 font-body text-xs text-[#526168] hover:underline"
                      >
                        Cancel
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirming(row.trip_id)}
                      aria-label={`Delete ${row.name}`}
                      className="rounded-lg p-2 text-[#526168] transition hover:bg-red-50 hover:text-red-600"
                    >
                      <FiTrash2 />
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <Bar
                  label={SERIES.invoiced.label}
                  value={row.invoiced_paise}
                  max={max}
                  color={SERIES.invoiced.color}
                />
                <Bar
                  label={SERIES.spent.label}
                  value={row.spent_paise}
                  max={max}
                  color={SERIES.spent.color}
                />
              </div>

              {row.outstanding_paise > 0 && (
                <p className="mt-3 font-body text-xs text-[#997A15]">
                  {formatRupees(row.outstanding_paise, { trimZeroPaise: true })}{" "}
                  still to be received.
                </p>
              )}
            </article>
          );
        })}

        {!rows.length && !error && (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-12 text-center">
            <p className="font-body text-sm text-[#526168]">
              No departures yet. Add one, then tag its invoices and expenses to
              see whether the batch made money.
            </p>
          </div>
        )}
      </section>

      {editing && (
        <div
          className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[#06131D]/60 px-5 py-8"
          role="dialog"
          aria-modal="true"
          aria-labelledby="trip-dialog-heading"
        >
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <h3
                id="trip-dialog-heading"
                className="font-display text-3xl font-semibold text-[#06131D]"
              >
                {editing.id ? "Edit departure" : "New departure"}
              </h3>
              <button
                type="button"
                onClick={() => setEditing(null)}
                aria-label="Close"
                className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg border border-stone-200 text-[#526168] hover:bg-stone-50"
              >
                <FiX />
              </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className={LABEL}>Name</span>
                <input
                  value={editing.name}
                  onChange={(event) =>
                    setEditing({ ...editing, name: event.target.value })
                  }
                  placeholder="Umrah · Delhi · 12 Mar"
                  className={FIELD}
                />
              </label>
              <label className="block">
                <span className={LABEL}>Type</span>
                <select
                  value={editing.category}
                  onChange={(event) =>
                    setEditing({ ...editing, category: event.target.value })
                  }
                  className={FIELD}
                >
                  {CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className={LABEL}>Status</span>
                <select
                  value={editing.status}
                  onChange={(event) =>
                    setEditing({
                      ...editing,
                      status: event.target.value as TripStatus,
                    })
                  }
                  className={FIELD}
                >
                  {TRIP_STATUSES.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className={LABEL}>Departs</span>
                <input
                  type="date"
                  value={editing.departure_date ?? ""}
                  onChange={(event) =>
                    setEditing({
                      ...editing,
                      departure_date: event.target.value || null,
                    })
                  }
                  className={FIELD}
                />
              </label>
              <label className="block">
                <span className={LABEL}>Returns</span>
                <input
                  type="date"
                  value={editing.return_date ?? ""}
                  onChange={(event) =>
                    setEditing({
                      ...editing,
                      return_date: event.target.value || null,
                    })
                  }
                  className={FIELD}
                />
              </label>
              <label className="block sm:col-span-2">
                <span className={LABEL}>Notes</span>
                <textarea
                  value={editing.notes}
                  onChange={(event) =>
                    setEditing({ ...editing, notes: event.target.value })
                  }
                  rows={2}
                  className={`${FIELD} resize-y`}
                />
              </label>
            </div>

            <div className="mt-7 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-lg border border-stone-200 px-5 py-2.5 font-body text-sm font-semibold text-[#526168] transition hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void save()}
                disabled={isSaving || !editing.name.trim()}
                className="rounded-lg bg-[#D4AF37] px-5 py-2.5 font-body text-sm font-bold text-[#06131D] transition hover:bg-[#F3E5AB] disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save departure"}
              </button>
            </div>
          </div>
        </div>
      )}
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

/**
 * One bar, on the shared scale. The value is always written out beside it, so
 * the reader never has to judge a length against an axis — and identity never
 * rests on colour alone.
 */
function Bar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-16 flex-shrink-0 font-body text-xs text-[#526168]">
        {label}
      </span>
      <span className="h-2.5 flex-1 overflow-hidden rounded-sm bg-stone-100">
        <span
          className="block h-full rounded-sm"
          style={{ width: barWidth(value, max), backgroundColor: color }}
        />
      </span>
      <span className="w-24 flex-shrink-0 text-right font-body text-xs font-semibold text-[#06131D]">
        {formatRupees(value, { trimZeroPaise: true })}
      </span>
    </div>
  );
}
