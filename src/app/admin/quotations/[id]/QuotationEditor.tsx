"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FiArrowRight,
  FiCheck,
  FiCopy,
  FiDownload,
  FiEye,
  FiPackage,
  FiPlus,
  FiRefreshCw,
  FiSend,
  FiTrash2,
  FiX,
} from "react-icons/fi";
import { createClient } from "@/lib/supabase/client";
import {
  computeInvoiceTotals,
  computeLineTotal,
  formatTaxRate,
  resolveTaxMode,
  TAX_MODES,
  type TaxMode,
  type Trip,
} from "@/lib/finance";
import {
  GST_STATE_CODES,
  stateNameForCode,
  uploadPdfOnce,
  type BusinessProfileRecord,
} from "@/lib/invoices";
import {
  formatRupees,
  paiseToInputValue,
  paiseToWords,
  parsePaise,
} from "@/lib/money";
import {
  blankQuoteItem,
  createInvoiceFromQuotation,
  defaultPax,
  DISCOUNT_MODES,
  durationLabel,
  inferDurationDays,
  isExpired,
  newQuoteId,
  paxFromBreakdown,
  perPersonPaise,
  QUOTATION_BUCKET,
  QUOTE_LINK_TTL_SECONDS,
  quotationFileName,
  quotationPdfPath,
  resolveQuoteDiscount,
  whatsappQuoteUrl,
  type DiscountMode,
  type EditableQuoteItem,
  type QuotationAccommodation,
  type QuotationItemRecord,
  type QuotationRecord,
} from "@/lib/quotations";
import {
  fetchQuotablePackages,
  type QuotablePackage,
} from "@/lib/packages.client";
import { fetchTiers, type PackageTierRecord } from "@/lib/taxonomy";
import {
  invoicePolicyLists,
  type SiteContentList,
} from "@/lib/siteContent";
import { useToast } from "../../../components/ui/toast/useToast";
import AdminLoginForm from "../../AdminLoginForm";
import AdminShell from "../../AdminShell";
import PackagePicker, { type PickedLine } from "../PackagePicker";

/**
 * Edit, price and send one quotation.
 *
 * Structurally InvoiceEditor, with one rule inverted and it changes everything:
 * A SENT QUOTATION STAYS EDITABLE. There is no readOnly flag here. The customer
 * will push back, and the answer is a better quotation, not a cancellation.
 *
 * What protects the customer instead is that `revision` counts SENDS, and each
 * send writes its own PDF (quotationPdfPath). So the admin can edit freely while
 * the link the customer is holding keeps opening what they were actually sent —
 * and the banner below says plainly when the two have diverged.
 *
 * This is also the one screen in the project allowed to read the package
 * catalogue, and only through PackagePicker. See Decision 1 of
 * docs/quotations.md; src/lib/quotations.ts and src/lib/pdf/ stay clear of it.
 */

const FIELD =
  "w-full rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 font-body text-sm text-[#06131D] outline-none transition focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20";

const LABEL =
  "mb-1.5 block font-body text-xs font-semibold uppercase tracking-[0.12em] text-[#526168]";

const CARD = "rounded-2xl border border-stone-200 bg-white p-6";

