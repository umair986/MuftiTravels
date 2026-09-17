"use client";

import { useEffect, useRef, useState } from "react";
import { FiSave, FiTrash2, FiUpload } from "react-icons/fi";
import { createClient } from "@/lib/supabase/client";
import { TAX_MODES, fyLabel, type TaxMode } from "@/lib/finance";
import { toPdfSafeImage } from "@/lib/pdf/pdfSafeImage";
import { useToast } from "../../../components/ui/toast/useToast";

/**
 * The company details every invoice prints.
 *
 * Logo and signature are stored as base64 data URIs on the row rather than as
 * storage paths, because @react-pdf/renderer fetches <Image src> over the
 * network — which means CORS and a race on a slow link at exactly the moment
 * somebody is waiting on a bill. Both are small and change roughly never.
 */

const MAX_IMAGE_BYTES = 400 * 1024;
// The file as picked, before it is scaled down to IMAGE_BOX.
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

// Four times the box each prints into on the PDF (150 × 46 pt and 96 × 34 pt):
// sharp at any zoom a customer will use, and far below the 400 KB cap.
const IMAGE_BOX = {
  logo_data_uri: { width: 600, height: 184 },
  signature_data_uri: { width: 384, height: 136 },
} as const;

const FIELD =
  "w-full rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 font-body text-sm text-[#06131D] outline-none transition focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20";

const LABEL =
  "mb-1.5 block font-body text-xs font-semibold uppercase tracking-[0.12em] text-[#526168]";

type BusinessProfile = {
  legal_name: string;
  trade_name: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  state_code: string;
  pincode: string;
  phone: string;
  email: string;
  website: string;
  gstin: string;
  pan: string;
  bank_name: string;
  bank_account_name: string;
  bank_account_number: string;
  bank_ifsc: string;
  upi_id: string;
  logo_data_uri: string;
  signature_data_uri: string;
  invoice_prefix: string;
  default_tax_mode: TaxMode;
  default_tax_rate_bp: number;
};

