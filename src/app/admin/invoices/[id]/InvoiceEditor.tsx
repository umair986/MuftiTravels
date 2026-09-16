"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FiArrowLeft,
  FiCheckCircle,
  FiCopy,
  FiDownload,
  FiEye,
  FiPlus,
  FiSave,
  FiSlash,
  FiTrash2,
} from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";
import { createClient } from "@/lib/supabase/client";
import {
  INVOICE_STATUS_STYLES,
  TAX_MODES,
  computeInvoiceTotals,
  computeLineTotal,
  formatTaxRate,
  invoiceStatusLabel,
  resolveTaxMode,
  type TaxMode,
  type Trip,
} from "@/lib/finance";
import {
  GST_STATE_CODES,
  INVOICE_LINK_TTL_SECONDS,
  blankItem,
  invoicePdfPath,
  newId,
  receiptPdfPath,
  stateNameForCode,
  whatsappInvoiceUrl,
  whatsappReceiptUrl,
  type BusinessProfileRecord,
  type EditableItem,
  type InvoiceItemRecord,
  type InvoicePayment,
  type InvoiceRecord,
  type LinePreset,
} from "@/lib/invoices";
import {
  formatRupees,
  paiseToInputValue,
  paiseToWords,
  parsePaise,
} from "@/lib/money";
import {
  invoicePolicyLists,
  type InvoicePolicyList,
  type SiteContentList,
} from "@/lib/siteContent";
import { invoiceFileName, renderInvoicePdf } from "@/lib/pdf/renderInvoice";
import { useToast } from "../../../components/ui/toast/useToast";
import AdminShell from "../../AdminShell";
import LinePresetPicker from "../LinePresetPicker";
import PaymentsPanel from "./PaymentsPanel";

/**
 * Draft editor and issued-invoice viewer.
 *
 * Every field is a plain input. There is no package picker and nothing here
 * reads the catalogue — see Decision 5 in
 * docs/finance-expenses-and-invoicing.md.
 *
 * Once issued the whole form goes read-only, because it genuinely is: the
 * guard_issued_invoice trigger in migration 017 rejects any change to the
 * number, amounts or customer block. Rendering editable fields that the
 * database would refuse to save would be a lie.
 */

const FIELD =
  "w-full rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 font-body text-sm text-[#06131D] outline-none transition focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 disabled:bg-stone-50 disabled:text-[#526168]";

const LABEL =
  "mb-1.5 block font-body text-xs font-semibold uppercase tracking-[0.12em] text-[#526168]";