function toDateInput(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** An editable string list — inclusions and exclusions are both one of these. */
function StringListEditor({
  heading,
  hint,
  items,
  placeholder,
  onChange,
}: {
  heading: string;
  hint: string;
  items: string[];
  placeholder: string;
  onChange: (next: string[]) => void;
}) {
  return (
    <div>
      <p className={LABEL}>{heading}</p>
      <p className="-mt-1 mb-2 font-body text-xs text-[#526168]">{hint}</p>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              value={item}
              placeholder={placeholder}
              onChange={(event) => {
                const next = [...items];
                next[index] = event.target.value;
                onChange(next);
              }}
              className={FIELD}
            />
            <button
              type="button"
              onClick={() => onChange(items.filter((_, i) => i !== index))}
              aria-label={`Remove line ${index + 1}`}
              className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg border border-stone-200 text-[#526168] transition hover:bg-stone-50"
            >
              <FiX />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange([...items, ""])}
        className="mt-2 inline-flex items-center gap-1.5 font-body text-sm font-semibold text-[#997A15] hover:underline"
      >
        <FiPlus /> Add a line
      </button>
    </div>
  );
}

export default function QuotationEditor({
  quotationId,
}: {
  quotationId: string;
}) {
  const [supabase] = useState(createClient);
  const toast = useToast();
  const router = useRouter();

  const [email, setEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [quotation, setQuotation] = useState<QuotationRecord | null>(null);
  const [business, setBusiness] = useState<BusinessProfileRecord | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [contentLists, setContentLists] = useState<SiteContentList[]>([]);
  const [packages, setPackages] = useState<QuotablePackage[]>([]);
  const [tiers, setTiers] = useState<PackageTierRecord[]>([]);

  /* Customer block. */
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerStateCode, setCustomerStateCode] = useState("");

  /* The trip, as the customer described it. */
  const [departureCity, setDepartureCity] = useState("");
  const [travelDate, setTravelDate] = useState("");
  const [quoteDate, setQuoteDate] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [tripId, setTripId] = useState("");

  /* What is being sold, and who to ask about it. Migration 025. */
  const [serviceType, setServiceType] = useState("Umrah");
  const [packageType, setPackageType] = useState("");
  const [sharingType, setSharingType] = useState("");
  const [salesRepName, setSalesRepName] = useState("");
  const [salesRepPhone, setSalesRepPhone] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [durationDays, setDurationDays] = useState("");

  /* Who is travelling. The breakdown behind `pax`, not a replacement for it. */
  const [adults, setAdults] = useState("");
  const [childrenWithBed, setChildrenWithBed] = useState("");
  const [childrenWithoutBed, setChildrenWithoutBed] = useState("");
  const [infants, setInfants] = useState("");

  /* Where they are staying. */
  const [stays, setStays] = useState<QuotationAccommodation[]>([]);

  /* The costing. */
  const [items, setItems] = useState<EditableQuoteItem[]>([blankQuoteItem()]);
  const [pax, setPax] = useState("");
  const [discountMode, setDiscountMode] = useState<DiscountMode>("none");
  const [discountPercent, setDiscountPercent] = useState("");
  const [discountAmount, setDiscountAmount] = useState("");
  const [taxMode, setTaxMode] = useState<TaxMode>("none");
  const [taxRatePercent, setTaxRatePercent] = useState("0");

  /* Content. */
  const [inclusions, setInclusions] = useState<string[]>([]);
  const [exclusions, setExclusions] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [showPolicies, setShowPolicies] = useState(true);

  /* Flags. */
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const touch = () => setIsDirty(true);

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
      { data: row, error: rowError },
      { data: itemRows },
      { data: businessRow },
      { data: tripRows },
      { data: listRows },
      catalogue,
      tierRows,
    ] = await Promise.all([
      supabase.from("quotations").select("*").eq("id", quotationId).maybeSingle(),
      supabase
        .from("quotation_items")
        .select("*")
        .eq("quotation_id", quotationId)
        .order("sort_order", { ascending: true }),
      supabase.from("business_profile").select("*").eq("id", 1).maybeSingle(),
      supabase
        .from("trips")
        .select("id,name,category,departure_date,status")
        .order("departure_date", { ascending: false }),
      supabase
        .from("site_content_lists")
        .select("*")
        .in("section", ["policies", "notes"]),
      fetchQuotablePackages(supabase),
      fetchTiers(supabase),
    ]);

    if (rowError || !row) {
      setError(
        rowError?.message.includes("does not exist")
          ? "Run 024_quotations.sql in Supabase to create the quotation tables."
          : (rowError?.message ?? "This quotation no longer exists."),
      );
      setIsLoading(false);
      return;
    }

    const record = row as QuotationRecord;
    const lines = (itemRows as QuotationItemRecord[]) ?? [];

    setQuotation(record);
    setBusiness((businessRow as BusinessProfileRecord) ?? null);
    setTrips((tripRows as Trip[]) ?? []);
    setContentLists((listRows as SiteContentList[]) ?? []);
    setPackages(catalogue);
    setTiers(tierRows);

    setCustomerName(record.customer_name);
    setCustomerPhone(record.customer_phone);
    setCustomerEmail(record.customer_email);
    setCustomerAddress(record.customer_address);
    setCustomerStateCode(record.customer_state_code);

    setDepartureCity(record.departure_city);
    setTravelDate(record.travel_date ?? "");
    setQuoteDate(record.quote_date ?? toDateInput(new Date()));
    setValidUntil(record.valid_until ?? "");
    setTripId(record.trip_id ?? "");

    setServiceType(record.service_type ?? "Umrah");
    setPackageType(record.package_type ?? "");
    setSharingType(record.sharing_type ?? "");
    setSalesRepName(record.sales_rep_name ?? "");
    setSalesRepPhone(record.sales_rep_phone ?? "");
    setReturnDate(record.return_date ?? "");
    setDurationDays(record.duration_days ? String(record.duration_days) : "");

    setAdults(record.adults ? String(record.adults) : "");
    setChildrenWithBed(
      record.children_with_bed ? String(record.children_with_bed) : "",
    );
    setChildrenWithoutBed(
      record.children_without_bed ? String(record.children_without_bed) : "",
    );
    setInfants(record.infants ? String(record.infants) : "");

    setStays(record.accommodation ?? []);

    setItems(
      lines.length
        ? lines.map((line) => ({
            id: line.id,
            description: line.description,
            quantity: String(line.quantity),
            unitPrice: paiseToInputValue(line.unit_price_paise),
            sourcePackageSlug: line.source_package_slug,
          }))
        : [blankQuoteItem()],
    );
    setPax(record.pax ? String(record.pax) : "");
    setDiscountMode(record.discount_mode);
    setDiscountPercent(
      record.discount_percent_bp ? String(record.discount_percent_bp / 100) : "",
    );
    setDiscountAmount(
      record.discount_mode === "amount"
        ? paiseToInputValue(record.discount_paise)
        : "",
    );
    setTaxMode(record.tax_mode);
    setTaxRatePercent(String((record.tax_rate_bp ?? 0) / 100));

    setInclusions(record.inclusions ?? []);
    setExclusions(record.exclusions ?? []);
    setNotes(record.notes);
    setShowPolicies(record.show_policies);

    setIsDirty(false);
    setIsLoading(false);
  }, [supabase, quotationId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Revoke the previous blob URL rather than leaking one per preview.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const parsedItems = useMemo(
    () =>
      items
        .filter((item) => item.description.trim())
        .map((item) => ({
          quantity: Number(item.quantity) || 0,
          unitPricePaise: parsePaise(item.unitPrice) ?? 0,
        })),
    [items],
  );

  const subtotalPaise = useMemo(
    () =>
      parsedItems.reduce(
        (sum, item) => sum + computeLineTotal(item.quantity, item.unitPricePaise),
        0,
      ),
    [parsedItems],
  );

  const discountPercentBp = Math.round((Number(discountPercent) || 0) * 100);
  const discountAmountPaise = parsePaise(discountAmount) ?? 0;

  const discountPaise = useMemo(
    () =>
      resolveQuoteDiscount(
        subtotalPaise,
        discountMode,
        discountPercentBp,
        discountAmountPaise,
      ),
    [subtotalPaise, discountMode, discountPercentBp, discountAmountPaise],
  );

  const taxRateBp = Math.round((Number(taxRatePercent) || 0) * 100);

  const totals = useMemo(
    () =>
      computeInvoiceTotals({
        items: parsedItems,
        discountPaise,
        taxMode,
        taxRateBp,
      }),
    [parsedItems, discountPaise, taxMode, taxRateBp],
  );

  const paxCount = Number(pax) > 0 ? Math.round(Number(pax)) : null;
  const perPerson = perPersonPaise(totals.totalPaise, paxCount);
  const suggestedPax = defaultPax(parsedItems);

  // Intra- or inter-state is decided from the two state codes rather than left
  // to whoever is typing. Only while GST is switched on for the business.
  useEffect(() => {
    if (!business || business.default_tax_mode === "none") return;
    const resolved = resolveTaxMode(business.state_code, customerStateCode, true);
    setTaxMode(resolved);
  }, [business, customerStateCode]);

  const policies = useMemo(() => {
    if (!showPolicies) return [];
    // A sent quotation prints what was frozen onto it; a draft previews the live
    // lists, so the preview shows what sending will capture.
    if (quotation?.policy_snapshot?.length) return quotation.policy_snapshot;
    return invoicePolicyLists(contentLists);
  }, [showPolicies, quotation, contentLists]);

  const isDraft = quotation?.status === "draft";
  const expired = quotation
    ? isExpired(quotation.status, quotation.valid_until)
    : false;
  /**
   * Edited since it was sent. This is the one thing the admin must not be
   * allowed to lose track of: the customer is holding revision N, and the screen
   * is showing something else.
   */
  const hasUnsentChanges = Boolean(
    quotation &&
      !isDraft &&
      (isDirty ||
        (quotation.sent_at &&
          new Date(quotation.updated_at) > new Date(quotation.sent_at))),
  );

  const buildPatch = useCallback(
    () => ({
      customer_name: customerName.trim().slice(0, 200),
      customer_phone: customerPhone.trim().slice(0, 32),
      customer_email: customerEmail.trim().slice(0, 200),
      customer_address: customerAddress.trim().slice(0, 500),
      customer_state: stateNameForCode(customerStateCode),
      customer_state_code: customerStateCode,
      customer_gstin: "",
      departure_city: departureCity.trim().slice(0, 120),
      travel_date: travelDate || null,
      quote_date: quoteDate || toDateInput(new Date()),
      pax: paxCount,
      trip_id: tripId || null,

      /* Trip details (migration 025). Every one of these has a default that
         renders as "say nothing", so a quotation nobody has filled them in on
         produces the document it produced before they existed. */
      service_type: serviceType.trim().slice(0, 80),
      package_type: packageType.trim().slice(0, 160),
      sharing_type: sharingType.trim().slice(0, 120),
      sales_rep_name: salesRepName.trim().slice(0, 120),
      sales_rep_phone: salesRepPhone.trim().slice(0, 32),
      return_date: returnDate || null,
      // Null rather than 0 for an empty field: the CHECK rejects 0, and null is
      // the database's own way of saying "not discussed yet".
      duration_days: Math.trunc(Number(durationDays) || 0) || null,

      adults: Math.max(Math.trunc(Number(adults) || 0), 0),
      children_with_bed: Math.max(Math.trunc(Number(childrenWithBed) || 0), 0),
      children_without_bed: Math.max(
        Math.trunc(Number(childrenWithoutBed) || 0),
        0,
      ),
      infants: Math.max(Math.trunc(Number(infants) || 0), 0),

      // Rows with nothing in them are dropped rather than stored: an empty
      // object would render as a bordered row of dashes on the PDF.
      accommodation: stays
        .map((stay) => ({
          city: stay.city.trim().slice(0, 80),
          hotel: stay.hotel.trim().slice(0, 160),
          distance: stay.distance.trim().slice(0, 80),
          room: stay.room.trim().slice(0, 80),
          nights: Math.trunc(Number(stay.nights) || 0) || null,
          check_in: stay.check_in.trim().slice(0, 40),
          check_out: stay.check_out.trim().slice(0, 40),
        }))
        .filter((stay) => stay.city || stay.hotel),
      subtotal_paise: totals.subtotalPaise,
      discount_mode: discountMode,
      discount_percent_bp: discountMode === "percent" ? discountPercentBp : 0,
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
      inclusions: inclusions.map((line) => line.trim()).filter(Boolean),
      exclusions: exclusions.map((line) => line.trim()).filter(Boolean),
      notes: notes.trim().slice(0, 2000),
      show_policies: showPolicies,
    }),
    [
      customerName,
      customerPhone,
      customerEmail,
      customerAddress,
      customerStateCode,
      departureCity,
      travelDate,
      quoteDate,
      paxCount,
      tripId,
      totals,
      discountMode,
      discountPercentBp,
      taxMode,
      taxRateBp,
      inclusions,
      exclusions,
      notes,
      showPolicies,
      serviceType,
      packageType,
      sharingType,
      salesRepName,
      salesRepPhone,
      returnDate,
      durationDays,
      adults,
      childrenWithBed,
      childrenWithoutBed,
      infants,
      stays,
    ],
  );

  /**
   * Upsert every line, then delete only the ones actually removed.
   *
   * Not delete-then-insert: there is no client transaction, so a failure between
   * the two halves would lose the costing. This is why EditableQuoteItem carries
   * a client-generated id from birth.
   */
  async function save(): Promise<boolean> {
    if (!supabase || !quotation) return false;

    const usable = items.filter((item) => item.description.trim());
    if (!usable.length) {
      toast.error("Add at least one line before saving.");
      return false;
    }

    setIsSaving(true);

    const { error: patchError } = await supabase
      .from("quotations")
      .update({ ...buildPatch(), valid_until: validUntil || null })
      .eq("id", quotation.id);

    if (patchError) {
      setIsSaving(false);
      toast.error("Could not save this quotation.", {
        description: patchError.message,
      });
      return false;
    }

    const rows = usable.map((item, index) => ({
      id: item.id,
      quotation_id: quotation.id,
      // 4000, matching quotation_items_text_len as migration 025 widened it:
      // one line can carry a whole nested itinerary.
      description: item.description.trim().slice(0, 4000),
      quantity: Number(item.quantity) || 1,
      unit_price_paise: parsePaise(item.unitPrice) ?? 0,
      line_total_paise: computeLineTotal(
        Number(item.quantity) || 1,
        parsePaise(item.unitPrice) ?? 0,
      ),
      source_package_slug: item.sourcePackageSlug.slice(0, 200),
      sort_order: index * 10,
    }));

    const { error: itemsError } = await supabase
      .from("quotation_items")
      .upsert(rows, { onConflict: "id" });

    if (itemsError) {
      setIsSaving(false);
      toast.error("Could not save the lines.", {
        description: itemsError.message,
      });
      return false;
    }

    const keptIds = rows.map((row) => row.id);
    const { error: pruneError } = await supabase
      .from("quotation_items")
      .delete()
      .eq("quotation_id", quotation.id)
      .not("id", "in", `(${keptIds.join(",")})`);

    setIsSaving(false);

    if (pruneError) {
      toast.error("Saved, but removed lines may still be there.", {
        description: pruneError.message,
      });
    }

    setIsDirty(false);
    await load();
    return true;
  }

  async function fetchLines(): Promise<QuotationItemRecord[]> {
    if (!supabase) return [];
    const { data } = await supabase
      .from("quotation_items")
      .select("*")
      .eq("quotation_id", quotationId)
      .order("sort_order", { ascending: true });
    return (data as QuotationItemRecord[]) ?? [];
  }

  /** Render this revision and store it. Never replaces an earlier revision. */
  async function storePdf(record: QuotationRecord): Promise<boolean> {
    if (!supabase || !business || !record.number) return false;
    const { renderQuotationPdf } = await import("@/lib/pdf/renderQuotation");
    const path = quotationPdfPath(record.id, record.number, record.revision);
    const blob = await renderQuotationPdf({
      quotation: record,
      items: await fetchLines(),
      business,
      policies: record.show_policies
        ? record.policy_snapshot?.length
          ? record.policy_snapshot
          : invoicePolicyLists(contentLists)
        : [],
    });
    const uploadError = await uploadPdfOnce(
      supabase,
      path,
      blob,
      QUOTATION_BUCKET,
    );
    if (uploadError) return false;
    await supabase
      .from("quotations")
      .update({ pdf_path: path })
      .eq("id", record.id);
    return true;
  }

  /**
   * Send, or re-send.
   *
   * send_quotation() allocates the number the first time and bumps the revision
   * every time after, returning the same number — so this one button is both
   * "send" and "send the updated one", which is how the admin thinks about it.
   */
  async function send() {
    if (!supabase || !quotation) return;
    if (!customerName.trim()) {
      toast.error("Add the customer's name first.");
      return;
    }

    setIsSending(true);
    if (!(await save())) {
      setIsSending(false);
      return;
    }

    const { data: number, error: sendError } = await supabase.rpc(
      "send_quotation",
      {
        p_quotation: quotation.id,
        p_sent_on: toDateInput(new Date()),
        p_valid_days: null,
      },
    );

    if (sendError) {
      setIsSending(false);
      toast.error("Could not send this quotation.", {
        description: sendError.message,
      });
      return;
    }

    const { data: fresh } = await supabase
      .from("quotations")
      .select("*")
      .eq("id", quotation.id)
      .maybeSingle();

    const record = fresh as QuotationRecord | null;
    const stored = record ? await storePdf(record) : false;
    setIsSending(false);
    await load();

    if (!stored) {
      // The number is already allocated, so this is not a failure to send — it
      // is a failure to file. "Rebuild PDF" is the retry.
      toast.error(`Sent as ${number}, but the PDF could not be stored.`, {
        description: "Use Rebuild PDF to try again.",
      });
      return;
    }
    toast.success(
      record && record.revision > 1
        ? `Revision ${record.revision} of ${number} is ready to share.`
        : `Sent as ${number}.`,
    );
  }

  /**
   * Make the stored PDF match the current revision.
   *
   * Self-repair for a send whose upload failed, and the way a revision bumped
   * elsewhere gets its file. Compares the stored path against the expected one
   * rather than re-rendering blindly.
   */
  async function rebuildPdf() {
    if (!supabase || !quotation?.number) return;
    setIsRendering(true);
    const expected = quotationPdfPath(
      quotation.id,
      quotation.number,
      quotation.revision,
    );
    const ok =
      quotation.pdf_path === expected ? true : await storePdf(quotation);
    setIsRendering(false);
    await load();
    toast[ok ? "success" : "error"](
      ok ? "The stored PDF matches this revision." : "Could not store the PDF.",
    );
  }

  /** Preview the unsaved state, without touching storage. */
  async function preview() {
    if (!business || !quotation) return;
    setIsRendering(true);
    try {
      const { renderQuotationPdf } = await import("@/lib/pdf/renderQuotation");
      const blob = await renderQuotationPdf({
        quotation: {
          ...quotation,
          ...buildPatch(),
          valid_until: validUntil || null,
        } as QuotationRecord,
        items: items
          .filter((item) => item.description.trim())
          .map((item, index) => ({
            id: item.id,
            quotation_id: quotation.id,
            description: item.description,
            quantity: Number(item.quantity) || 1,
            unit_price_paise: parsePaise(item.unitPrice) ?? 0,
            line_total_paise: computeLineTotal(
              Number(item.quantity) || 1,
              parsePaise(item.unitPrice) ?? 0,
            ),
            source_package_slug: item.sourcePackageSlug,
            sort_order: index * 10,
          })),
        business,
        policies,
      });
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(blob));
    } catch (renderError) {
      toast.error("Could not render a preview.", {
        description: (renderError as Error).message,
      });
    } finally {
      setIsRendering(false);
    }
  }

  /**
   * Serve the STORED file when there is one.
   *
   * A sent quotation is served from storage, never re-rendered: the stored file
   * is the document the customer received, and re-rendering it would quietly
   * apply today's logo and today's prices to it.
   */
  async function download() {
    if (!supabase || !quotation) return;
    if (quotation.pdf_path) {
      const { data, error: signError } = await supabase.storage
        .from(QUOTATION_BUCKET)
        .createSignedUrl(quotation.pdf_path, 60, {
          download: quotationFileName(quotation),
        });
      if (signError || !data) {
        toast.error("Could not fetch the stored PDF.", {
          description: signError?.message,
        });
        return;
      }
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
      return;
    }
    // A draft has no stored file, so render one for the browser only.
    if (!business) return;
    setIsRendering(true);
    const { renderQuotationPdf } = await import("@/lib/pdf/renderQuotation");
    const blob = await renderQuotationPdf({
      quotation: { ...quotation, ...buildPatch() } as QuotationRecord,
      items: await fetchLines(),
      business,
      policies,
    });
    setIsRendering(false);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = quotationFileName(quotation);
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function shareOnWhatsApp() {
    if (!supabase || !quotation?.pdf_path || !quotation.number) return;
    const { data, error: signError } = await supabase.storage
      .from(QUOTATION_BUCKET)
      .createSignedUrl(quotation.pdf_path, QUOTE_LINK_TTL_SECONDS);
    if (signError || !data) {
      toast.error("Could not create a share link.");
      return;
    }
    const url = whatsappQuoteUrl({
      phone: quotation.customer_phone,
      name: quotation.customer_name,
      number: quotation.number,
      totalPaise: quotation.total_paise,
      perPersonPaise: perPersonPaise(quotation.total_paise, quotation.pax),
      pax: quotation.pax,
      validUntil: quotation.valid_until,
      link: data.signedUrl,
    });
    if (!url) {
      toast.error("That phone number does not look complete.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function setStatus(
    status: "accepted" | "declined",
    reason = "",
  ): Promise<void> {
    if (!supabase || !quotation) return;
    const { error: statusError } = await supabase
      .from("quotations")
      .update({
        status,
        accepted_on: status === "accepted" ? toDateInput(new Date()) : null,
        declined_reason: status === "declined" ? reason.slice(0, 500) : "",
      })
      .eq("id", quotation.id);
    if (statusError) {
      toast.error("Could not update the status.", {
        description: statusError.message,
      });
      return;
    }
    await load();
    toast.success(status === "accepted" ? "Marked accepted." : "Marked declined.");
  }

  async function convertToInvoice() {
    if (!supabase || !quotation) return;
    setIsConverting(true);
    if (isDirty && !(await save())) {
      setIsConverting(false);
      return;
    }
    const { id, error: convertError } = await createInvoiceFromQuotation(
      supabase,
      quotation,
      await fetchLines(),
    );
    setIsConverting(false);
    if (!id) {
      toast.error("Could not create the invoice.", {
        description: convertError ?? undefined,
      });
      return;
    }
    if (convertError) {
      toast.error("The invoice was created, but something went wrong after.", {
        description: convertError,
      });
    }
    router.push(`/admin/invoices/${id}`);
  }

  async function duplicate() {
    if (!supabase || !quotation) return;
    const { data, error: copyError } = await supabase
      .from("quotations")
      .insert({
        ...buildPatch(),
        valid_until: null,
        status: "draft",
      })
      .select("id")
      .single();
    if (copyError || !data) {
      toast.error("Could not duplicate this quotation.", {
        description: copyError?.message,
      });
      return;
    }
    const lines = await fetchLines();
    if (lines.length) {
      await supabase.from("quotation_items").insert(
        lines.map((line, index) => ({
          id: newQuoteId(),
          quotation_id: data.id as string,
          description: line.description,
          quantity: line.quantity,
          unit_price_paise: line.unit_price_paise,
          line_total_paise: line.line_total_paise,
          source_package_slug: line.source_package_slug,
          sort_order: index * 10,
        })),
      );
    }
    router.push(`/admin/quotations/${data.id}`);
  }

  function applyPick(line: PickedLine) {
    setItems((current) => {
      // An untouched blank first line is replaced rather than left above the pick.
      const base =
        current.length === 1 && !current[0].description.trim() ? [] : current;
      return [
        ...base,
        {
          id: newQuoteId(),
          description: line.description,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          sourcePackageSlug: line.sourcePackageSlug,
        },
      ];
    });
    // Merge the package's features in, skipping anything already listed, so two
    // picks on one quotation do not produce the same inclusion twice.
    setInclusions((current) => {
      const seen = new Set(current.map((entry) => entry.trim().toLowerCase()));
      const additions = line.inclusions.filter(
        (entry) => entry.trim() && !seen.has(entry.trim().toLowerCase()),
      );
      return [...current, ...additions];
    });
    if (!pax) setPax(line.quantity);
    touch();
  }

  if (isLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#F3EFEA] font-body text-sm text-[#526168]">
        Loading quotation...
      </main>
    );
  }

  if (!email) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#06131D] px-6">
        <section className="w-full max-w-md rounded-2xl bg-[#0B1E28] p-8">
          <h1 className="font-display text-4xl text-white">Admin Login</h1>
          <p className="mt-2 font-body text-sm text-[#B8C2C5]">
            Sign in to work on quotations.
          </p>
          <div className="mt-8">
            <AdminLoginForm />
          </div>
        </section>
      </main>
    );
  }

  if (!quotation) {
    return (
      <AdminShell title="Quotation" email={email} contentWidth="narrow">
        <p
          role="alert"
          className="rounded-lg bg-red-50 p-3 font-body text-sm text-red-700"
        >
          {error || "This quotation no longer exists."}
        </p>
        <Link
          href="/admin/quotations"
          className="mt-4 inline-block font-body text-sm font-semibold text-[#997A15] hover:underline"
        >
          Back to quotations
        </Link>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title={quotation.number ?? "New quotation"}
      description={
        quotation.revision > 1
          ? `Revision ${quotation.revision} · ${quotation.customer_name || "no customer yet"}`
          : (quotation.customer_name || "Price a package and send it.")
      }
      email={email}
      headerAction={
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void preview()}
            disabled={isRendering}
            className="inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 font-body text-sm font-semibold text-[#06131D] transition hover:border-[#D4AF37] disabled:opacity-50"
          >
            <FiEye /> Preview
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={isSaving || !isDirty}
            className="inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 font-body text-sm font-semibold text-[#06131D] transition hover:border-[#D4AF37] disabled:opacity-40"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            onClick={() => void send()}
            disabled={isSending}
            className="inline-flex items-center gap-2 rounded-lg bg-[#D4AF37] px-4 py-2.5 font-body text-sm font-bold text-[#06131D] transition hover:bg-[#F3E5AB] disabled:opacity-50"
          >
            <FiSend />
            {isSending
              ? "Sending..."
              : isDraft
                ? "Send"
                : `Send revision ${quotation.revision + 1}`}
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

      {/* The one thing the admin must not lose track of. */}
      {hasUnsentChanges && (
        <p
          role="status"
          className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-3 font-body text-sm text-amber-800"
        >
          Edited since you sent revision {quotation.revision}. The copy the
          customer holds is unchanged — send again to share the update.
        </p>
      )}

      {expired && !hasUnsentChanges && (
        <p
          role="status"
          className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-3 font-body text-sm text-amber-800"
        >
          This quotation lapsed on{" "}
          {new Date(`${quotation.valid_until}T00:00:00`).toLocaleDateString(
            "en-IN",
            { day: "numeric", month: "short", year: "numeric" },
          )}
          . Send it again to put a fresh validity date on it.
        </p>
      )}

      {quotation.converted_invoice_id && (
        <p
          role="status"
          className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 p-3 font-body text-sm text-emerald-700"
        >
          This quotation became an invoice.{" "}
          <Link
            href={`/admin/invoices/${quotation.converted_invoice_id}`}
            className="font-semibold underline"
          >
            Open it
          </Link>
          .
        </p>
      )}

      <div className="space-y-5">
        {/* ------------------------------------------------- the customer --- */}
        <section className={CARD}>
          <h2 className="font-display text-2xl font-semibold text-[#06131D]">
            Prepared for
          </h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={LABEL}>Name</span>
              <input
                value={customerName}
                onChange={(event) => {
                  setCustomerName(event.target.value);
                  touch();
                }}
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
                maxLength={32}
                className={FIELD}
              />
            </label>
            <label className="block">
              <span className={LABEL}>Email</span>
              <input
                value={customerEmail}
                onChange={(event) => {
                  setCustomerEmail(event.target.value);
                  touch();
                }}
                maxLength={200}
                className={FIELD}
              />
            </label>
            <label className="block">
              <span className={LABEL}>Departing from</span>
              <input
                value={departureCity}
                onChange={(event) => {
                  setDepartureCity(event.target.value);
                  touch();
                }}
                placeholder="Mumbai"
                maxLength={120}
                className={FIELD}
              />
            </label>
            <label className="block sm:col-span-2">
              <span className={LABEL}>Address</span>
              <input
                value={customerAddress}
                onChange={(event) => {
                  setCustomerAddress(event.target.value);
                  touch();
                }}
                maxLength={500}
                className={FIELD}
              />
            </label>
            <label className="block">
              <span className={LABEL}>State</span>
              <select
                value={customerStateCode}
                onChange={(event) => {
                  setCustomerStateCode(event.target.value);
                  touch();
                }}
                className={FIELD}
              >
                <option value="">Not stated</option>
                {GST_STATE_CODES.map((state) => (
                  <option key={state.code} value={state.code}>
                    {state.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={LABEL}>Travelling around</span>
              <input
                type="date"
                value={travelDate}
                onChange={(event) => {
                  setTravelDate(event.target.value);
                  touch();
                }}
                className={FIELD}
              />
            </label>
          </div>
        </section>

        {/* ----------------------------------------------------- the trip --- */}
        {/* Migration 025. None of it is required: a quotation saved with this
            card untouched prints exactly the document it printed before these
            fields existed, because every block on the PDF is conditional on
            having been filled in. */}
        <section className={CARD}>
          <h2 className="font-display text-2xl font-semibold text-[#06131D]">
            The trip
          </h2>
          <p className="mt-1 font-body text-sm text-[#526168]">
            What the customer compares us on before they get to the price. Each
            block is left off the PDF when it is empty.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span className={LABEL}>Service</span>
              <input
                value={serviceType}
                onChange={(event) => {
                  setServiceType(event.target.value);
                  touch();
                }}
                maxLength={80}
                placeholder="Umrah"
                className={FIELD}
              />
            </label>
            <label className="block">
              <span className={LABEL}>Package</span>
              <input
                value={packageType}
                onChange={(event) => {
                  setPackageType(event.target.value);
                  touch();
                }}
                maxLength={160}
                placeholder="Gold &amp; Gold Plus"
                className={FIELD}
              />
            </label>
            <label className="block">
              <span className={LABEL}>Sharing</span>
              <input
                value={sharingType}
                onChange={(event) => {
                  setSharingType(event.target.value);
                  touch();
                }}
                maxLength={120}
                placeholder="Quad sharing"
                className={FIELD}
              />
            </label>

            <label className="block">
              <span className={LABEL}>Returning on</span>
              <input
                type="date"
                value={returnDate}
                onChange={(event) => {
                  const value = event.target.value;
                  setReturnDate(value);
                  // Fill the duration from the dates, but never overwrite a
                  // number already typed: a group flying home separately is
                  // real, and they would have to retype it on every save.
                  if (!durationDays) {
                    const days = inferDurationDays(travelDate || null, value);
                    if (days) setDurationDays(String(days));
                  }
                  touch();
                }}
                className={FIELD}
              />
            </label>
            <label className="block">
              <span className={LABEL}>Days</span>
              <input
                inputMode="numeric"
                value={durationDays}
                onChange={(event) => {
                  setDurationDays(event.target.value);
                  touch();
                }}
                placeholder="15"
                className={FIELD}
              />
              <span className="mt-1 block font-body text-xs text-[#526168]">
                {durationLabel(Number(durationDays) || null) ||
                  "Prints as 15D/14N"}
              </span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className={LABEL}>Prepared by</span>
                <input
                  value={salesRepName}
                  onChange={(event) => {
                    setSalesRepName(event.target.value);
                    touch();
                  }}
                  maxLength={120}
                  className={FIELD}
                />
              </label>
              <label className="block">
                <span className={LABEL}>Their phone</span>
                <input
                  value={salesRepPhone}
                  onChange={(event) => {
                    setSalesRepPhone(event.target.value);
                    touch();
                  }}
                  maxLength={32}
                  className={FIELD}
                />
              </label>
            </div>
          </div>

          {/* ------------------------------------------------ travellers --- */}
          <div className="mt-6 border-t border-stone-100 pt-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className={`${LABEL} mb-0`}>Who is travelling</p>
              <button
                type="button"
                onClick={() => {
                  const implied = paxFromBreakdown({
                    adults: Number(adults) || 0,
                    children_with_bed: Number(childrenWithBed) || 0,
                    children_without_bed: Number(childrenWithoutBed) || 0,
                  });
                  if (implied) {
                    setPax(String(implied));
                    touch();
                  }
                }}
                className="font-body text-xs font-semibold text-[#997A15] underline-offset-4 hover:underline"
              >
                Use this as the pax count
              </button>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-4">
              {(
                [
                  ["Adults", adults, setAdults],
                  ["Child (bed)", childrenWithBed, setChildrenWithBed],
                  [
                    "Child (no bed)",
                    childrenWithoutBed,
                    setChildrenWithoutBed,
                  ],
                  ["Infants", infants, setInfants],
                ] as const
              ).map(([label, value, set]) => (
                <label key={label} className="block">
                  <span className={LABEL}>{label}</span>
                  <input
                    inputMode="numeric"
                    value={value}
                    onChange={(event) => {
                      set(event.target.value);
                      touch();
                    }}
                    placeholder="0"
                    className={FIELD}
                  />
                </label>
              ))}
            </div>
            <p className="mt-2 font-body text-xs text-[#526168]">
              Infants are left out of the pax count on purpose — they occupy no
              bed, and counting them would divide the total by one more person
              than it was priced for.
            </p>
          </div>

          {/* --------------------------------------------- accommodation --- */}
          <div className="mt-6 border-t border-stone-100 pt-5">
            <p className={LABEL}>Where they are staying</p>
            <div className="space-y-3">
              {stays.map((stay, index) => (
                <div
                  key={`stay-${index}`}
                  className="grid gap-2 rounded-xl border border-stone-200 p-3 sm:grid-cols-[6rem_1fr_6rem_5rem_2.25rem]"
                >
                  <input
                    value={stay.city}
                    onChange={(event) => {
                      const next = [...stays];
                      next[index] = { ...stay, city: event.target.value };
                      setStays(next);
                      touch();
                    }}
                    placeholder="Makkah"
                    maxLength={80}
                    className={FIELD}
                  />
                  <input
                    value={stay.hotel}
                    onChange={(event) => {
                      const next = [...stays];
                      next[index] = { ...stay, hotel: event.target.value };
                      setStays(next);
                      touch();
                    }}
                    placeholder="Elaf Diamond"
                    maxLength={160}
                    className={FIELD}
                  />
                  <input
                    value={stay.distance}
                    onChange={(event) => {
                      const next = [...stays];
                      next[index] = { ...stay, distance: event.target.value };
                      setStays(next);
                      touch();
                    }}
                    placeholder="300 m"
                    maxLength={80}
                    className={FIELD}
                  />
                  <input
                    inputMode="numeric"
                    value={stay.nights ? String(stay.nights) : ""}
                    onChange={(event) => {
                      const next = [...stays];
                      next[index] = {
                        ...stay,
                        nights: Number(event.target.value) || null,
                      };
                      setStays(next);
                      touch();
                    }}
                    placeholder="Nights"
                    className={FIELD}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setStays(stays.filter((_, i) => i !== index));
                      touch();
                    }}
                    aria-label={`Remove ${stay.city || "hotel"}`}
                    className="grid h-9 w-9 place-items-center self-center rounded-lg border border-stone-200 text-[#526168] transition hover:bg-stone-50"
                  >
                    <FiTrash2 />
                  </button>

                  <input
                    value={stay.room}
                    onChange={(event) => {
                      const next = [...stays];
                      next[index] = { ...stay, room: event.target.value };
                      setStays(next);
                      touch();
                    }}
                    placeholder="Sharing"
                    maxLength={80}
                    className={`${FIELD} sm:col-start-1`}
                  />
                  <input
                    value={stay.check_in}
                    onChange={(event) => {
                      const next = [...stays];
                      next[index] = { ...stay, check_in: event.target.value };
                      setStays(next);
                      touch();
                    }}
                    placeholder="Check-in 04:00 PM"
                    maxLength={40}
                    className={FIELD}
                  />
                  <input
                    value={stay.check_out}
                    onChange={(event) => {
                      const next = [...stays];
                      next[index] = { ...stay, check_out: event.target.value };
                      setStays(next);
                      touch();
                    }}
                    placeholder="Check-out 12:00 PM"
                    maxLength={40}
                    className={`${FIELD} sm:col-span-2`}
                  />
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                setStays([
                  ...stays,
                  {
                    city: "",
                    hotel: "",
                    distance: "",
                    room: "",
                    nights: null,
                    check_in: "",
                    check_out: "",
                  },
                ]);
                touch();
              }}
              className="mt-3 inline-flex items-center gap-2 rounded-lg border border-stone-200 px-3.5 py-2 font-body text-sm font-semibold text-[#526168] transition hover:bg-stone-50"
            >
              <FiPlus /> Add a hotel
            </button>
          </div>
        </section>

        {/* ---------------------------------------------------- the price --- */}
        <section className={CARD}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl font-semibold text-[#06131D]">
                The costing
              </h2>
              <p className="mt-1 font-body text-sm text-[#526168]">
                Rates come from the published package and are yours to change.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsPickerOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-[#D4AF37] bg-[#FFFCF3] px-3.5 py-2.5 font-body text-sm font-semibold text-[#997A15] transition hover:bg-[#F3E5AB]"
            >
              <FiPackage /> Add from catalogue
            </button>
          </div>

          <div className="mt-5 space-y-3">
            {items.map((item, index) => (
              <div
                key={item.id}
                className="grid gap-2 border-t border-stone-100 pt-3 first:border-t-0 first:pt-0 sm:grid-cols-[1fr_5rem_8rem_8rem_2.25rem] sm:items-end"
              >
                <label className="block">
                  {index === 0 && <span className={LABEL}>Description</span>}
                  {/* A textarea, not an input, because one priced line carries a
                      whole nested itinerary on the PDF: first line is the item,
                      two spaces indent a level, **asterisks** make a
                      sub-heading. See parseDescriptionLines. */}
                  <textarea
                    rows={item.description.includes("\n") ? 6 : 1}
                    value={item.description}
                    onChange={(event) => {
                      const next = [...items];
                      next[index] = {
                        ...item,
                        description: event.target.value,
                      };
                      setItems(next);
                      touch();
                    }}
                    maxLength={4000}
                    className={`${FIELD} resize-y font-mono text-xs leading-relaxed`}
                  />
                </label>
                <label className="block">
                  {index === 0 && <span className={LABEL}>Pax</span>}
                  <input
                    inputMode="decimal"
                    value={item.quantity}
                    onChange={(event) => {
                      const next = [...items];
                      next[index] = { ...item, quantity: event.target.value };
                      setItems(next);
                      touch();
                    }}
                    className={FIELD}
                  />
                </label>
                <label className="block">
                  {index === 0 && <span className={LABEL}>Per person</span>}
                  <input
                    inputMode="decimal"
                    value={item.unitPrice}
                    onChange={(event) => {
                      const next = [...items];
                      next[index] = { ...item, unitPrice: event.target.value };
                      setItems(next);
                      touch();
                    }}
                    className={FIELD}
                  />
                </label>
                <div className="font-body text-sm font-semibold text-[#06131D] sm:pb-2.5 sm:text-right">
                  {index === 0 && (
                    <span className={`${LABEL} sm:text-right`}>Amount</span>
                  )}
                  {formatRupees(
                    computeLineTotal(
                      Number(item.quantity) || 0,
                      parsePaise(item.unitPrice) ?? 0,
                    ),
                    { trimZeroPaise: true },
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = items.filter((row) => row.id !== item.id);
                    setItems(next.length ? next : [blankQuoteItem()]);
                    touch();
                  }}
                  aria-label={`Remove line ${index + 1}`}
                  className="grid h-9 w-9 place-items-center rounded-lg border border-stone-200 text-[#526168] transition hover:bg-stone-50 sm:mb-0.5"
                >
                  <FiTrash2 />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              setItems((current) => [...current, blankQuoteItem()]);
              touch();
            }}
            className="mt-3 inline-flex items-center gap-1.5 font-body text-sm font-semibold text-[#997A15] hover:underline"
          >
            <FiPlus /> Add a line by hand
          </button>

          {/* The description convention, stated where it is typed. Without this
              the nesting on the PDF is undiscoverable. */}
          <p className="mt-3 font-body text-xs leading-relaxed text-[#526168]">
            A description can run to several lines. The first line is the item
            name; two spaces at the start of a line indent it one level, four
            spaces two levels; wrap a line in{" "}
            <code className="rounded bg-stone-100 px-1">**asterisks**</code> to
            make it a sub-heading. The whole block stays one priced line.
          </p>

          <div className="mt-6 grid gap-5 border-t border-stone-100 pt-5 lg:grid-cols-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className={LABEL}>Discount</span>
                <select
                  value={discountMode}
                  onChange={(event) => {
                    setDiscountMode(event.target.value as DiscountMode);
                    touch();
                  }}
                  className={FIELD}
                >
                  {DISCOUNT_MODES.map((mode) => (
                    <option key={mode.value} value={mode.value}>
                      {mode.label}
                    </option>
                  ))}
                </select>
              </label>

              {discountMode === "percent" && (
                <label className="block">
                  <span className={LABEL}>Percent off</span>
                  <input
                    inputMode="decimal"
                    value={discountPercent}
                    onChange={(event) => {
                      setDiscountPercent(event.target.value);
                      touch();
                    }}
                    placeholder="5"
                    className={FIELD}
                  />
                  {/* The admin says "five percent"; the customer reads a rupee
                      figure. Both are shown so neither is a surprise. */}
                  <span className="mt-1 block font-body text-xs text-[#526168]">
                    {discountPaise > 0
                      ? `${formatRupees(discountPaise, { trimZeroPaise: true })} off`
                      : "Nothing off yet"}
                  </span>
                </label>
              )}

              {discountMode === "amount" && (
                <label className="block">
                  <span className={LABEL}>Amount off</span>
                  <input
                    inputMode="decimal"
                    value={discountAmount}
                    onChange={(event) => {
                      setDiscountAmount(event.target.value);
                      touch();
                    }}
                    className={FIELD}
                  />
                  {discountAmountPaise > subtotalPaise && (
                    <span className="mt-1 block font-body text-xs text-amber-700">
                      More than the bill — capped at{" "}
                      {formatRupees(subtotalPaise, { trimZeroPaise: true })}.
                    </span>
                  )}
                </label>
              )}

              <label className="block">
                <span className={LABEL}>Pax on the quotation</span>
                <input
                  inputMode="numeric"
                  value={pax}
                  onChange={(event) => {
                    setPax(event.target.value);
                    touch();
                  }}
                  placeholder={suggestedPax ? String(suggestedPax) : ""}
                  className={FIELD}
                />
                {suggestedPax !== null && paxCount !== suggestedPax && (
                  <button
                    type="button"
                    onClick={() => {
                      setPax(String(suggestedPax));
                      touch();
                    }}
                    className="mt-1 font-body text-xs font-semibold text-[#997A15] hover:underline"
                  >
                    The lines add up to {suggestedPax} — use that
                  </button>
                )}
              </label>

              {business?.default_tax_mode !== "none" && (
                <>
                  <label className="block">
                    <span className={LABEL}>GST</span>
                    <select
                      value={taxMode}
                      onChange={(event) => {
                        setTaxMode(event.target.value as TaxMode);
                        touch();
                      }}
                      className={FIELD}
                    >
                      {TAX_MODES.map((mode) => (
                        <option key={mode.value} value={mode.value}>
                          {mode.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className={LABEL}>Rate (%)</span>
                    <input
                      inputMode="decimal"
                      value={taxRatePercent}
                      onChange={(event) => {
                        setTaxRatePercent(event.target.value);
                        touch();
                      }}
                      className={FIELD}
                    />
                  </label>
                </>
              )}

              <label className="block">
                <span className={LABEL}>Valid until</span>
                <input
                  type="date"
                  value={validUntil}
                  onChange={(event) => {
                    setValidUntil(event.target.value);
                    touch();
                  }}
                  className={FIELD}
                />
                <span className="mt-1 block font-body text-xs text-[#526168]">
                  Set on every send from your{" "}
                  {business?.quote_validity_days ?? 7}-day default.
                </span>
              </label>

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
                  <option value="">Not tagged</option>
                  {trips.map((trip) => (
                    <option key={trip.id} value={trip.id}>
                      {trip.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {/* The figures, live. Same arithmetic that gets stored. */}
            <div className="rounded-2xl border border-[#D4AF37]/40 bg-[#FFFCF3] p-5">
              <dl className="space-y-1.5 font-body text-sm">
                <div className="flex justify-between">
                  <dt className="text-[#526168]">Subtotal</dt>
                  <dd>{formatRupees(totals.subtotalPaise)}</dd>
                </div>
                {totals.discountPaise > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-[#526168]">
                      Discount
                      {discountMode === "percent" && discountPercentBp > 0
                        ? ` (${formatTaxRate(discountPercentBp)})`
                        : ""}
                    </dt>
                    <dd>- {formatRupees(totals.discountPaise)}</dd>
                  </div>
                )}
                {taxMode !== "none" && taxRateBp > 0 && (
                  <>
                    <div className="flex justify-between">
                      <dt className="text-[#526168]">Taxable</dt>
                      <dd>{formatRupees(totals.taxablePaise)}</dd>
                    </div>
                    {taxMode === "cgst_sgst" ? (
                      <>
                        <div className="flex justify-between">
                          <dt className="text-[#526168]">
                            CGST @ {formatTaxRate(taxRateBp / 2)}
                          </dt>
                          <dd>{formatRupees(totals.cgstPaise)}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-[#526168]">
                            SGST @ {formatTaxRate(taxRateBp / 2)}
                          </dt>
                          <dd>{formatRupees(totals.sgstPaise)}</dd>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between">
                        <dt className="text-[#526168]">
                          IGST @ {formatTaxRate(taxRateBp)}
                        </dt>
                        <dd>{formatRupees(totals.igstPaise)}</dd>
                      </div>
                    )}
                  </>
                )}
                {totals.roundOffPaise !== 0 && (
                  <div className="flex justify-between">
                    <dt className="text-[#526168]">Round off</dt>
                    <dd>{formatRupees(totals.roundOffPaise)}</dd>
                  </div>
                )}
              </dl>

              <div className="mt-3 flex items-baseline justify-between border-t border-[#D4AF37]/40 pt-3">
                <p className="font-body text-sm font-semibold text-[#06131D]">
                  Total
                </p>
                <p className="font-display text-4xl font-semibold text-[#06131D]">
                  {formatRupees(totals.totalPaise, { trimZeroPaise: true })}
                </p>
              </div>

              {perPerson !== null && paxCount && paxCount > 1 && (
                <p className="mt-1 text-right font-body text-sm font-semibold text-[#997A15]">
                  ≈ {formatRupees(perPerson, { trimZeroPaise: true })} per person
                  · {paxCount} travellers
                </p>
              )}
            </div>
          </div>
        </section>

        {/* ------------------------------------------------- the content --- */}
        <section className={CARD}>
          <h2 className="font-display text-2xl font-semibold text-[#06131D]">
            What they get
          </h2>
          <p className="mt-1 font-body text-sm text-[#526168]">
            A customer comparing us to another agent is comparing these, not the
            total. Picking a package fills them in.
          </p>
          <div className="mt-5 grid gap-6 lg:grid-cols-2">
            <StringListEditor
              heading="Included"
              hint="Copied from the package you picked. Edit freely."
              items={inclusions}
              placeholder="Return airfare, Mumbai – Jeddah – Mumbai"
              onChange={(next) => {
                setInclusions(next);
                touch();
              }}
            />
            <StringListEditor
              heading="Not included"
              hint="Typed, not copied — what to leave out is a judgement about this customer."
              items={exclusions}
              placeholder="Qurbani, laundry and personal expenses"
              onChange={(next) => {
                setExclusions(next);
                touch();
              }}
            />
          </div>

          <label className="mt-6 block">
            <span className={LABEL}>Notes on the quotation</span>
            <textarea
              value={notes}
              onChange={(event) => {
                setNotes(event.target.value);
                touch();
              }}
              rows={2}
              maxLength={2000}
              className={FIELD}
            />
          </label>

          <label className="mt-4 flex items-start gap-3">
            <input
              type="checkbox"
              checked={showPolicies}
              onChange={(event) => {
                setShowPolicies(event.target.checked);
                touch();
              }}
              className="mt-1 h-4 w-4 accent-[#D4AF37]"
            />
            <span className="font-body text-sm text-[#526168]">
              Print the payment and cancellation policies on an annexure page.
              They are frozen onto the quotation each time you send it.
            </span>
          </label>
        </section>

        {/* ------------------------------------------------- what happens --- */}
        <section className={CARD}>
          <h2 className="font-display text-2xl font-semibold text-[#06131D]">
            Share and follow up
          </h2>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void download()}
              disabled={isRendering}
              className="inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 font-body text-sm font-semibold text-[#06131D] transition hover:border-[#D4AF37] disabled:opacity-50"
            >
              <FiDownload /> Download PDF
            </button>
            <button
              type="button"
              onClick={() => void shareOnWhatsApp()}
              disabled={!quotation.pdf_path}
              title={
                quotation.pdf_path
                  ? "Open WhatsApp with the message ready"
                  : "Send the quotation first"
              }
              className="inline-flex items-center gap-2 rounded-lg bg-[#06131D] px-3.5 py-2.5 font-body text-sm font-semibold text-[#F3E5AB] transition hover:bg-[#0B1E28] disabled:opacity-40"
            >
              <FiSend /> Send on WhatsApp
            </button>
            {quotation.number && (
              <button
                type="button"
                onClick={() => void rebuildPdf()}
                disabled={isRendering}
                className="inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 font-body text-sm font-semibold text-[#526168] transition hover:border-[#D4AF37] disabled:opacity-50"
              >
                <FiRefreshCw /> Rebuild PDF
              </button>
            )}
            <button
              type="button"
              onClick={() => void duplicate()}
              className="inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 font-body text-sm font-semibold text-[#526168] transition hover:border-[#D4AF37]"
            >
              <FiCopy /> Duplicate
            </button>
          </div>

          {!isDraft && (
            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-stone-100 pt-5">
              {quotation.status !== "accepted" && (
                <button
                  type="button"
                  onClick={() => void setStatus("accepted")}
                  className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 font-body text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
                >
                  <FiCheck /> Mark accepted
                </button>
              )}
              {quotation.status !== "declined" && (
                <button
                  type="button"
                  onClick={() => void setStatus("declined")}
                  className="inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 font-body text-sm font-semibold text-[#526168] transition hover:border-red-200 hover:text-red-700"
                >
                  <FiX /> Mark declined
                </button>
              )}
              {!quotation.converted_invoice_id && (
                <button
                  type="button"
                  onClick={() => void convertToInvoice()}
                  disabled={isConverting}
                  className="ml-auto inline-flex items-center gap-2 rounded-lg bg-[#D4AF37] px-4 py-2.5 font-body text-sm font-bold text-[#06131D] transition hover:bg-[#F3E5AB] disabled:opacity-50"
                >
                  {isConverting ? "Creating..." : "Convert to invoice"}
                  <FiArrowRight />
                </button>
              )}
            </div>
          )}
        </section>

        <Link
          href="/admin/quotations"
          className="inline-block font-body text-sm font-semibold text-[#997A15] hover:underline"
        >
          Back to quotations
        </Link>
      </div>

      <PackagePicker
        open={isPickerOpen}
        packages={packages}
        tiers={tiers}
        defaultQuantity={paxCount ?? 1}
        onClose={() => setIsPickerOpen(false)}
        onPick={applyPick}
      />

      {previewUrl && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Quotation preview"
          className="fixed inset-0 z-50 flex flex-col bg-[#06131D]/80 p-4"
        >
          <div className="mb-3 flex items-center justify-between">
            <p className="font-body text-sm font-semibold text-white">
              Preview — not saved
            </p>
            <button
              type="button"
              onClick={() => {
                URL.revokeObjectURL(previewUrl);
                setPreviewUrl(null);
              }}
              className="grid h-9 w-9 place-items-center rounded-lg bg-white text-[#06131D]"
              aria-label="Close preview"
            >
              <FiX />
            </button>
          </div>
          <iframe
            src={previewUrl}
            title="Quotation preview"
            className="min-h-0 flex-1 rounded-lg bg-white"
          />
        </div>
      )}
    </AdminShell>
  );
}
