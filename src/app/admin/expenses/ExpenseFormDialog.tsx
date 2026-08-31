"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FiPaperclip, FiTrash2, FiX } from "react-icons/fi";
import { createClient } from "@/lib/supabase/client";
import { PAYMENT_METHODS, type PaymentMethod } from "@/lib/finance";
import {
  MAX_RECEIPT_BYTES,
  RECEIPT_MIME_TYPES,
  receiptFileName,
  receiptStoragePath,
  toDateInput,
  type ExpenseCategory,
  type ExpenseDraft,
  type ExpenseRecord,
  type Trip,
} from "@/lib/expenses";
import { formatRupees, paiseToInputValue, parsePaise } from "@/lib/money";
import { useToast } from "../../components/ui/toast/useToast";

/**
 * Create or edit one expense.
 *
 * Follows CreatePackageDialog: a plain fixed overlay rather than a headless
 * component, Escape to close, and state reset every time it opens so a
 * cancelled attempt leaves nothing behind.
 *
 * The receipt is uploaded as soon as it is chosen rather than on save. That
 * costs an orphan file when someone uploads and then cancels — invisible, and
 * cheap — and buys the guarantee that a saved expense's receipt_path always
 * points at a file that exists.
 */

const FIELD =
  "w-full rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 font-body text-sm text-[#06131D] outline-none transition focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20";

const LABEL =
  "mb-1.5 block font-body text-xs font-semibold uppercase tracking-[0.12em] text-[#526168]";