export default function InvoiceEditor({ invoiceId }: { invoiceId: string }) {
  const [supabase] = useState(createClient);
  const toast = useToast();
  const router = useRouter();

  const [email, setEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [invoice, setInvoice] = useState<InvoiceRecord | null>(null);
  const [business, setBusiness] = useState<BusinessProfileRecord | null>(null);
  const [presets, setPresets] = useState<LinePreset[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [tripId, setTripId] = useState("");

  // Customer block
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerStateCode, setCustomerStateCode] = useState("");
  const [customerGstin, setCustomerGstin] = useState("");

  // Document
  const [issueDate, setIssueDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [items, setItems] = useState<EditableItem[]>([blankItem()]);
  const [discount, setDiscount] = useState("");
  const [taxMode, setTaxMode] = useState<TaxMode>("none");
  const [taxRatePercent, setTaxRatePercent] = useState("0");
  const [notes, setNotes] = useState("");
  const [showPolicies, setShowPolicies] = useState(true);
  const [paidInFull, setPaidInFull] = useState(false);
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);
  const [contentLists, setContentLists] = useState<SiteContentList[]>([]);

  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isIssuing, setIsIssuing] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isSavingTrip, setIsSavingTrip] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [paidPaise, setPaidPaise] = useState(0);

  const isDraft = invoice?.status === "draft";
  const isIssued = invoice?.status === "issued";
  const isCancelled = invoice?.status === "cancelled";

  const balancePaise = (invoice?.total_paise ?? 0) - paidPaise;
  // Nothing owed, and something actually paid — a zero-total invoice is not a
  // receipt worth stamping.
  const isSettled = paidPaise > 0 && balancePaise <= 0;

  /* -------------------------------------------------------------- loading */

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

    const [
      { data: invoiceRow, error: invoiceError },
      { data: itemRows },
      { data: businessRow },
      { data: presetRows },
      { data: tripRows },
      { data: balanceRow },
      { data: contentRows },
    ] = await Promise.all([
      supabase.from("invoices").select("*").eq("id", invoiceId).maybeSingle(),
      supabase
        .from("invoice_items")
        .select("*")
        .eq("invoice_id", invoiceId)
        .order("sort_order"),
      supabase.from("business_profile").select("*").eq("id", 1).maybeSingle(),
      supabase
        .from("invoice_line_presets")
        .select("*")
        .eq("is_active", true)
        .order("sort_order")
        .order("label"),
      supabase
        .from("trips")
        .select("id, name, category, departure_date, status")
        .order("departure_date", { ascending: false, nullsFirst: false }),
      // Summed in the database rather than here, so this screen and the
      // receivables list can never disagree about what is still owed.
      supabase
        .from("invoice_balances")
        .select("paid_paise, balance_paise")
        .eq("id", invoiceId)
        .maybeSingle(),
      // The live policies, for a draft's preview. An issued invoice ignores
      // these and prints the snapshot it froze at issue.
      supabase
        .from("site_content_lists")
        .select("*")
        .in("section", ["policies", "notes"])
        .order("sort_order"),
    ]);

    if (invoiceError || !invoiceRow) {
      setError(invoiceError?.message ?? "That invoice no longer exists.");
      setIsLoading(false);
      return;
    }

    const record = invoiceRow as InvoiceRecord;
    setInvoice(record);
    setPaidPaise(
      (balanceRow as { paid_paise: number } | null)?.paid_paise ?? 0,
    );
    setContentLists((contentRows as SiteContentList[]) ?? []);
    setBusiness((businessRow as BusinessProfileRecord) ?? null);
    setPresets((presetRows as LinePreset[]) ?? []);
    setTrips((tripRows as Trip[]) ?? []);
    setTripId(record.trip_id ?? "");

    setCustomerName(record.customer_name);
    setCustomerPhone(record.customer_phone);
    setCustomerEmail(record.customer_email);
    setCustomerAddress(record.customer_address);
    setCustomerStateCode(record.customer_state_code);
    setCustomerGstin(record.customer_gstin);
    setIssueDate(record.issue_date ?? todayInput());
    setDueDate(record.due_date ?? "");
    setDiscount(
      record.discount_paise ? paiseToInputValue(record.discount_paise) : "",
    );
    setTaxMode(record.tax_mode);
    setTaxRatePercent(String(record.tax_rate_bp / 100));
    setNotes(record.notes);
    // Defaults on, including for rows that predate migration 021.
    setShowPolicies(record.show_policies !== false);
    setPaidInFull(record.paid_in_full === true);

    const loaded = ((itemRows as InvoiceItemRecord[]) ?? []).map((item) => ({
      id: item.id,
      description: item.description,
      sac_code: item.sac_code,
      quantity: String(Number(item.quantity)),
      unitPrice: paiseToInputValue(item.unit_price_paise),
    }));
    setItems(loaded.length ? loaded : [blankItem()]);

    setIsDirty(false);
    setIsLoading(false);
  }, [supabase, invoiceId]);

  useEffect(() => {
    void load();
  }, [load]);

  // A blob URL is a live handle into memory; without this it leaks on every
  // re-preview and outlives the page.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  /* --------------------------------------------------------------- totals */

  const parsedItems = useMemo(
    () =>
      items.map((item) => ({
        quantity: Number(item.quantity) || 0,
        unitPricePaise: parsePaise(item.unitPrice) ?? 0,
      })),
    [items],
  );

  const taxRateBp = Math.round((Number(taxRatePercent) || 0) * 100);

  const totals = useMemo(
    () =>
      computeInvoiceTotals({
        items: parsedItems,
        discountPaise: parsePaise(discount) ?? 0,
        taxMode,
        taxRateBp,
      }),
    [parsedItems, discount, taxMode, taxRateBp],
  );

  /**
   * The policies this invoice prints.
   *
   * An issued invoice prints the snapshot it froze, and only that — editing
   * the cancellation policy in the dashboard must not rewrite the terms
   * attached to a bill somebody is already disputing. A draft has no snapshot
   * yet, so it previews the live lists, which is precisely what issuing is
   * about to capture.
   */
  const resolvePolicies = useCallback(
    (record: InvoiceRecord): InvoicePolicyList[] => {
      if (record.show_policies === false) return [];
      // The fallback also covers invoices issued before migration 021, which
      // have no snapshot to print. Current text beats no text at all.
      return record.policy_snapshot?.length
        ? record.policy_snapshot
        : invoicePolicyLists(contentLists);
    },
    [contentLists],
  );

  /** What the preview and the toggle's summary below describe. */
  const policyLists: InvoicePolicyList[] = useMemo(
    () =>
      invoice
        ? resolvePolicies({ ...invoice, show_policies: showPolicies })
        : [],
    [invoice, showPolicies, resolvePolicies],
  );

  /**
   * Intra-state or inter-state is decided from the two state codes rather than
   * chosen by hand. The select stays editable for the cases the rule does not
   * cover, but it defaults correctly the moment a place of supply is entered.
   */
  useEffect(() => {
    if (!isDraft || !business) return;
    if (business.default_tax_mode === "none") return;
    const resolved = resolveTaxMode(
      business.state_code,
      customerStateCode,
      true,
    );
    if (resolved !== "none") setTaxMode(resolved);
  }, [customerStateCode, business, isDraft]);

  function touch() {
    setIsDirty(true);
  }

  function updateItem(id: string, patch: Partial<EditableItem>) {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
    touch();
  }

  /* --------------------------------------------------------------- writes */

  const buildInvoicePatch = useCallback(
    () => ({
      customer_name: customerName.trim(),
      customer_phone: customerPhone.trim(),
      customer_email: customerEmail.trim(),
      customer_address: customerAddress.trim(),
      customer_state: stateNameForCode(customerStateCode),
      customer_state_code: customerStateCode,
      customer_gstin: customerGstin.trim(),
      issue_date: issueDate || null,
      due_date: dueDate || null,
      subtotal_paise: totals.subtotalPaise,
      discount_paise: totals.discountPaise,
      taxable_paise: totals.taxablePaise,
      tax_mode: taxMode,
      tax_rate_bp: taxMode === "none" ? 0 : taxRateBp,
      cgst_paise: totals.cgstPaise,
      sgst_paise: totals.sgstPaise,
      igst_paise: totals.igstPaise,
      round_off_paise: totals.roundOffPaise,
      total_paise: totals.totalPaise,
      amount_in_words: paiseToWords(totals.totalPaise),
      notes: notes.trim(),
      // Read by issue_invoice() to decide whether to take a snapshot at all.
      // The snapshot itself is never written from here.
      show_policies: showPolicies,
      // What the PDF states about payment. Allowed to change after issue —
      // see migration 022 — so `markPaid` below writes it on its own too.
      paid_in_full: paidInFull,
      // A reporting tag, not a link: nothing it points at reaches the PDF.
      // Allowed to change after issue, because attributing a bill to the batch
      // it belongs to is bookkeeping, not an edit to the document.
      trip_id: tripId || null,
    }),
    [
      customerName,
      customerPhone,
      customerEmail,
      customerAddress,
      customerStateCode,
      customerGstin,
      issueDate,
      dueDate,
      totals,
      taxMode,
      taxRateBp,
      notes,
      showPolicies,
      paidInFull,
      tripId,
    ],
  );

  /**
   * Saves the invoice and its lines.
   *
   * Lines are upserted by id and then the removed ones deleted, rather than
   * "delete everything and re-insert". The delete-first version loses the whole
   * invoice if the insert half fails, and there is no client-side transaction
   * to protect it — which is why EditableItem carries an id from the moment it
   * is created rather than waiting for the database to assign one.
   */
  const save = useCallback(async (): Promise<boolean> => {
    if (!supabase || !invoice) return false;

    const usable = items.filter((item) => item.description.trim());
    if (!usable.length) {
      setError("Add at least one line with a description.");
      return false;
    }

    setIsSaving(true);
    setError("");

    const { error: invoiceError } = await supabase
      .from("invoices")
      .update(buildInvoicePatch())
      .eq("id", invoice.id);

    if (invoiceError) {
      setIsSaving(false);
      toast.error("Could not save this invoice.", {
        description: invoiceError.message,
      });
      return false;
    }

    const rows = usable.map((item, index) => {
      const quantity = Number(item.quantity) || 0;
      const unitPricePaise = parsePaise(item.unitPrice) ?? 0;
      return {
        id: item.id,
        invoice_id: invoice.id,
        description: item.description.trim(),
        sac_code: item.sac_code.trim(),
        quantity,
        unit_price_paise: unitPricePaise,
        line_total_paise: computeLineTotal(quantity, unitPricePaise),
        sort_order: index * 10,
      };
    });

    const { error: itemsError } = await supabase
      .from("invoice_items")
      .upsert(rows, { onConflict: "id" });

    if (itemsError) {
      setIsSaving(false);
      toast.error("Could not save the invoice lines.", {
        description: itemsError.message,
      });
      return false;
    }

    // Only now remove what the admin actually deleted.
    const keptIds = rows.map((row) => row.id);
    const { error: pruneError } = await supabase
      .from("invoice_items")
      .delete()
      .eq("invoice_id", invoice.id)
      .not("id", "in", `(${keptIds.join(",")})`);

    setIsSaving(false);
    if (pruneError) {
      toast.error("Saved, but an old line could not be removed.", {
        description: pruneError.message,
      });
    }

    setIsDirty(false);
    void load();
    return true;
  }, [supabase, invoice, items, buildInvoicePatch, toast, load]);

  /**
   * Generate the PDF and store it. The file written here IS the invoice from
   * this point on — re-rendering it in six months would pick up a new logo or
   * address and quietly disagree with the copy the customer holds.
   */
  const generateAndStorePdf = useCallback(
    async (record: InvoiceRecord, rows: InvoiceItemRecord[]) => {
      if (!supabase || !business || !record.number) return false;

      const blob = await renderInvoicePdf({
        invoice: record,
        items: rows,
        business,
        // From the record, not from the memo above: this runs immediately
        // after issue(), before `invoice` state has caught up with the row
        // that issue_invoice() just wrote the snapshot onto.
        policies: resolvePolicies(record),
      });
      // The paid state is part of the path: the bucket has no update policy,
      // so marking an issued invoice paid writes a second file beside the
      // first rather than rewriting the one the customer already has.
      const path = invoicePdfPath(
        record.id,
        record.number,
        record.paid_in_full,
      );

      const { error: uploadError } = await supabase.storage
        .from("invoices")
        .upload(path, blob, { contentType: "application/pdf", upsert: false });

      // Already there means this exact document — same invoice, same paid
      // state — was stored before, which is the normal case when the Paid tick
      // is toggled back and forth. The existing file IS the answer, so point
      // at it rather than reporting a failure. Anything else is real.
      const alreadyThere =
        uploadError &&
        /exists|duplicate|409/i.test(
          `${uploadError.message} ${(uploadError as { statusCode?: string }).statusCode ?? ""}`,
        );

      if (uploadError && !alreadyThere) return false;

      const { error: pathError } = await supabase
        .from("invoices")
        .update({ pdf_path: path })
        .eq("id", record.id);

      return !pathError;
    },
    [supabase, business, resolvePolicies],
  );

  /**
   * Tick or untick Paid on an issued invoice.
   *
   * Separate from save(), which sends the whole patch — most of which the
   * guard trigger would refuse on an issued row. This writes the one column
   * that is allowed to move after issue, then rebuilds the PDF, because the
   * stored file is the document and a flag nobody can see on it is worth
   * nothing.
   */
  async function markPaid(next: boolean) {
    if (!supabase || !invoice) return;
    setIsMarkingPaid(true);
    setPaidInFull(next);

    const { error: updateError } = await supabase
      .from("invoices")
      .update({ paid_in_full: next })
      .eq("id", invoice.id);

    if (updateError) {
      setPaidInFull(!next);
      setIsMarkingPaid(false);
      toast.error("Could not update the payment status.", {
        description: updateError.message,
      });
      return;
    }

    const stored = await generateAndStorePdf(
      { ...invoice, paid_in_full: next },
      await fetchItems(invoice.id),
    );

    setIsMarkingPaid(false);
    await load();

    if (stored) {
      toast.success(
        next
          ? "Marked paid. The invoice PDF now says no dues."
          : "Marked pending. The invoice PDF now shows the amount due.",
      );
    } else {
      toast.error("Status saved, but the PDF could not be rebuilt.", {
        description: "Use “Store PDF” to try again.",
      });
    }
  }

  async function fetchItems(id: string): Promise<InvoiceItemRecord[]> {
    if (!supabase) return [];
    const { data } = await supabase
      .from("invoice_items")
      .select("*")
      .eq("invoice_id", id)
      .order("sort_order");
    return (data as InvoiceItemRecord[]) ?? [];
  }

  /**
   * Issue: allocate the number, freeze the document, store the PDF.
   *
   * The number comes from the issue_invoice() function rather than from here,
   * because two admins pressing this at the same instant must not receive the
   * same one. That is a row lock in the database, not something a browser can
   * arrange.
   */
  async function issue() {
    if (!supabase || !invoice) return;
    if (!customerName.trim()) {
      setError("Enter the customer's name before issuing.");
      return;
    }

    setIsIssuing(true);
    setError("");

    const saved = await save();
    if (!saved) {
      setIsIssuing(false);
      return;
    }

    const { data: number, error: issueError } = await supabase.rpc(
      "issue_invoice",
      { p_invoice: invoice.id, p_issue_date: issueDate || todayInput() },
    );

    if (issueError) {
      setIsIssuing(false);
      toast.error("Could not issue this invoice.", {
        description: issueError.message,
      });
      return;
    }

    const { data: issuedRow } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", invoice.id)
      .maybeSingle();

    const record = (issuedRow as InvoiceRecord) ?? null;
    let pdfStored = false;
    if (record) {
      pdfStored = await generateAndStorePdf(
        record,
        await fetchItems(record.id),
      );
    }

    setIsIssuing(false);
    await load();

    // Issuing is irreversible and the number is already burned, so a failed
    // upload is reported as exactly that rather than as a failed issue — the
    // "Store PDF" button below retries it.
    if (pdfStored) {
      toast.success(`Issued as ${number}.`);
    } else {
      toast.error(`Issued as ${number}, but the PDF could not be stored.`, {
        description: "Use “Store PDF” to try again.",
      });
    }
  }

  /** Retry for an issued invoice whose PDF upload failed. */
  async function storePdf() {
    if (!invoice) return;
    setIsRendering(true);
    const ok = await generateAndStorePdf(invoice, await fetchItems(invoice.id));
    setIsRendering(false);
    if (ok) {
      toast.success("PDF stored.");
      void load();
    } else {
      toast.error("Could not store the PDF.");
    }
  }

  async function downloadPdf() {
    if (!invoice || !business) return;
    setIsRendering(true);

    // An issued invoice is served from storage, never re-rendered: the stored
    // file is the document the customer received.
    if (invoice.pdf_path && supabase) {
      const { data } = await supabase.storage
        .from("invoices")
        .createSignedUrl(invoice.pdf_path, 60);
      if (data?.signedUrl) {
        setIsRendering(false);
        window.open(data.signedUrl, "_blank", "noopener,noreferrer");
        return;
      }
    }

    const blob = await renderInvoicePdf({
      invoice,
      items: await fetchItems(invoice.id),
      business,
      policies: resolvePolicies(invoice),
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = invoiceFileName(invoice);
    link.click();
    URL.revokeObjectURL(url);
    setIsRendering(false);
  }

  async function preview() {
    if (!invoice || !business) return;
    setIsRendering(true);

    // Preview the working draft, so unsaved edits are visible before issuing.
    const draftRecord: InvoiceRecord = { ...invoice, ...buildInvoicePatch() };
    const draftItems: InvoiceItemRecord[] = items
      .filter((item) => item.description.trim())
      .map((item, index) => {
        const quantity = Number(item.quantity) || 0;
        const unitPricePaise = parsePaise(item.unitPrice) ?? 0;
        return {
          id: item.id,
          invoice_id: invoice.id,
          description: item.description.trim(),
          sac_code: item.sac_code.trim(),
          quantity,
          unit_price_paise: unitPricePaise,
          line_total_paise: computeLineTotal(quantity, unitPricePaise),
          sort_order: index * 10,
        };
      });

    try {
      const blob = await renderInvoicePdf({
        invoice: draftRecord,
        items: draftItems,
        business,
        policies: policyLists,
      });
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(blob));
    } catch (renderError) {
      toast.error("Could not render a preview.", {
        description:
          renderError instanceof Error ? renderError.message : undefined,
      });
    }
    setIsRendering(false);
  }

  /* ------------------------------------------------------------- receipt */

  /**
   * The receipt is the running account: the invoice plus every payment taken
   * so far, the balance, and a PAID stamp once that balance is zero.
   *
   * It is rendered fresh each time rather than stored on issue, because the
   * facts it states change with every payment. Payments are read from the
   * database here rather than taken from PaymentsPanel's state — a document a
   * customer keeps should never be built from what a screen happened to be
   * showing.
   */
  async function buildReceipt() {
    if (!supabase || !invoice || !business) return null;

    const { data, error: paymentsError } = await supabase
      .from("invoice_payments")
      .select("*")
      .eq("invoice_id", invoice.id)
      .order("paid_on", { ascending: true })
      .order("created_at", { ascending: true });

    if (paymentsError) {
      toast.error("Could not read the payments.", {
        description: paymentsError.message,
      });
      return null;
    }

    const payments = (data as InvoicePayment[]) ?? [];
    const paidPaise = payments.reduce((sum, row) => sum + row.amount_paise, 0);

    const blob = await renderInvoicePdf({
      invoice,
      items: await fetchItems(invoice.id),
      business,
      payments,
      policies: resolvePolicies(invoice),
      variant: "receipt",
    });

    return {
      blob,
      payments,
      paidPaise,
      balancePaise: invoice.total_paise - paidPaise,
    };
  }

  async function previewReceipt() {
    setIsRendering(true);
    try {
      const built = await buildReceipt();
      if (built) {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(URL.createObjectURL(built.blob));
      }
    } catch (renderError) {
      toast.error("Could not render the receipt.", {
        description:
          renderError instanceof Error ? renderError.message : undefined,
      });
    }
    setIsRendering(false);
  }

  async function downloadReceipt() {
    if (!invoice) return;
    setIsRendering(true);
    try {
      const built = await buildReceipt();
      if (built) {
        const url = URL.createObjectURL(built.blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = invoiceFileName(invoice, "receipt");
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch (renderError) {
      toast.error("Could not render the receipt.", {
        description:
          renderError instanceof Error ? renderError.message : undefined,
      });
    }
    setIsRendering(false);
  }

  /**
   * Upload the receipt and hand it over on WhatsApp.
   *
   * The path is derived from the payment set, so re-sending an unchanged
   * receipt finds the file already there — that 409 is the expected case, not a
   * failure, and the existing object is signed instead of being rewritten.
   */
  async function shareReceiptOnWhatsApp() {
    if (!supabase || !invoice?.number) return;
    setIsRendering(true);

    const built = await buildReceipt().catch((renderError: unknown) => {
      toast.error("Could not render the receipt.", {
        description:
          renderError instanceof Error ? renderError.message : undefined,
      });
      return null;
    });

    if (!built) {
      setIsRendering(false);
      return;
    }

    const path = receiptPdfPath(invoice.id, invoice.number, built.payments);
    const { error: uploadError } = await supabase.storage
      .from("invoices")
      .upload(path, built.blob, {
        contentType: "application/pdf",
        upsert: false,
      });

    // "already exists" means this exact receipt was shared before; anything
    // else is a real failure and must not be papered over with a stale link.
    const alreadyThere =
      uploadError &&
      /exists|duplicate|409/i.test(
        `${uploadError.message} ${(uploadError as { statusCode?: string }).statusCode ?? ""}`,
      );

    if (uploadError && !alreadyThere) {
      setIsRendering(false);
      toast.error("Could not store the receipt.", {
        description: uploadError.message,
      });
      return;
    }

    const { data, error: signError } = await supabase.storage
      .from("invoices")
      .createSignedUrl(path, INVOICE_LINK_TTL_SECONDS);

    setIsRendering(false);

    if (signError || !data?.signedUrl) {
      toast.error("Could not create a share link.", {
        description: signError?.message,
      });
      return;
    }

    const url = whatsappReceiptUrl({
      phone: invoice.customer_phone,
      name: invoice.customer_name,
      number: invoice.number,
      paidPaise: built.paidPaise,
      balancePaise: built.balancePaise,
      link: data.signedUrl,
    });

    if (!url) {
      toast.error("That customer has no usable phone number.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function shareOnWhatsApp() {
    if (!supabase || !invoice?.number || !invoice.pdf_path) return;
    const { data, error: signError } = await supabase.storage
      .from("invoices")
      .createSignedUrl(invoice.pdf_path, INVOICE_LINK_TTL_SECONDS);

    if (signError || !data?.signedUrl) {
      toast.error("Could not create a share link.", {
        description: signError?.message,
      });
      return;
    }

    const url = whatsappInvoiceUrl({
      phone: invoice.customer_phone,
      name: invoice.customer_name,
      number: invoice.number,
      totalPaise: invoice.total_paise,
      link: data.signedUrl,
    });

    if (!url) {
      toast.error("That customer has no usable phone number.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  /** Copies the whole document into a fresh unnumbered draft. */
  async function duplicate() {
    if (!supabase || !invoice) return;
    const { data: created, error: createError } = await supabase
      .from("invoices")
      .insert({
        ...buildInvoicePatch(),
        issue_date: null,
        due_date: null,
        status: "draft",
      })
      .select("id")
      .single();

    if (createError || !created) {
      toast.error("Could not duplicate this invoice.", {
        description: createError?.message,
      });
      return;
    }

    const rows = items
      .filter((item) => item.description.trim())
      .map((item, index) => {
        const quantity = Number(item.quantity) || 0;
        const unitPricePaise = parsePaise(item.unitPrice) ?? 0;
        return {
          id: newId(),
          invoice_id: created.id as string,
          description: item.description.trim(),
          sac_code: item.sac_code.trim(),
          quantity,
          unit_price_paise: unitPricePaise,
          line_total_paise: computeLineTotal(quantity, unitPricePaise),
          sort_order: index * 10,
        };
      });

    if (rows.length) await supabase.from("invoice_items").insert(rows);

    toast.success("Duplicated as a new draft.");
    router.push(`/admin/invoices/${created.id}`);
  }

  async function cancel() {
    if (!supabase || !invoice) return;
    setIsCancelling(true);
    const { error: cancelError } = await supabase
      .from("invoices")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancel_reason: cancelReason.trim(),
      })
      .eq("id", invoice.id);
    setIsCancelling(false);

    if (cancelError) {
      toast.error("Could not cancel this invoice.", {
        description: cancelError.message,
      });
      return;
    }
    toast.success("Invoice cancelled. The number stays used.");
    setCancelReason("");
    void load();
  }

  /**
   * Persists just the departure tag.
   *
   * Needed as its own action because the rest of the form is read-only once
   * issued, while this one field is not part of the document: nothing it points
   * at reaches the PDF, and guard_issued_invoice deliberately leaves trip_id
   * out of the columns it freezes. Attributing a bill to the batch it belongs
   * to is bookkeeping, and it usually happens after the bill has gone out.
   */
  async function saveTripTag() {
    if (!supabase || !invoice) return;
    setIsSavingTrip(true);
    const { error: tagError } = await supabase
      .from("invoices")
      .update({ trip_id: tripId || null })
      .eq("id", invoice.id);
    setIsSavingTrip(false);

    if (tagError) {
      toast.error("Could not set the departure.", {
        description: tagError.message,
      });
      return;
    }
    toast.success(
      tripId
        ? `Tagged to ${trips.find((trip) => trip.id === tripId)?.name ?? "departure"}.`
        : "Departure cleared.",
    );
    void load();
  }

  async function deleteDraft() {
    if (!supabase || !invoice) return;
    // .eq("status", "draft") as well as the id: this button is only rendered
    // for drafts, but a stale tab could still fire it at an invoice that has
    // since been issued. Migration 018 refuses that in the database too — this
    // just means the UI never asks for something it should not have.
    const { error: deleteError } = await supabase
      .from("invoices")
      .delete()
      .eq("id", invoice.id)
      .eq("status", "draft");
    if (deleteError) {
      toast.error("Could not delete this draft.", {
        description: deleteError.message,
      });
      return;
    }
    toast.success("Draft deleted.");
    router.push("/admin/invoices");
  }

  /* --------------------------------------------------------------- render */

  if (isLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#F3EFEA] font-body text-sm text-[#526168]">
        Loading invoice...
      </main>
    );
  }

  if (!email || !invoice) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#F3EFEA] px-6">
        <div className="text-center">
          <p className="font-body text-sm text-[#526168]">
            {error || "That invoice could not be opened."}
          </p>
          <Link
            href="/admin/invoices"
            className="mt-4 inline-block font-body text-sm font-semibold text-[#997A15] hover:underline"
          >
            Back to invoices
          </Link>
        </div>
      </main>
    );
  }

  const readOnly = !isDraft;
  const gstOn = taxMode !== "none";

  return (
    <AdminShell
      title={invoice.number ?? "Draft invoice"}
      description={
        isDraft
          ? "Nothing is numbered until you issue it."
          : `${invoiceStatusLabel(invoice.status)} · ${invoice.customer_name}`
      }
      email={email}
      headerAction={
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void preview()}
            disabled={isRendering}
            className="inline-flex items-center gap-2 rounded-lg border border-[#06131D]/15 px-4 py-2.5 font-body text-sm font-semibold text-[#06131D] transition hover:border-[#997A15] hover:text-[#997A15] disabled:opacity-50"
          >
            <FiEye /> {isRendering ? "Rendering..." : "Preview"}
          </button>
          {isDraft ? (
            <button
              type="button"
              onClick={() => void save()}
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-lg bg-[#06131D] px-4 py-2.5 font-body text-sm font-semibold text-[#F3E5AB] transition hover:bg-[#0B1E28] disabled:opacity-50"
            >
              <FiSave /> {isSaving ? "Saving..." : "Save draft"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void downloadPdf()}
              disabled={isRendering}
              className="inline-flex items-center gap-2 rounded-lg bg-[#06131D] px-4 py-2.5 font-body text-sm font-semibold text-[#F3E5AB] transition hover:bg-[#0B1E28] disabled:opacity-50"
            >
              <FiDownload /> PDF
            </button>
          )}
        </div>
      }
    >
      <Link
        href="/admin/invoices"
        className="mb-5 inline-flex items-center gap-2 font-body text-sm font-semibold text-[#526168] transition hover:text-[#997A15]"
      >
        <FiArrowLeft /> All invoices
      </Link>

      {error && (
        <p
          role="alert"
          className="mb-5 rounded-lg bg-red-50 p-3 font-body text-sm text-red-700"
        >
          {error}
        </p>
      )}

      {readOnly && (
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-stone-200 bg-white p-4">
          <span
            className={`rounded-full border px-3 py-1 font-body text-xs font-semibold ${
              INVOICE_STATUS_STYLES[invoice.status] ?? ""
            }`}
          >
            {invoiceStatusLabel(invoice.status)}
          </span>
          <p className="font-body text-sm text-[#526168]">
            {invoice.status === "cancelled"
              ? "Cancelled invoices keep their number, so the series stays unbroken."
              : "An issued invoice cannot be edited. Cancel and reissue, or raise a credit note."}
          </p>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-5">
          {/* ------------------------------------------------- customer --- */}
          <section className="rounded-2xl border border-stone-200 bg-white p-6">
            <h2 className="font-display text-2xl font-semibold text-[#06131D]">
              Bill to
            </h2>
            <p className="mt-1 font-body text-sm text-[#526168]">
              Typed here and stored on this invoice. Changing it later never
              changes an invoice already issued.
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className={LABEL}>Customer name</span>
                <input
                  value={customerName}
                  onChange={(event) => {
                    setCustomerName(event.target.value);
                    touch();
                  }}
                  disabled={readOnly}
                  maxLength={200}
                  className={FIELD}
                />
              </label>
              <label className="block">
                <span className={LABEL}>Phone</span>
                <input
                  value={customerPhone}
                  onChange={(event) => {
                    setCustomerPhone(event.target.value);
                    touch();
                  }}
                  disabled={readOnly}
                  maxLength={32}
                  className={FIELD}
                />
              </label>
              <label className="block">
                <span className={LABEL}>Email</span>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(event) => {
                    setCustomerEmail(event.target.value);
                    touch();
                  }}
                  disabled={readOnly}
                  maxLength={200}
                  className={FIELD}
                />
              </label>
              <label className="block sm:col-span-2">
                <span className={LABEL}>Address</span>
                <textarea
                  value={customerAddress}
                  onChange={(event) => {
                    setCustomerAddress(event.target.value);
                    touch();
                  }}
                  disabled={readOnly}
                  rows={2}
                  maxLength={500}
                  className={`${FIELD} resize-y`}
                />
              </label>
              <label className="block">
                <span className={LABEL}>Place of supply</span>
                <select
                  value={customerStateCode}
                  onChange={(event) => {
                    setCustomerStateCode(event.target.value);
                    touch();
                  }}
                  disabled={readOnly}
                  className={FIELD}
                >
                  <option value="">Not specified</option>
                  {GST_STATE_CODES.map((entry) => (
                    <option key={entry.code} value={entry.code}>
                      {entry.code} · {entry.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className={LABEL}>Customer GSTIN</span>
                <input
                  value={customerGstin}
                  onChange={(event) => {
                    setCustomerGstin(event.target.value.toUpperCase());
                    touch();
                  }}
                  disabled={readOnly}
                  maxLength={20}
                  className={FIELD}
                />
              </label>
            </div>
          </section>

          {/* ---------------------------------------------------- lines --- */}
          <section className="rounded-2xl border border-stone-200 bg-white p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl font-semibold text-[#06131D]">
                  Lines
                </h2>
                <p className="mt-1 font-body text-sm text-[#526168]">
                  Every line is free text. Nothing here is tied to a package.
                </p>
              </div>
              {!readOnly && (
                <LinePresetPicker
                  presets={presets}
                  onPick={(preset) => {
                    // Copied, not linked: from here it is ordinary text.
                    setItems((current) => [
                      ...current.filter(
                        (item) =>
                          item.description.trim() || item.unitPrice.trim(),
                      ),
                      {
                        id: newId(),
                        description: preset.description,
                        sac_code: preset.sac_code,
                        quantity: "1",
                        unitPrice: preset.default_unit_price_paise
                          ? paiseToInputValue(preset.default_unit_price_paise)
                          : "",
                      },
                    ]);
                    touch();
                  }}
                />
              )}
            </div>

            <div className="mt-5 space-y-3">
              {items.map((item, index) => {
                const quantity = Number(item.quantity) || 0;
                const unitPricePaise = parsePaise(item.unitPrice) ?? 0;
                const lineTotal = computeLineTotal(quantity, unitPricePaise);
                return (
                  <div
                    key={item.id}
                    className="rounded-xl border border-stone-200 p-3"
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-2.5 w-5 flex-shrink-0 font-body text-xs text-[#526168]">
                        {index + 1}
                      </span>
                      <textarea
                        value={item.description}
                        onChange={(event) =>
                          updateItem(item.id, {
                            description: event.target.value,
                          })
                        }
                        disabled={readOnly}
                        rows={2}
                        maxLength={500}
                        placeholder="Umrah package · 14 days · Deluxe"
                        className={`${FIELD} resize-y`}
                      />
                      {!readOnly && (
                        <button
                          type="button"
                          onClick={() => {
                            setItems((current) =>
                              current.length === 1
                                ? [blankItem()]
                                : current.filter(
                                    (candidate) => candidate.id !== item.id,
                                  ),
                            );
                            touch();
                          }}
                          aria-label={`Remove line ${index + 1}`}
                          className="mt-1 flex-shrink-0 rounded-lg p-2 text-[#526168] transition hover:bg-red-50 hover:text-red-600"
                        >
                          <FiTrash2 />
                        </button>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap items-end gap-3 pl-8">
                      <label className="w-24">
                        <span className={LABEL}>SAC</span>
                        <input
                          value={item.sac_code}
                          onChange={(event) =>
                            updateItem(item.id, {
                              sac_code: event.target.value,
                            })
                          }
                          disabled={readOnly}
                          maxLength={12}
                          placeholder="998555"
                          className={FIELD}
                        />
                      </label>
                      <label className="w-20">
                        <span className={LABEL}>Qty</span>
                        <input
                          inputMode="decimal"
                          value={item.quantity}
                          onChange={(event) =>
                            updateItem(item.id, {
                              quantity: event.target.value,
                            })
                          }
                          disabled={readOnly}
                          className={FIELD}
                        />
                      </label>
                      <label className="w-32">
                        <span className={LABEL}>Rate (₹)</span>
                        <input
                          inputMode="decimal"
                          value={item.unitPrice}
                          onChange={(event) =>
                            updateItem(item.id, {
                              unitPrice: event.target.value,
                            })
                          }
                          disabled={readOnly}
                          className={FIELD}
                        />
                      </label>
                      <p className="ml-auto font-body text-sm font-bold text-[#06131D]">
                        {formatRupees(lineTotal)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {!readOnly && (
              <button
                type="button"
                onClick={() => {
                  setItems((current) => [...current, blankItem()]);
                  touch();
                }}
                className="mt-4 inline-flex items-center gap-2 rounded-lg border border-dashed border-stone-300 px-4 py-2.5 font-body text-sm font-semibold text-[#526168] transition hover:border-[#D4AF37] hover:text-[#997A15]"
              >
                <FiPlus /> Add a line
              </button>
            )}
          </section>

          {/* ------------------------------------------------- notes ------- */}
          {/* The Terms textarea that used to sit beside this is gone. It held
              a sentence of payment terms that the policies annexure now says
              in full — two answers to one question on the same document. */}
          <section className="rounded-2xl border border-stone-200 bg-white p-6">
            <label className="block">
              <span className={LABEL}>Notes on this invoice</span>
              <textarea
                value={notes}
                onChange={(event) => {
                  setNotes(event.target.value);
                  touch();
                }}
                disabled={readOnly}
                rows={3}
                maxLength={2000}
                className={`${FIELD} resize-y`}
              />
            </label>

            {/* The policies are not typed here — they are the site's, edited
                once under Content and printed as an annexure. This only
                decides whether this particular bill carries them. */}
            <div className="mt-5 border-t border-stone-200 pt-5">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={showPolicies}
                  onChange={(event) => {
                    setShowPolicies(event.target.checked);
                    touch();
                  }}
                  disabled={readOnly}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-stone-300 text-[#997A15] focus:ring-[#D4AF37] disabled:opacity-50"
                />
                <span>
                  <span className="block font-body text-sm font-semibold text-[#06131D]">
                    Print policies and important notes
                  </span>
                  <span className="mt-1 block font-body text-xs text-[#526168]">
                    {showPolicies ? (
                      policyLists.length ? (
                        <>
                          {policyLists.length} list
                          {policyLists.length === 1 ? "" : "s"} on a separate
                          page:{" "}
                          {policyLists.map((list) => list.title).join(" · ")}.{" "}
                          {isDraft ? (
                            <>
                              The wording is frozen onto this invoice when it is
                              issued, so later edits under{" "}
                              <Link
                                href="/admin/content"
                                className="font-semibold text-[#997A15] underline decoration-dotted underline-offset-2"
                              >
                                Content
                              </Link>{" "}
                              cannot change it.
                            </>
                          ) : (
                            "Frozen as they read on the day this invoice was issued."
                          )}
                        </>
                      ) : (
                        <>
                          Nothing to print — no policies or important notes have
                          been added under{" "}
                          <Link
                            href="/admin/content"
                            className="font-semibold text-[#997A15] underline decoration-dotted underline-offset-2"
                          >
                            Content
                          </Link>
                          .
                        </>
                      )
                    ) : (
                      "Off. Worth leaving off for a standalone visa fee or a ticket reissue, where package terms do not apply."
                    )}
                  </span>
                </span>
              </label>
            </div>
          </section>
        </div>

        {/* ------------------------------------------------------ sidebar --- */}
        <div className="space-y-5">
          <section className="sticky top-24 space-y-5">
            <div className="rounded-2xl border border-stone-200 bg-white p-5">
              <h2 className="font-display text-xl font-semibold text-[#06131D]">
                Totals
              </h2>

              <div className="mt-4 space-y-3">
                <label className="block">
                  <span className={LABEL}>Invoice date</span>
                  <input
                    type="date"
                    value={issueDate}
                    onChange={(event) => {
                      setIssueDate(event.target.value);
                      touch();
                    }}
                    disabled={readOnly}
                    className={FIELD}
                  />
                </label>
                <label className="block">
                  <span className={LABEL}>Due date</span>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(event) => {
                      setDueDate(event.target.value);
                      touch();
                    }}
                    disabled={readOnly}
                    className={FIELD}
                  />
                </label>
                <label className="block">
                  <span className={LABEL}>Discount (₹)</span>
                  <input
                    inputMode="decimal"
                    value={discount}
                    onChange={(event) => {
                      setDiscount(event.target.value);
                      touch();
                    }}
                    disabled={readOnly}
                    className={FIELD}
                  />
                </label>
                <label className="block">
                  <span className={LABEL}>GST</span>
                  <select
                    value={taxMode}
                    onChange={(event) => {
                      setTaxMode(event.target.value as TaxMode);
                      touch();
                    }}
                    disabled={readOnly}
                    className={FIELD}
                  >
                    {TAX_MODES.map((mode) => (
                      <option key={mode.value} value={mode.value}>
                        {mode.label}
                      </option>
                    ))}
                  </select>
                </label>
                {trips.length > 0 && (
                  <label className="block">
                    <span className={LABEL}>Departure</span>
                    <select
                      value={tripId}
                      onChange={(event) => {
                        setTripId(event.target.value);
                        touch();
                      }}
                      className={FIELD}
                    >
                      <option value="">Not tied to a departure</option>
                      {trips.map((trip) => (
                        <option key={trip.id} value={trip.id}>
                          {trip.name}
                        </option>
                      ))}
                    </select>
                    {readOnly && tripId !== (invoice.trip_id ?? "") && (
                      <button
                        type="button"
                        onClick={() => void saveTripTag()}
                        disabled={isSavingTrip}
                        className="mt-2 w-full rounded-lg border border-[#D4AF37] px-3 py-2 font-body text-xs font-semibold text-[#997A15] transition hover:bg-[#FFFCF3] disabled:opacity-50"
                      >
                        {isSavingTrip ? "Saving..." : "Save departure"}
                      </button>
                    )}
                    <span className="mt-1 block font-body text-xs text-[#526168]">
                      A reporting tag only — it never appears on the invoice.
                    </span>
                  </label>
                )}
                {gstOn && (
                  <label className="block">
                    <span className={LABEL}>Rate (%)</span>
                    <input
                      inputMode="decimal"
                      value={taxRatePercent}
                      onChange={(event) => {
                        setTaxRatePercent(event.target.value);
                        touch();
                      }}
                      disabled={readOnly}
                      className={FIELD}
                    />
                  </label>
                )}
              </div>

              <dl className="mt-5 space-y-2 border-t border-stone-100 pt-4 font-body text-sm">
                <Row
                  label="Subtotal"
                  value={formatRupees(totals.subtotalPaise)}
                />
                {totals.discountPaise > 0 && (
                  <Row
                    label="Discount"
                    value={`- ${formatRupees(totals.discountPaise)}`}
                  />
                )}
                {gstOn && (
                  <Row
                    label="Taxable"
                    value={formatRupees(totals.taxablePaise)}
                  />
                )}
                {taxMode === "cgst_sgst" && (
                  <>
                    <Row
                      label={`CGST ${formatTaxRate(taxRateBp / 2)}`}
                      value={formatRupees(totals.cgstPaise)}
                    />
                    <Row
                      label={`SGST ${formatTaxRate(taxRateBp / 2)}`}
                      value={formatRupees(totals.sgstPaise)}
                    />
                  </>
                )}
                {taxMode === "igst" && (
                  <Row
                    label={`IGST ${formatTaxRate(taxRateBp)}`}
                    value={formatRupees(totals.igstPaise)}
                  />
                )}
                {totals.roundOffPaise !== 0 && (
                  <Row
                    label="Round off"
                    value={`${totals.roundOffPaise > 0 ? "+" : "-"} ${formatRupees(Math.abs(totals.roundOffPaise))}`}
                  />
                )}
                <div className="flex items-baseline justify-between border-t border-stone-200 pt-3">
                  <dt className="font-body text-sm font-semibold text-[#06131D]">
                    Total
                  </dt>
                  <dd className="font-display text-2xl font-semibold text-[#06131D]">
                    {formatRupees(totals.totalPaise, { trimZeroPaise: true })}
                  </dd>
                </div>
              </dl>

              <p className="mt-3 font-body text-xs text-[#526168]">
                {paiseToWords(totals.totalPaise)}
              </p>

              {/* Paid.
                  Stays enabled after issue, unlike every other field here —
                  the invoice goes out once the money has cleared, so this is
                  the one thing that is meant to change afterwards. Ticking it
                  on an issued invoice rebuilds the stored PDF, because a flag
                  nobody can see on the document is worth nothing. */}
              {!isCancelled && (
                <div className="mt-4 border-t border-stone-200 pt-4">
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={paidInFull}
                      onChange={(event) => {
                        const next = event.target.checked;
                        if (isDraft) {
                          setPaidInFull(next);
                          touch();
                        } else {
                          void markPaid(next);
                        }
                      }}
                      disabled={isMarkingPaid}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-stone-300 text-[#997A15] focus:ring-[#D4AF37] disabled:opacity-50"
                    />
                    <span>
                      <span className="block font-body text-sm font-semibold text-[#06131D]">
                        Paid
                      </span>
                      <span className="mt-1 block font-body text-xs text-[#526168]">
                        {isMarkingPaid
                          ? "Rebuilding the invoice PDF…"
                          : paidInFull
                            ? "The invoice prints a PAID stamp and “No dues. Paid in full.”"
                            : `The invoice prints “Payment pending — ${formatRupees(totals.totalPaise, { trimZeroPaise: true })}”.`}
                      </span>
                    </span>
                  </label>

                  {/* The inconsistency that started all this: a payment was
                      recorded, the receipt said PAID, the invoice said
                      nothing. The two answer different questions and are
                      allowed to differ while money is in transit — but never
                      silently. */}
                  {isIssued && paidInFull !== isSettled && (
                    <p className="mt-2 rounded-lg bg-[#FFFCF3] px-3 py-2 font-body text-xs text-[#997A15]">
                      {paidInFull
                        ? paidPaise === 0
                          ? "No payments are recorded below, so the receipt will still show the full amount due."
                          : `Payments below add up to ${formatRupees(paidPaise, { trimZeroPaise: true })} of ${formatRupees(invoice.total_paise, { trimZeroPaise: true })}, so the receipt will still show ${formatRupees(balancePaise, { trimZeroPaise: true })} outstanding.`
                        : "The payments below cover this invoice in full. Tick Paid so the invoice PDF says so too."}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Payments only exist once there is an obligation: a draft has
                not created one yet, a cancelled invoice no longer has one. */}
            {isIssued && (
              <PaymentsPanel
                invoiceId={invoice.id}
                totalPaise={invoice.total_paise}
                dueDate={invoice.due_date}
                onChanged={() => void load()}
              />
            )}

            {/* ------------------------------------------------- actions --- */}
            <div className="rounded-2xl border border-stone-200 bg-white p-5">
              {isDraft && (
                <>
                  <button
                    type="button"
                    onClick={() => void issue()}
                    disabled={isIssuing || isSaving}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#D4AF37] px-4 py-3 font-body text-sm font-bold text-[#06131D] transition hover:bg-[#F3E5AB] disabled:opacity-50"
                  >
                    <FiCheckCircle />{" "}
                    {isIssuing ? "Issuing..." : "Issue invoice"}
                  </button>
                  <p className="mt-2 font-body text-xs text-[#526168]">
                    This allocates the next number and locks the document. It
                    cannot be undone.
                  </p>
                </>
              )}

              {isIssued && !invoice.pdf_path && (
                <button
                  type="button"
                  onClick={() => void storePdf()}
                  disabled={isRendering}
                  className="mb-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#06131D] px-4 py-2.5 font-body text-sm font-semibold text-[#F3E5AB] disabled:opacity-50"
                >
                  {isRendering ? "Storing..." : "Store PDF"}
                </button>
              )}

              {isIssued && invoice.pdf_path && (
                <button
                  type="button"
                  onClick={() => void shareOnWhatsApp()}
                  className="mb-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] px-4 py-2.5 font-body text-sm font-bold text-white transition hover:bg-[#1FB855]"
                >
                  <FaWhatsapp /> Send on WhatsApp
                </button>
              )}

              {/* The receipt is a second document, not a reissue: the invoice
                  PDF above is frozen, this one moves with the payments. */}
              {isIssued && (
                <div className="mb-3 rounded-xl border border-stone-200 bg-[#FAF8F5] p-3">
                  <p className="font-body text-xs font-semibold uppercase tracking-[0.12em] text-[#526168]">
                    {isSettled ? "Receipt" : "Payment statement"}
                  </p>
                  <p className="mt-1 font-body text-xs text-[#526168]">
                    {isSettled
                      ? "Paid in full. The receipt is stamped PAID and states there are no dues."
                      : `Shows every payment taken and the ${formatRupees(balancePaise, { trimZeroPaise: true })} still due.`}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void previewReceipt()}
                      disabled={isRendering}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 font-body text-xs font-semibold text-[#06131D] transition hover:border-[#D4AF37] disabled:opacity-50"
                    >
                      <FiEye /> Preview
                    </button>
                    <button
                      type="button"
                      onClick={() => void downloadReceipt()}
                      disabled={isRendering}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 font-body text-xs font-semibold text-[#06131D] transition hover:border-[#D4AF37] disabled:opacity-50"
                    >
                      <FiDownload /> PDF
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => void shareReceiptOnWhatsApp()}
                    disabled={isRendering}
                    className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] px-4 py-2.5 font-body text-xs font-bold text-white transition hover:bg-[#1FB855] disabled:opacity-50"
                  >
                    <FaWhatsapp />{" "}
                    {isRendering
                      ? "Preparing..."
                      : isSettled
                        ? "Send receipt"
                        : "Send statement"}
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => void duplicate()}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-stone-200 px-4 py-2.5 font-body text-sm font-semibold text-[#526168] transition hover:border-[#D4AF37] hover:text-[#997A15]"
              >
                <FiCopy /> Duplicate as draft
              </button>

              {isDraft && (
                <button
                  type="button"
                  onClick={() => void deleteDraft()}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 font-body text-sm font-semibold text-red-600 transition hover:bg-red-50"
                >
                  <FiTrash2 /> Delete draft
                </button>
              )}

              {isIssued && (
                <div className="mt-4 border-t border-stone-100 pt-4">
                  <label className="block">
                    <span className={LABEL}>Cancel this invoice</span>
                    <input
                      value={cancelReason}
                      onChange={(event) => setCancelReason(event.target.value)}
                      placeholder="Reason"
                      maxLength={500}
                      className={FIELD}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => void cancel()}
                    disabled={!cancelReason.trim() || isCancelling}
                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 px-4 py-2.5 font-body text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-40"
                  >
                    <FiSlash /> {isCancelling ? "Cancelling..." : "Cancel"}
                  </button>
                  <p className="mt-2 font-body text-xs text-[#526168]">
                    The number stays used, so the series is never broken.
                  </p>
                </div>
              )}
            </div>

            {isDirty && isDraft && (
              <p className="rounded-lg bg-[#FFFCF3] p-3 font-body text-xs text-[#997A15]">
                Unsaved changes.
              </p>
            )}
          </section>
        </div>
      </div>

      {previewUrl && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-[#06131D]/80 p-4 sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label="Invoice preview"
        >
          <div className="mb-3 flex justify-end">
            <button
              type="button"
              onClick={() => {
                URL.revokeObjectURL(previewUrl);
                setPreviewUrl("");
              }}
              className="rounded-lg bg-white px-4 py-2 font-body text-sm font-semibold text-[#06131D]"
            >
              Close preview
            </button>
          </div>
          <iframe
            src={previewUrl}
            title="Invoice preview"
            className="w-full flex-1 rounded-xl bg-white"
          />
        </div>
      )}
    </AdminShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-[#526168]">{label}</dt>
      <dd className="text-[#06131D]">{value}</dd>
    </div>
  );
}

function todayInput(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}