const EMPTY: BusinessProfile = {
  legal_name: "",
  trade_name: "",
  address_line1: "",
  address_line2: "",
  city: "",
  state: "",
  state_code: "",
  pincode: "",
  phone: "",
  email: "",
  website: "",
  gstin: "",
  pan: "",
  bank_name: "",
  bank_account_name: "",
  bank_account_number: "",
  bank_ifsc: "",
  upi_id: "",
  logo_data_uri: "",
  signature_data_uri: "",
  invoice_prefix: "MT",
  default_tax_mode: "none",
  default_tax_rate_bp: 0,
};

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-6">
      <h2 className="font-display text-2xl font-semibold text-[#06131D]">
        {title}
      </h2>
      {hint && (
        <p className="mt-1 font-body text-sm text-[#526168]">{hint}</p>
      )}
      <div className="mt-5 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export default function BusinessProfileForm() {
  const [supabase] = useState(createClient);
  const toast = useToast();
  const [profile, setProfile] = useState<BusinessProfile>(EMPTY);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [error, setError] = useState("");
  // Rate is held as typed text so a half-entered "1" is not read as 0.01%.
  const [ratePercent, setRatePercent] = useState("0");

  const logoInput = useRef<HTMLInputElement>(null);
  const signatureInput = useRef<HTMLInputElement>(null);
  // Read off the decoded image rather than the file, so it reflects what the
  // PDF will actually be handed.
  const [sizes, setSizes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!supabase) {
      setError("Supabase is not configured for this deployment.");
      setIsLoading(false);
      return;
    }
    void (async () => {
      const { data, error: loadError } = await supabase
        .from("business_profile")
        .select("*")
        .eq("id", 1)
        .maybeSingle();

      if (loadError) {
        setError(
          loadError.message.includes("does not exist")
            ? "Run 017_finance.sql in Supabase to create the finance tables."
            : loadError.message,
        );
      } else if (data) {
        setProfile({ ...EMPTY, ...(data as Partial<BusinessProfile>) });
        setRatePercent(String((data.default_tax_rate_bp ?? 0) / 100));
      }
      setIsLoading(false);
    })();
  }, [supabase]);

  function set<K extends keyof BusinessProfile>(
    key: K,
    value: BusinessProfile[K],
  ) {
    setProfile((current) => ({ ...current, [key]: value }));
    setIsDirty(true);
  }

  async function readAsDataUri(
    file: File,
    key: "logo_data_uri" | "signature_data_uri",
  ) {
    if (!file.type.startsWith("image/")) {
      setError(`"${file.name}" is not an image.`);
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError(`"${file.name}" is larger than 8 MB. Use a smaller image.`);
      return;
    }
    setError("");

    let dataUri: string;
    try {
      const raw = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result ?? ""));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      // Stored already re-encoded and scaled, rather than as uploaded: a
      // compressed 4-bit PNG prints as two overlapping logos (see
      // pdfSafeImage), and the scale-down is what lets a large source file
      // land under the cap below.
      dataUri = await toPdfSafeImage(raw, IMAGE_BOX[key]);
    } catch {
      setError(`Could not read "${file.name}" as an image.`);
      return;
    }
    // Kept small deliberately: this string is read on every invoice render and
    // travels in the row itself. Measured after re-encoding, since that is what
    // gets stored. Base64 carries 4 characters per 3 bytes.
    if ((dataUri.length * 3) / 4 > MAX_IMAGE_BYTES) {
      setError(
        `"${file.name}" is still larger than 400 KB after resizing. Use a smaller image.`,
      );
      return;
    }
    set(key, dataUri);
  }

  async function save() {
    if (!supabase) return;

    const percent = Number(ratePercent);
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
      setError("The GST rate must be a percentage between 0 and 100.");
      return;
    }
    // Basis points, so a fractional rate never needs a float downstream.
    const rateBp = Math.round(percent * 100);

    if (!/^[A-Za-z0-9]{1,4}$/.test(profile.invoice_prefix)) {
      setError(
        "The invoice prefix must be 1 to 4 letters or digits — it is part of a number GST caps at 16 characters.",
      );
      return;
    }

    setIsSaving(true);
    setError("");
    const { error: saveError } = await supabase
      .from("business_profile")
      .update({
        ...profile,
        invoice_prefix: profile.invoice_prefix.toUpperCase(),
        default_tax_rate_bp: rateBp,
      })
      .eq("id", 1);
    setIsSaving(false);

    if (saveError) {
      toast.error("Could not save these details.", {
        description: saveError.message,
      });
      return;
    }
    setProfile((current) => ({
      ...current,
      default_tax_rate_bp: rateBp,
      invoice_prefix: current.invoice_prefix.toUpperCase(),
    }));
    setIsDirty(false);
    toast.success("Business details saved.");
  }

  if (isLoading) {
    return (
      <p className="font-body text-sm text-[#526168]">Loading details...</p>
    );
  }

  const nextNumberPreview = `${(profile.invoice_prefix || "MT").toUpperCase()}/${fyLabel(new Date())}/0001`;

  return (
    <div className="space-y-5">
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 p-3 font-body text-sm text-red-700"
        >
          {error}
        </p>
      )}

      <Section
        title="Legal identity"
        hint="Printed at the top of every invoice. Getting this wrong means reissuing."
      >
        <label className="block">
          <span className={LABEL}>Legal name</span>
          <input
            value={profile.legal_name}
            onChange={(event) => set("legal_name", event.target.value)}
            className={FIELD}
          />
        </label>
        <label className="block">
          <span className={LABEL}>Trading name (optional)</span>
          <input
            value={profile.trade_name}
            onChange={(event) => set("trade_name", event.target.value)}
            className={FIELD}
          />
        </label>
        <label className="block">
          <span className={LABEL}>GSTIN</span>
          <input
            value={profile.gstin}
            onChange={(event) => set("gstin", event.target.value.toUpperCase())}
            placeholder="Leave blank if not registered"
            maxLength={20}
            className={FIELD}
          />
        </label>
        <label className="block">
          <span className={LABEL}>PAN</span>
          <input
            value={profile.pan}
            onChange={(event) => set("pan", event.target.value.toUpperCase())}
            maxLength={10}
            className={FIELD}
          />
        </label>
      </Section>

      <Section title="Address">
        <label className="block sm:col-span-2">
          <span className={LABEL}>Address line 1</span>
          <input
            value={profile.address_line1}
            onChange={(event) => set("address_line1", event.target.value)}
            className={FIELD}
          />
        </label>
        <label className="block sm:col-span-2">
          <span className={LABEL}>Address line 2</span>
          <input
            value={profile.address_line2}
            onChange={(event) => set("address_line2", event.target.value)}
            className={FIELD}
          />
        </label>
        <label className="block">
          <span className={LABEL}>City</span>
          <input
            value={profile.city}
            onChange={(event) => set("city", event.target.value)}
            className={FIELD}
          />
        </label>
        <label className="block">
          <span className={LABEL}>Pincode</span>
          <input
            value={profile.pincode}
            onChange={(event) => set("pincode", event.target.value)}
            maxLength={6}
            className={FIELD}
          />
        </label>
        <label className="block">
          <span className={LABEL}>State</span>
          <input
            value={profile.state}
            onChange={(event) => set("state", event.target.value)}
            placeholder="Maharashtra"
            className={FIELD}
          />
        </label>
        <label className="block">
          <span className={LABEL}>GST state code</span>
          <input
            value={profile.state_code}
            onChange={(event) => set("state_code", event.target.value)}
            placeholder="27"
            maxLength={2}
            className={FIELD}
          />
          <span className="mt-1 block font-body text-xs text-[#526168]">
            Compared against the customer&apos;s state to choose CGST+SGST or
            IGST.
          </span>
        </label>
        <label className="block">
          <span className={LABEL}>Phone</span>
          <input
            value={profile.phone}
            onChange={(event) => set("phone", event.target.value)}
            className={FIELD}
          />
        </label>
        <label className="block">
          <span className={LABEL}>Email</span>
          <input
            type="email"
            value={profile.email}
            onChange={(event) => set("email", event.target.value)}
            className={FIELD}
          />
        </label>
        <label className="block sm:col-span-2">
          <span className={LABEL}>Website</span>
          <input
            value={profile.website}
            onChange={(event) => set("website", event.target.value)}
            className={FIELD}
          />
        </label>
      </Section>

      <Section
        title="Bank details"
        hint="Printed on the invoice so a customer can transfer without asking."
      >
        <label className="block">
          <span className={LABEL}>Bank name</span>
          <input
            value={profile.bank_name}
            onChange={(event) => set("bank_name", event.target.value)}
            className={FIELD}
          />
        </label>
        <label className="block">
          <span className={LABEL}>Account name</span>
          <input
            value={profile.bank_account_name}
            onChange={(event) => set("bank_account_name", event.target.value)}
            className={FIELD}
          />
        </label>
        <label className="block">
          <span className={LABEL}>Account number</span>
          <input
            value={profile.bank_account_number}
            onChange={(event) =>
              set("bank_account_number", event.target.value)
            }
            className={FIELD}
          />
        </label>
        <label className="block">
          <span className={LABEL}>IFSC</span>
          <input
            value={profile.bank_ifsc}
            onChange={(event) => set("bank_ifsc", event.target.value.toUpperCase())}
            className={FIELD}
          />
        </label>
        <label className="block sm:col-span-2">
          <span className={LABEL}>UPI ID</span>
          <input
            value={profile.upi_id}
            onChange={(event) => set("upi_id", event.target.value)}
            className={FIELD}
          />
        </label>
      </Section>

      <Section
        title="Invoice defaults"
        hint="Copied onto each new draft. Changing them never alters an invoice already raised."
      >
        <label className="block">
          <span className={LABEL}>Number prefix</span>
          <input
            value={profile.invoice_prefix}
            onChange={(event) =>
              set("invoice_prefix", event.target.value.toUpperCase())
            }
            maxLength={4}
            className={FIELD}
          />
          <span className="mt-1 block font-body text-xs text-[#526168]">
            Numbers will read {nextNumberPreview}.
          </span>
        </label>

        <label className="block">
          <span className={LABEL}>GST treatment</span>
          <select
            value={profile.default_tax_mode}
            onChange={(event) =>
              set("default_tax_mode", event.target.value as TaxMode)
            }
            className={FIELD}
          >
            {TAX_MODES.map((mode) => (
              <option key={mode.value} value={mode.value}>
                {mode.label}
              </option>
            ))}
          </select>
          <span className="mt-1 block font-body text-xs text-[#526168]">
            Leave on &ldquo;No GST&rdquo; until your CA confirms the rate.
          </span>
        </label>

        <label className="block">
          <span className={LABEL}>Default GST rate (%)</span>
          <input
            inputMode="decimal"
            value={ratePercent}
            onChange={(event) => {
              setRatePercent(event.target.value);
              setIsDirty(true);
            }}
            placeholder="5"
            className={FIELD}
          />
        </label>

      </Section>

      <Section
        title="Logo and signature"
        hint="Stored on the record itself so the PDF never waits on a download. Large images are scaled down on upload."
      >
        {(
          [
            ["logo_data_uri", "Logo", logoInput, 110, 40],
            ["signature_data_uri", "Signature", signatureInput, 96, 34],
          ] as const
        ).map(([key, label, ref, printWidth, printHeight]) => (
          <div key={key} className="block">
            <span className={LABEL}>{label}</span>
            {profile[key] ? (
              <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
                <div className="flex items-start gap-3">
                  {/* The same box the PDF draws into, at twice the size: the
                      preview a mis-cropped or doubled-up file gets caught in.
                      Anything that looks wrong here prints wrong. */}
                  <div
                    className="flex flex-shrink-0 items-center justify-center rounded border border-dashed border-stone-300 bg-white"
                    style={{ width: printWidth * 2, height: printHeight * 2 }}
                  >
                    {/* A data URI, so next/image would add nothing but constraints. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={profile[key]}
                      alt={`${label} preview`}
                      onLoad={(event) => {
                        // Read now: currentTarget is null by the time React
                        // runs the updater below.
                        const { naturalWidth, naturalHeight } =
                          event.currentTarget;
                        setSizes((current) => ({
                          ...current,
                          [key]: `${naturalWidth} × ${naturalHeight} px`,
                        }));
                      }}
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-body text-xs text-[#526168]">
                      Prints at {printWidth} × {printHeight} pt, scaled to fit
                      the box on the left.
                    </p>
                    {sizes[key] && (
                      <p className="mt-1 font-body text-xs text-stone-400">
                        Image is {sizes[key]}.
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => set(key, "")}
                    className="rounded-lg p-2 text-[#526168] transition hover:bg-white hover:text-red-600"
                    aria-label={`Remove ${label.toLowerCase()}`}
                  >
                    <FiTrash2 />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => ref.current?.click()}
                  className="mt-2 font-body text-xs font-semibold text-[#997A15] hover:underline"
                >
                  Replace this {label.toLowerCase()}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => ref.current?.click()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-stone-300 px-3.5 py-3 font-body text-sm text-[#526168] transition hover:border-[#D4AF37] hover:text-[#997A15]"
              >
                <FiUpload /> Choose an image
              </button>
            )}
            <input
              ref={ref}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void readAsDataUri(file, key);
                event.target.value = "";
              }}
            />
          </div>
        ))}
      </Section>

      {/* Sticky so the save button is reachable from anywhere in a long form */}
      <div className="sticky bottom-4 flex items-center justify-end gap-3 rounded-xl border border-stone-200 bg-white/95 p-3 backdrop-blur">
        {isDirty && (
          <span className="font-body text-xs text-[#997A15]">
            Unsaved changes
          </span>
        )}
        <button
          type="button"
          onClick={() => void save()}
          disabled={isSaving || !isDirty}
          className="inline-flex items-center gap-2 rounded-lg bg-[#D4AF37] px-5 py-2.5 font-body text-sm font-bold text-[#06131D] transition hover:bg-[#F3E5AB] disabled:opacity-50"
        >
          <FiSave /> {isSaving ? "Saving..." : "Save details"}
        </button>
      </div>
    </div>
  );
}
