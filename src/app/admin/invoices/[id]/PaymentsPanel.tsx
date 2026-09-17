"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FiDownload, FiEye, FiPlus, FiTrash2 } from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";
import { createClient } from "@/lib/supabase/client";
import {
  PAYMENT_METHODS,
  computeReceiptFigures,
  paymentMethodLabel,
  type PaymentMethod,
} from "@/lib/finance";
import {
  INVOICE_LINK_TTL_SECONDS,
  receiptPdfPath,
  uploadPdfOnce,
  whatsappReceiptUrl,
  type BusinessProfileRecord,
  type InvoicePayment,
  type InvoiceRecord,
} from "@/lib/invoices";
import { formatRupees, paiseToInputValue, parsePaise } from "@/lib/money";
import { receiptFileName, renderReceiptPdf } from "@/lib/pdf/renderInvoice";
import { useToast } from "../../../components/ui/toast/useToast";

/**
 * Payments against one invoice, and the receipt each one produces.
 *
 * A separate table rather than a paid/unpaid flag, because Umrah is sold as an
 * advance plus one or more balance payments — "how much is still outstanding"
 * has to have a real answer, and a boolean cannot give one.
 *
 * Every payment gets its own numbered receipt (<invoice no.>-R1, -R2 …),
 * allocated by the database when the row is inserted (migration 023). The
 * receipt lives here, beside the payment it acknowledges, rather than as one
 * document in the sidebar: there is one per row, and the moment it is wanted
 * is the moment the payment has just been recorded.
 *
 * A receipt PDF is rendered the first time it is viewed or sent, stored, and
 * served from storage from then on — the customer's copy never changes.
 */

const FIELD =
  "w-full rounded-lg border border-stone-200 bg-white px-3 py-2 font-body text-sm text-[#06131D] outline-none transition focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20";

const LABEL =
  "mb-1.5 block font-body text-xs font-semibold uppercase tracking-[0.12em] text-[#526168]";

const ICON_BUTTON =
  "rounded-lg p-2 text-[#526168] transition hover:bg-[#FAF8F5] hover:text-[#997A15] disabled:opacity-40";

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

function rupees(paise: number) {
  return formatRupees(paise, { trimZeroPaise: true });
}