export default function ExpenseFormDialog({
  open,
  expense,
  categories,
  trips,
  onClose,
  onSaved,
}: {
  open: boolean;
  /** Null creates; a record edits it. */
  expense: ExpenseRecord | null;
  categories: ExpenseCategory[];
  trips: Trip[];
  onClose: () => void;
  onSaved: (draft: ExpenseDraft) => Promise<boolean>;
}) {
  const toast = useToast();
  const [supabase] = useState(createClient);

  const [spentOn, setSpentOn] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [tripId, setTripId] = useState("");
  const [vendor, setVendor] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [originalAmount, setOriginalAmount] = useState("");
  const [fxRate, setFxRate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("bank");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [receiptPath, setReceiptPath] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditing = Boolean(expense);
  const activeCategories = useMemo(
    () => categories.filter((c) => c.is_active || c.id === expense?.category_id),
    [categories, expense],
  );

  useEffect(() => {
    if (!open) return;
    setSpentOn(expense?.spent_on ?? toDateInput(new Date()));
    setCategoryId(expense?.category_id ?? activeCategories[0]?.id ?? "");
    setTripId(expense?.trip_id ?? "");
    setVendor(expense?.vendor ?? "");
    setDescription(expense?.description ?? "");
    setAmount(expense ? paiseToInputValue(expense.amount_paise) : "");
    setCurrency(expense?.original_currency ?? "INR");
    setOriginalAmount(
      expense?.original_amount_minor
        ? paiseToInputValue(expense.original_amount_minor)
        : "",
    );
    setFxRate(expense?.fx_rate ? String(expense.fx_rate) : "");
    setPaymentMethod(expense?.payment_method ?? "bank");
    setReference(expense?.reference ?? "");
    setNotes(expense?.notes ?? "");
    setReceiptPath(expense?.receipt_path ?? "");
    setError("");
    setIsSaving(false);
    setIsUploading(false);
    // activeCategories is derived from props that only change when the list
    // reloads; re-running this on that would clobber a half-typed form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, expense]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSaving && !isUploading) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, isSaving, isUploading]);

  if (!open) return null;

  const isForeign = currency !== "INR";
  const amountPaise = parsePaise(amount);
  const originalMinor = isForeign ? parsePaise(originalAmount) : null;
  const parsedFx = isForeign ? Number(fxRate) : null;

  async function uploadReceipt(file: File) {
    if (!supabase) return;
    if (!RECEIPT_MIME_TYPES.includes(file.type)) {
      setError(`"${file.name}" must be a JPG, PNG, WebP or PDF.`);
      return;
    }
    if (file.size > MAX_RECEIPT_BYTES) {
      setError(`"${file.name}" is larger than 8 MB.`);
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setError("Please sign in again before uploading.");
      return;
    }

    setIsUploading(true);
    setError("");
    const path = receiptStoragePath(userData.user.id, spentOn, file);
    const { error: uploadError } = await supabase.storage
      .from("expense-receipts")
      .upload(path, file, { contentType: file.type, upsert: false });
    setIsUploading(false);

    if (uploadError) {
      setError(uploadError.message);
      return;
    }
    setReceiptPath(path);
    toast.success("Receipt attached.");
  }

  /**
   * Removes the attachment from this expense. The file itself is left in the
   * bucket: an admin clearing a receipt is usually about to attach the right
   * one, and deleting immediately would make a mis-click unrecoverable. Orphans
   * are cleaned up when the expense itself is deleted.
   */
  function clearReceipt() {
    setReceiptPath("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function submit() {
    if (!categoryId) return setError("Choose a category.");
    if (amountPaise === null || amountPaise <= 0) {
      return setError("Enter an amount greater than zero.");
    }
    if (!spentOn) return setError("Enter the date this was spent.");

    // The database enforces this pairing too (expenses_fx_pair); catching it
    // here means a clear message instead of a constraint name.
    if (isForeign) {
      if (originalMinor === null || originalMinor <= 0) {
        return setError(`Enter the amount actually paid in ${currency}.`);
      }
      if (!parsedFx || !Number.isFinite(parsedFx) || parsedFx <= 0) {
        return setError("Enter the exchange rate used.");
      }
    }

    setIsSaving(true);
    setError("");
    const ok = await onSaved({
      id: expense?.id,
      spent_on: spentOn,
      category_id: categoryId,
      trip_id: tripId || null,
      vendor: vendor.trim(),
      description: description.trim(),
      amount_paise: amountPaise,
      original_currency: currency,
      original_amount_minor: isForeign ? originalMinor : null,
      fx_rate: isForeign ? parsedFx : null,
      payment_method: paymentMethod,
      reference: reference.trim(),
      receipt_path: receiptPath,
      notes: notes.trim(),
    });
    setIsSaving(false);
    if (ok) onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[#06131D]/60 px-5 py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="expense-dialog-heading"
    >
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3
              id="expense-dialog-heading"
              className="font-display text-3xl font-semibold text-[#06131D]"
            >
              {isEditing ? "Edit expense" : "Record an expense"}
            </h3>
            <p className="mt-1.5 font-body text-sm text-[#526168]">
              {isEditing
                ? "Changes are saved against the same record."
                : "Amounts are in rupees. Attach the bill if you have it."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg border border-stone-200 text-[#526168] transition hover:bg-stone-50"
          >
            <FiX />
          </button>
        </div>

        {error && (
          <p
            role="alert"
            className="mt-5 rounded-lg bg-red-50 p-3 font-body text-sm text-red-700"
          >
            {error}
          </p>
        )}

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={LABEL}>Date</span>
            <input
              type="date"
              value={spentOn}
              onChange={(event) => setSpentOn(event.target.value)}
              className={FIELD}
            />
          </label>

          <label className="block">
            <span className={LABEL}>Amount (₹)</span>
            <input
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="84000"
              className={FIELD}
            />
            {amountPaise !== null && amountPaise > 0 && (
              <span className="mt-1 block font-body text-xs text-[#526168]">
                {formatRupees(amountPaise)}
              </span>
            )}
          </label>

          <label className="block">
            <span className={LABEL}>Category</span>
            <select
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              className={FIELD}
            >
              {!activeCategories.length && <option value="">No categories</option>}
              {activeCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className={LABEL}>Paid by</span>
            <select
              value={paymentMethod}
              onChange={(event) =>
                setPaymentMethod(event.target.value as PaymentMethod)
              }
              className={FIELD}
            >
              {PAYMENT_METHODS.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className={LABEL}>Vendor</span>
            <input
              value={vendor}
              onChange={(event) => setVendor(event.target.value)}
              placeholder="Al Safwah Hotel"
              maxLength={200}
              className={FIELD}
            />
          </label>

          <label className="block">
            <span className={LABEL}>Bill / reference no.</span>
            <input
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder="INV-2291"
              maxLength={120}
              className={FIELD}
            />
          </label>

          <label className="block sm:col-span-2">
            <span className={LABEL}>Description</span>
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="12 rooms, 4 nights"
              maxLength={500}
              className={FIELD}
            />
          </label>

          {/* Trips have no editor until Phase 4, so this only appears once
              there is something to pick. */}
          {trips.length > 0 && (
            <label className="block sm:col-span-2">
              <span className={LABEL}>Departure (optional)</span>
              <select
                value={tripId}
                onChange={(event) => setTripId(event.target.value)}
                className={FIELD}
              >
                <option value="">Not tied to a departure</option>
                {trips.map((trip) => (
                  <option key={trip.id} value={trip.id}>
                    {trip.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        {/* Foreign currency. Makkah and Madinah hotels bill in SAR, and the
            rupee figure above is what the books need — this records what was
            actually paid so the two can be reconciled later. */}
        <details
          className="mt-5 rounded-xl border border-stone-200 p-4"
          open={isForeign}
        >
          <summary className="cursor-pointer font-body text-sm font-semibold text-[#06131D]">
            Paid in another currency
          </summary>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span className={LABEL}>Currency</span>
              <select
                value={currency}
                onChange={(event) => setCurrency(event.target.value)}
                className={FIELD}
              >
                <option value="INR">INR (none)</option>
                <option value="SAR">SAR</option>
                <option value="USD">USD</option>
                <option value="AED">AED</option>
              </select>
            </label>
            <label className="block">
              <span className={LABEL}>Amount paid</span>
              <input
                inputMode="decimal"
                value={originalAmount}
                onChange={(event) => setOriginalAmount(event.target.value)}
                disabled={!isForeign}
                placeholder="3600"
                className={`${FIELD} disabled:bg-stone-50 disabled:text-stone-400`}
              />
            </label>
            <label className="block">
              <span className={LABEL}>Rate used</span>
              <input
                inputMode="decimal"
                value={fxRate}
                onChange={(event) => setFxRate(event.target.value)}
                disabled={!isForeign}
                placeholder="23.35"
                className={`${FIELD} disabled:bg-stone-50 disabled:text-stone-400`}
              />
            </label>
          </div>
        </details>

        {/* Receipt */}
        <div className="mt-5">
          <span className={LABEL}>Receipt</span>
          {receiptPath ? (
            <div className="flex items-center gap-3 rounded-lg border border-stone-200 bg-stone-50 px-3.5 py-2.5">
              <FiPaperclip className="flex-shrink-0 text-[#526168]" />
              <span className="min-w-0 flex-1 truncate font-body text-sm text-[#06131D]">
                {receiptFileName(receiptPath)}
              </span>
              <button
                type="button"
                onClick={clearReceipt}
                className="flex-shrink-0 rounded-lg p-2 text-[#526168] transition hover:bg-white hover:text-red-600"
                aria-label="Remove receipt"
              >
                <FiTrash2 />
              </button>
            </div>
          ) : (
            <input
              ref={fileInputRef}
              type="file"
              accept={RECEIPT_MIME_TYPES.join(",")}
              disabled={isUploading}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void uploadReceipt(file);
              }}
              className="w-full rounded-lg border border-dashed border-stone-300 px-3.5 py-2.5 font-body text-sm text-[#526168] file:mr-3 file:rounded-md file:border-0 file:bg-[#06131D] file:px-3 file:py-1.5 file:font-body file:text-xs file:font-semibold file:text-[#F3E5AB]"
            />
          )}
          {isUploading && (
            <p className="mt-1.5 font-body text-xs text-[#526168]">
              Uploading...
            </p>
          )}
        </div>

        <label className="mt-5 block">
          <span className={LABEL}>Notes</span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={2}
            maxLength={2000}
            className={`${FIELD} resize-y`}
          />
        </label>

        <div className="mt-7 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-stone-200 px-5 py-2.5 font-body text-sm font-semibold text-[#526168] transition hover:bg-stone-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={isSaving || isUploading}
            className="rounded-lg bg-[#D4AF37] px-5 py-2.5 font-body text-sm font-bold text-[#06131D] transition hover:bg-[#F3E5AB] disabled:opacity-60"
          >
            {isSaving
              ? "Saving..."
              : isEditing
                ? "Save changes"
                : "Record expense"}
          </button>
        </div>
      </div>
    </div>
  );
}
