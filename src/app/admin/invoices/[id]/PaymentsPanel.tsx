"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FiPlus, FiTrash2 } from "react-icons/fi";
import { createClient } from "@/lib/supabase/client";
import {
  PAYMENT_METHODS,
  paymentMethodLabel,
  type PaymentMethod,
} from "@/lib/finance";
import type { InvoicePayment } from "@/lib/invoices";
import { formatRupees, paiseToInputValue, parsePaise } from "@/lib/money";
import { useToast } from "../../../components/ui/toast/useToast";

/**
 * Receipts against one invoice.
 *
 * A separate table rather than a paid/unpaid flag, because Umrah is sold as an
 * advance plus one or more balance payments — "how much is still outstanding"
 * has to have a real answer, and a boolean cannot give one.
 *
 * Only shown for issued invoices. A draft carries no obligation yet, and a
 * cancelled one no longer does.
 */

const FIELD =
  "w-full rounded-lg border border-stone-200 bg-white px-3 py-2 font-body text-sm text-[#06131D] outline-none transition focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20";

const LABEL =
  "mb-1.5 block font-body text-xs font-semibold uppercase tracking-[0.12em] text-[#526168]";

function todayInput(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

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

export default function PaymentsPanel({
  invoiceId,
  totalPaise,
  dueDate,
  onChanged,
}: {
  invoiceId: string;
  totalPaise: number;
  dueDate: string | null;
  /** Lets the editor refresh the badge in its header after a receipt lands. */
  onChanged?: () => void;
}) {
  const [supabase] = useState(createClient);
  const toast = useToast();

  const [payments, setPayments] = useState<InvoicePayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState<string | null>(null);

  const [paidOn, setPaidOn] = useState(todayInput());
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("bank");
  const [reference, setReference] = useState("");

  const load = useCallback(async () => {
    if (!supabase) return;
    const { data, error: loadError } = await supabase
      .from("invoice_payments")
      .select("*")
      .eq("invoice_id", invoiceId)
      .order("paid_on", { ascending: true })
      .order("created_at", { ascending: true });

    if (loadError) setError(loadError.message);
    else setPayments((data as InvoicePayment[]) ?? []);
    setIsLoading(false);
  }, [supabase, invoiceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const paid = useMemo(
    () => payments.reduce((sum, payment) => sum + payment.amount_paise, 0),
    [payments],
  );
  const balance = totalPaise - paid;

  const entered = parsePaise(amount);
  // An overpayment is usually a typo but sometimes a customer rounding up, so
  // this warns rather than blocks — refusing it outright would make a real
  // situation impossible to record.
  const isOverpaying = entered !== null && entered > balance && balance > 0;

  const isOverdue = Boolean(
    dueDate && balance > 0 && new Date(`${dueDate}T00:00:00`) < new Date(todayInput() + "T00:00:00"),
  );

  async function addPayment() {
    if (!supabase) return;
    if (entered === null || entered <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    if (!paidOn) {
      setError("Enter the date this was received.");
      return;
    }

    setIsSaving(true);
    setError("");
    const { data: userData } = await supabase.auth.getUser();
    const { error: insertError } = await supabase
      .from("invoice_payments")
      .insert({
        invoice_id: invoiceId,
        paid_on: paidOn,
        amount_paise: entered,
        method,
        reference: reference.trim(),
        created_by: userData.user?.id ?? null,
      });
    setIsSaving(false);

    if (insertError) {
      toast.error("Could not record that payment.", {
        description: insertError.message,
      });
      return;
    }

    setAmount("");
    setReference("");
    toast.success(`Recorded ${formatRupees(entered, { trimZeroPaise: true })}.`);
    await load();
    onChanged?.();
  }

  /**
   * Hard delete, unlike an expense. A receipt entered against the wrong invoice
   * has to come off it — the immutable record here is the invoice, not the
   * bookkeeping of what has been received against it.
   */
  async function removePayment(payment: InvoicePayment) {
    if (!supabase) return;
    setConfirming(null);
    const { error: deleteError } = await supabase
      .from("invoice_payments")
      .delete()
      .eq("id", payment.id);

    if (deleteError) {
      toast.error("Could not remove that payment.", {
        description: deleteError.message,
      });
      return;
    }
    toast.success("Payment removed.");
    await load();
    onChanged?.();
  }

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-xl font-semibold text-[#06131D]">
          Payments
        </h2>
        {balance > 0 ? (
          <span
            className={`rounded-full border px-3 py-1 font-body text-xs font-semibold ${
              isOverdue
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-amber-200 bg-amber-50 text-amber-700"
            }`}
          >
            {isOverdue ? "Overdue" : "Due"}{" "}
            {formatRupees(balance, { trimZeroPaise: true })}
          </span>
        ) : (
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-body text-xs font-semibold text-emerald-700">
            {balance < 0 ? "Overpaid" : "Paid in full"}
          </span>
        )}
      </div>

      {error && (
        <p
          role="alert"
          className="mt-3 rounded-lg bg-red-50 p-2.5 font-body text-sm text-red-700"
        >
          {error}
        </p>
      )}

      {isLoading ? (
        <p className="mt-4 font-body text-sm text-[#526168]">Loading...</p>
      ) : (
        <>
          {payments.length > 0 && (
            <ul className="mt-4 divide-y divide-stone-100">
              {payments.map((payment) => (
                <li
                  key={payment.id}
                  className="flex items-center gap-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-body text-sm font-semibold text-[#06131D]">
                      {formatRupees(payment.amount_paise, {
                        trimZeroPaise: true,
                      })}
                    </p>
                    <p className="font-body text-xs text-[#526168]">
                      {formatDate(payment.paid_on)} ·{" "}
                      {paymentMethodLabel(payment.method)}
                      {payment.reference ? ` · ${payment.reference}` : ""}
                    </p>
                  </div>
                  {confirming === payment.id ? (
                    <span className="flex flex-shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => void removePayment(payment)}
                        className="rounded-lg bg-red-600 px-2.5 py-1.5 font-body text-xs font-semibold text-white"
                      >
                        Remove
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
                      onClick={() => setConfirming(payment.id)}
                      aria-label="Remove payment"
                      className="flex-shrink-0 rounded-lg p-1.5 text-[#526168] transition hover:bg-red-50 hover:text-red-600"
                    >
                      <FiTrash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          <dl className="mt-4 space-y-1.5 border-t border-stone-100 pt-3 font-body text-sm">
            <div className="flex justify-between">
              <dt className="text-[#526168]">Invoiced</dt>
              <dd>{formatRupees(totalPaise, { trimZeroPaise: true })}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[#526168]">Received</dt>
              <dd>{formatRupees(paid, { trimZeroPaise: true })}</dd>
            </div>
            <div className="flex justify-between font-semibold text-[#06131D]">
              <dt>Balance</dt>
              <dd>{formatRupees(balance, { trimZeroPaise: true })}</dd>
            </div>
          </dl>

          {/* Record a receipt */}
          <div className="mt-4 space-y-3 border-t border-stone-100 pt-4">
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className={LABEL}>Received on</span>
                <input
                  type="date"
                  value={paidOn}
                  onChange={(event) => setPaidOn(event.target.value)}
                  className={FIELD}
                />
              </label>
              <label className="block">
                <span className={LABEL}>Amount (₹)</span>
                <input
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder={
                    balance > 0 ? paiseToInputValue(balance) : "0.00"
                  }
                  className={FIELD}
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className={LABEL}>Method</span>
                <select
                  value={method}
                  onChange={(event) =>
                    setMethod(event.target.value as PaymentMethod)
                  }
                  className={FIELD}
                >
                  {PAYMENT_METHODS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className={LABEL}>Reference</span>
                <input
                  value={reference}
                  onChange={(event) => setReference(event.target.value)}
                  placeholder="UTR / cheque no."
                  maxLength={120}
                  className={FIELD}
                />
              </label>
            </div>

            {balance > 0 && (
              <button
                type="button"
                onClick={() => setAmount(paiseToInputValue(balance))}
                className="font-body text-xs font-semibold text-[#997A15] hover:underline"
              >
                Fill the full balance
              </button>
            )}

            {isOverpaying && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 font-body text-xs text-amber-800">
                That is more than the {formatRupees(balance, {
                  trimZeroPaise: true,
                })}{" "}
                outstanding. It will be recorded as an overpayment.
              </p>
            )}

            <button
              type="button"
              onClick={() => void addPayment()}
              disabled={isSaving || !amount.trim()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#06131D] px-4 py-2.5 font-body text-sm font-semibold text-[#F3E5AB] transition hover:bg-[#0B1E28] disabled:opacity-40"
            >
              <FiPlus /> {isSaving ? "Recording..." : "Record payment"}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