export default function PaymentsPanel({
  invoice,
  business,
  canRecord,
  onChanged,
  onPreview,
}: {
  invoice: InvoiceRecord;
  business: BusinessProfileRecord | null;
  /** Issued invoices only. A cancelled one keeps its history, read-only. */
  canRecord: boolean;
  /**
   * Called after a payment is added or removed. The editor re-reads the
   * invoice and, if the payments just settled or unsettled it, rebuilds the
   * invoice PDF.
   */
  onChanged?: () => Promise<void> | void;
  /** Show a PDF URL in the editor's preview overlay. */
  onPreview: (url: string) => void;
}) {
  const [supabase] = useState(createClient);
  const toast = useToast();

  const [payments, setPayments] = useState<InvoicePayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState<string | null>(null);
  // Which receipt is being rendered or signed, so only its buttons wait.
  const [busy, setBusy] = useState<string | null>(null);
  // The payment recorded in this visit, whose receipt is offered up front.
  const [justRecorded, setJustRecorded] = useState<string | null>(null);

  const [paidOn, setPaidOn] = useState(todayInput());
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("bank");
  const [reference, setReference] = useState("");

  const totalPaise = invoice.total_paise;

  const load = useCallback(async () => {
    if (!supabase) return;
    const { data, error: loadError } = await supabase
      .from("invoice_payments")
      .select("*")
      .eq("invoice_id", invoice.id)
      .order("receipt_seq", { ascending: true, nullsFirst: true })
      .order("paid_on", { ascending: true })
      .order("created_at", { ascending: true });

    if (loadError) {
      setError(
        loadError.message.includes("receipt_seq")
          ? "Run 023_payment_receipts.sql in Supabase to turn on numbered receipts."
          : loadError.message,
      );
    } else setPayments((data as InvoicePayment[]) ?? []);
    setIsLoading(false);
  }, [supabase, invoice.id]);

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
    invoice.due_date &&
      balance > 0 &&
      new Date(`${invoice.due_date}T00:00:00`) <
        new Date(todayInput() + "T00:00:00"),
  );

  /* ------------------------------------------------------------ writes */

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
    const { data: inserted, error: insertError } = await supabase
      .from("invoice_payments")
      .insert({
        invoice_id: invoice.id,
        paid_on: paidOn,
        amount_paise: entered,
        method,
        reference: reference.trim(),
        created_by: userData.user?.id ?? null,
      })
      .select("*")
      .single();

    if (insertError || !inserted) {
      setIsSaving(false);
      toast.error("Could not record that payment.", {
        description: insertError?.message,
      });
      return;
    }

    const row = inserted as InvoicePayment;
    setAmount("");
    setReference("");
    setJustRecorded(row.id);
    toast.success(
      row.receipt_number
        ? `Recorded ${rupees(entered)} — receipt ${row.receipt_number}.`
        : `Recorded ${rupees(entered)}.`,
    );
    await load();
    await onChanged?.();
    setIsSaving(false);
  }

  /**
   * Hard delete, unlike an expense. A payment entered against the wrong
   * invoice has to come off it. Its receipt number is not handed out again,
   * and a receipt PDF already sent stays in storage — it is what the customer
   * was given.
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
    if (justRecorded === payment.id) setJustRecorded(null);
    toast.success("Payment removed.");
    await load();
    await onChanged?.();
  }

  /* ---------------------------------------------------------- receipts */

  /**
   * A signed URL for a payment's receipt, storing the PDF first if this is
   * the first time anybody asked for it.
   *
   * Signing first and rendering only on a miss means a receipt that already
   * exists is served exactly as stored, never re-rendered with today's logo.
   */
  async function receiptLink(
    payment: InvoicePayment,
    ttlSeconds: number,
    download?: string,
  ): Promise<string> {
    if (!supabase || !business) throw new Error("Not ready yet.");
    const path = receiptPdfPath(invoice.id, payment);
    const sign = () =>
      supabase.storage
        .from("invoices")
        .createSignedUrl(
          path,
          ttlSeconds,
          download ? { download } : undefined,
        );

    const first = await sign();
    if (first.data?.signedUrl) return first.data.signedUrl;

    const blob = await renderReceiptPdf({ invoice, payment, business });
    const uploadError = await uploadPdfOnce(supabase, path, blob);
    if (uploadError) throw new Error(uploadError);

    const second = await sign();
    if (!second.data?.signedUrl) {
      throw new Error(second.error?.message ?? "Could not sign the receipt.");
    }
    return second.data.signedUrl;
  }

  async function withReceipt(
    payment: InvoicePayment,
    action: () => Promise<void>,
  ) {
    setBusy(payment.id);
    try {
      await action();
    } catch (receiptError) {
      toast.error("Could not prepare the receipt.", {
        description:
          receiptError instanceof Error ? receiptError.message : undefined,
      });
    }
    setBusy(null);
  }

  const viewReceipt = (payment: InvoicePayment) =>
    withReceipt(payment, async () => {
      onPreview(await receiptLink(payment, 300));
    });

  const downloadReceipt = (payment: InvoicePayment) =>
    withReceipt(payment, async () => {
      // The signed URL carries Content-Disposition: attachment, so following
      // it downloads without leaving the page.
      const link = document.createElement("a");
      link.href = await receiptLink(payment, 60, receiptFileName(payment));
      link.click();
    });

  const sendReceipt = (payment: InvoicePayment) =>
    withReceipt(payment, async () => {
      const link = await receiptLink(payment, INVOICE_LINK_TTL_SECONDS);
      const url = whatsappReceiptUrl({
        phone: invoice.customer_phone,
        name: invoice.customer_name,
        invoiceNumber: invoice.number ?? "",
        receiptNumber: payment.receipt_number ?? "",
        amountPaise: payment.amount_paise,
        balancePaise: computeReceiptFigures(
          totalPaise,
          payment.paid_before_paise ?? 0,
          payment.amount_paise,
        ).dueAfterPaise,
        link,
      });
      if (!url) {
        toast.error("That customer has no usable phone number.");
        return;
      }
      window.open(url, "_blank", "noopener,noreferrer");
    });

  /* ------------------------------------------------------------ render */

  const recorded = payments.find((payment) => payment.id === justRecorded);

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold text-[#06131D]">
            Payments &amp; receipts
          </h2>
          <p className="mt-1 font-body text-sm text-[#526168]">
            Every payment gets its own receipt. When the receipts cover the
            total, the invoice PDF is updated to list them all.
          </p>
        </div>
        {balance > 0 ? (
          <span
            className={`rounded-full border px-3 py-1 font-body text-xs font-semibold ${
              isOverdue
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-amber-200 bg-amber-50 text-amber-700"
            }`}
          >
            {isOverdue ? "Overdue" : "Due"} {rupees(balance)}
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

      <dl className="mt-5 grid grid-cols-3 gap-3 rounded-xl bg-[#FAF8F5] p-4 font-body">
        <div>
          <dt className="text-xs uppercase tracking-[0.12em] text-[#526168]">
            Invoiced
          </dt>
          <dd className="mt-1 text-base font-semibold text-[#06131D]">
            {rupees(totalPaise)}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.12em] text-[#526168]">
            Received
          </dt>
          <dd className="mt-1 text-base font-semibold text-[#06131D]">
            {rupees(paid)}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.12em] text-[#526168]">
            Balance
          </dt>
          <dd
            className={`mt-1 text-base font-semibold ${
              balance > 0 ? "text-[#997A15]" : "text-emerald-700"
            }`}
          >
            {rupees(Math.max(balance, 0))}
          </dd>
        </div>
      </dl>

      {isLoading ? (
        <p className="mt-4 font-body text-sm text-[#526168]">Loading...</p>
      ) : (
        <>
          {payments.length > 0 ? (
            <ul className="mt-4 divide-y divide-stone-100">
              {payments.map((payment) => {
                const after = computeReceiptFigures(
                  totalPaise,
                  payment.paid_before_paise ?? 0,
                  payment.amount_paise,
                ).dueAfterPaise;
                const isBusy = busy === payment.id;
                return (
                  <li
                    key={payment.id}
                    className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3"
                  >
                    <span className="rounded-md border border-[#EBD9A0] bg-[#FFFCF3] px-2 py-1 font-body text-xs font-semibold text-[#997A15]">
                      {payment.receipt_seq ? `R${payment.receipt_seq}` : "—"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-body text-sm font-semibold text-[#06131D]">
                        {rupees(payment.amount_paise)}
                        <span className="ml-2 font-normal text-[#526168]">
                          {payment.receipt_number ?? ""}
                        </span>
                      </p>
                      <p className="font-body text-xs text-[#526168]">
                        {formatDate(payment.paid_on)} ·{" "}
                        {paymentMethodLabel(payment.method)}
                        {payment.reference ? ` · ${payment.reference}` : ""}
                        {" · "}
                        {after > 0
                          ? `${rupees(after)} due after this`
                          : "cleared the balance"}
                      </p>
                    </div>

                    {confirming === payment.id ? (
                      <span className="flex flex-shrink-0 items-center gap-2">
                        <span className="font-body text-xs text-[#526168]">
                          {payment.receipt_seq
                            ? `R${payment.receipt_seq} will not be reused.`
                            : ""}
                        </span>
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
                      <span className="flex flex-shrink-0 items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => void viewReceipt(payment)}
                          disabled={isBusy || !business}
                          aria-label="View receipt"
                          title="View receipt"
                          className={ICON_BUTTON}
                        >
                          <FiEye />
                        </button>
                        <button
                          type="button"
                          onClick={() => void downloadReceipt(payment)}
                          disabled={isBusy || !business}
                          aria-label="Download receipt"
                          title="Download receipt"
                          className={ICON_BUTTON}
                        >
                          <FiDownload />
                        </button>
                        <button
                          type="button"
                          onClick={() => void sendReceipt(payment)}
                          disabled={isBusy || !business}
                          aria-label="Send receipt on WhatsApp"
                          title="Send receipt on WhatsApp"
                          className="rounded-lg p-2 text-[#25D366] transition hover:bg-[#25D366]/10 disabled:opacity-40"
                        >
                          <FaWhatsapp />
                        </button>
                        {canRecord && (
                          <button
                            type="button"
                            onClick={() => setConfirming(payment.id)}
                            aria-label="Remove payment"
                            title="Remove payment"
                            className="rounded-lg p-2 text-[#526168] transition hover:bg-red-50 hover:text-red-600"
                          >
                            <FiTrash2 />
                          </button>
                        )}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-4 font-body text-sm text-[#526168]">
              Nothing received yet.
            </p>
          )}

          {/* The receipt is wanted the moment the money is recorded, so it is
              offered right there rather than left for the admin to find. */}
          {recorded && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#EBD9A0] bg-[#FFFCF3] p-3">
              <p className="font-body text-sm text-[#06131D]">
                Receipt{" "}
                <span className="font-semibold">
                  {recorded.receipt_number ?? ""}
                </span>{" "}
                is ready to send.
              </p>
              <button
                type="button"
                onClick={() => void sendReceipt(recorded)}
                disabled={busy === recorded.id || !business}
                className="inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-4 py-2 font-body text-sm font-bold text-white transition hover:bg-[#1FB855] disabled:opacity-50"
              >
                <FaWhatsapp />{" "}
                {busy === recorded.id ? "Preparing..." : "Send receipt"}
              </button>
            </div>
          )}

          {canRecord && (
            <div className="mt-5 space-y-3 border-t border-stone-100 pt-5">
              <p className="font-body text-sm font-semibold text-[#06131D]">
                Record a payment
              </p>
              <div className="grid gap-3 sm:grid-cols-4">
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

              {isOverpaying && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 font-body text-xs text-amber-800">
                  That is more than the {rupees(balance)} outstanding. It will
                  be recorded as an overpayment.
                </p>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3">
                {balance > 0 ? (
                  <button
                    type="button"
                    onClick={() => setAmount(paiseToInputValue(balance))}
                    className="font-body text-xs font-semibold text-[#997A15] hover:underline"
                  >
                    Fill the full balance ({rupees(balance)})
                  </button>
                ) : (
                  <span />
                )}
                <button
                  type="button"
                  onClick={() => void addPayment()}
                  disabled={isSaving || !amount.trim()}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#06131D] px-5 py-2.5 font-body text-sm font-semibold text-[#F3E5AB] transition hover:bg-[#0B1E28] disabled:opacity-40"
                >
                  <FiPlus />{" "}
                  {isSaving ? "Recording..." : "Record payment & create receipt"}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
