"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { CmsPackageRecord } from "@/lib/packages";
import { createClient } from "@/lib/supabase/client";

const packageSlug = "14-days-umrah-land-package";
const packageTiers = [
  "Super Saver",
  "Bronze",
  "Silver",
  "Gold",
  "Platinum",
] as const;
const sharingTypes = ["Quint", "Quad", "Triple", "Double"] as const;

type PriceRow = {
  id: number;
  tier: (typeof packageTiers)[number];
  sharing: (typeof sharingTypes)[number];
  amount: string;
};

type FormState = {
  name: string;
  description: string;
  imageUrl: string;
  durationDays: string;
  durationNights: string;
  destinations: string;
  features: string;
  prices: PriceRow[];
  isPublished: boolean;
};

const emptyForm: FormState = {
  name: "",
  description: "",
  imageUrl: "",
  durationDays: "",
  durationNights: "",
  destinations: "",
  features: "",
  prices: [],
  isPublished: true,
};

function pricesToRows(prices: CmsPackageRecord["prices"]): PriceRow[] {
  return Object.entries(prices).flatMap(([tier, sharingPrices], tierIndex) =>
    Object.entries(sharingPrices ?? {}).map(([sharing, amount], rowIndex) => ({
      id: tierIndex * 100 + rowIndex,
      tier: packageTiers.includes(tier as PriceRow["tier"])
        ? (tier as PriceRow["tier"])
        : "Silver",
      sharing: sharingTypes.includes(sharing as PriceRow["sharing"])
        ? (sharing as PriceRow["sharing"])
        : "Quad",
      amount: String(amount),
    })),
  );
}

function rowsToPrices(rows: PriceRow[]) {
  return rows.reduce<Record<string, Record<string, number>>>((prices, row) => {
    if (!row.amount || Number(row.amount) <= 0) return prices;
    prices[row.tier] ??= {};
    prices[row.tier][row.sharing] = Number(row.amount);
    return prices;
  }, {});
}

export default function ManagedPackageEditor({
  slug = packageSlug,
}: {
  slug?: string;
}) {
  const [record, setRecord] = useState<CmsPackageRecord | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) {
      setError("Supabase is not configured for this deployment.");
      setIsLoading(false);
      return;
    }

    supabase
      .from("packages")
      .select("*")
      .eq("slug", slug)
      .maybeSingle()
      .then(({ data, error: loadError }) => {
        if (loadError) {
          setError(
            "Create the packages table in Supabase before editing this package.",
          );
        } else if (data) {
          const packageRecord = data as CmsPackageRecord;
          setRecord(packageRecord);
          setForm({
            name: packageRecord.name,
            description: packageRecord.description,
            imageUrl: packageRecord.image_url,
            durationDays: String(packageRecord.duration_days),
            durationNights: String(packageRecord.duration_nights),
            destinations: packageRecord.destinations,
            features: packageRecord.features.join("\n"),
            prices: pricesToRows(packageRecord.prices),
            isPublished: packageRecord.is_published,
          });
        } else {
          setError("The pilot package has not been seeded in Supabase yet.");
        }
        setIsLoading(false);
      });
  }, [slug]);

  function updateField<Key extends keyof FormState>(
    key: Key,
    value: FormState[Key],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
    setMessage("");
    setError("");
  }

  async function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsSaving(true);
    setMessage("");
    setError("");

    const supabase = createClient();
    if (!supabase) {
      setError("Supabase is not configured for this deployment.");
      setIsSaving(false);
      return;
    }
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setError("Please sign in again before uploading an image.");
      setIsSaving(false);
      return;
    }

    const fileExtension = file.name.split(".").pop() || "jpg";
    const filePath = `${userData.user.id}/${slug}-${Date.now()}.${fileExtension}`;
    const { error: uploadError } = await supabase.storage
      .from("package-images")
      .upload(filePath, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      setError(uploadError.message);
      setIsSaving(false);
      return;
    }

    const { data } = supabase.storage
      .from("package-images")
      .getPublicUrl(filePath);
    updateField("imageUrl", data.publicUrl);
    setMessage("Image uploaded. Save the package to apply it.");
    setIsSaving(false);
  }

  function addPriceRow() {
    const nextId = Math.max(0, ...form.prices.map((row) => row.id)) + 1;
    updateField("prices", [
      ...form.prices,
      { id: nextId, tier: "Silver", sharing: "Quad", amount: "" },
    ]);
  }

  function updatePriceRow(id: number, changes: Partial<PriceRow>) {
    updateField(
      "prices",
      form.prices.map((row) => (row.id === id ? { ...row, ...changes } : row)),
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!record) return;

    setIsSaving(true);
    setMessage("");
    setError("");

    const nextPrices = rowsToPrices(form.prices);
    const amounts = form.prices
      .map((row) => Number(row.amount))
      .filter((amount) => amount > 0);
    const startingPrice = amounts.length ? Math.min(...amounts) : 0;

    const supabase = createClient();
    if (!supabase) {
      setError("Supabase is not configured for this deployment.");
      setIsSaving(false);
      return;
    }

    const { data, error: saveError } = await supabase
      .from("packages")
      .update({
        name: form.name.trim(),
        description: form.description.trim(),
        image_url: form.imageUrl.trim(),
        duration_days: Number(form.durationDays),
        duration_nights: Number(form.durationNights),
        destinations: form.destinations.trim(),
        features: form.features
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean),
        starting_price: startingPrice,
        prices: nextPrices,
        is_published: form.isPublished,
      })
      .eq("id", record.id)
      .select()
      .single();

    setIsSaving(false);

    if (saveError) {
      setError(saveError.message);
      return;
    }

    setRecord(data as CmsPackageRecord);
    setMessage(
      "Package saved. Refresh the homepage or detail page to see the update.",
    );
  }

  if (isLoading) {
    return (
      <p className="mt-6 font-body text-sm text-[#526168]">
        Loading package editor...
      </p>
    );
  }

  return (
    <div className="mt-8 border-t border-[#06131D]/10 pt-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-body text-xs font-semibold uppercase tracking-[0.2em] text-[#997A15]">
            Pilot package
          </p>
          <h3 className="mt-1 font-display text-3xl font-semibold text-[#06131D]">
            Edit {record?.name || "Package"}
          </h3>
        </div>
        <span className="font-body text-xs text-[#526168]">Slug: {slug}</span>
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 p-3 font-body text-sm text-red-700">
          {error}
        </p>
      )}
      {message && (
        <p className="mt-4 rounded-lg bg-emerald-50 p-3 font-body text-sm text-emerald-700">
          {message}
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4 sm:grid-cols-2">
        <EditorField
          label="Package name"
          value={form.name}
          onChange={(value) => updateField("name", value)}
        />
        <label className="space-y-1.5 font-body text-sm font-semibold text-[#06131D] sm:col-span-2">
          Package image
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleImageUpload}
            className="block w-full rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 font-normal file:mr-4 file:rounded-md file:border-0 file:bg-[#06131D] file:px-3 file:py-2 file:font-body file:text-xs file:font-semibold file:text-[#F3E5AB]"
          />
          {form.imageUrl && (
            <p className="truncate pt-1 text-xs font-normal text-emerald-700">
              Image ready to save
            </p>
          )}
        </label>
        <EditorField
          label="Duration in days"
          type="number"
          value={form.durationDays}
          onChange={(value) => updateField("durationDays", value)}
        />
        <EditorField
          label="Duration in nights"
          type="number"
          value={form.durationNights}
          onChange={(value) => updateField("durationNights", value)}
        />
        <EditorField
          label="Destinations"
          value={form.destinations}
          onChange={(value) => updateField("destinations", value)}
        />
        <label className="space-y-1.5 font-body text-sm font-semibold text-[#06131D] sm:col-span-2">
          Description
          <textarea
            required
            value={form.description}
            onChange={(event) => updateField("description", event.target.value)}
            rows={3}
            className="block w-full rounded-lg border border-stone-200 bg-white px-3.5 py-3 font-normal outline-none transition focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
          />
        </label>
        <section className="rounded-xl border border-[#06131D]/10 bg-[#FAF8F5] p-4 sm:col-span-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h4 className="font-display text-2xl font-semibold text-[#06131D]">
                Package prices
              </h4>
              <p className="mt-1 text-xs font-normal text-[#526168]">
                Add only the tier and sharing combinations available for this
                package.
              </p>
            </div>
            <button
              type="button"
              onClick={addPriceRow}
              className="rounded-lg bg-[#D4AF37] px-3 py-2 font-body text-xs font-bold text-[#06131D] hover:bg-[#F3E5AB]"
            >
              Add price
            </button>
          </div>
          <div className="mt-4 space-y-3">
            {form.prices.map((row) => (
              <div
                key={row.id}
                className="grid gap-3 rounded-lg border border-stone-200 bg-white p-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end"
              >
                <EditorSelect
                  label="Package tier"
                  value={row.tier}
                  options={packageTiers}
                  onChange={(value) =>
                    updatePriceRow(row.id, { tier: value as PriceRow["tier"] })
                  }
                />
                <EditorSelect
                  label="Sharing"
                  value={row.sharing}
                  options={sharingTypes}
                  onChange={(value) =>
                    updatePriceRow(row.id, {
                      sharing: value as PriceRow["sharing"],
                    })
                  }
                />
                <EditorField
                  label="Price (INR)"
                  type="number"
                  value={row.amount}
                  onChange={(value) =>
                    updatePriceRow(row.id, { amount: value })
                  }
                />
                <button
                  type="button"
                  onClick={() =>
                    updateField(
                      "prices",
                      form.prices.filter((item) => item.id !== row.id),
                    )
                  }
                  className="h-10 rounded-lg border border-red-200 px-3 text-xs font-semibold text-red-600 hover:bg-red-50"
                >
                  Remove
                </button>
              </div>
            ))}
            {!form.prices.length && (
              <p className="rounded-lg border border-dashed border-stone-300 p-4 text-center text-xs font-normal text-[#526168]">
                No prices added yet. Click Add price to create a tier and
                sharing combination.
              </p>
            )}
          </div>
        </section>
        <label className="space-y-1.5 font-body text-sm font-semibold text-[#06131D] sm:col-span-2">
          Features (one per line)
          <textarea
            required
            value={form.features}
            onChange={(event) => updateField("features", event.target.value)}
            rows={4}
            className="block w-full rounded-lg border border-stone-200 bg-white px-3.5 py-3 font-normal outline-none transition focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
          />
        </label>
        <label className="flex items-center gap-3 font-body text-sm font-semibold text-[#06131D] sm:col-span-2">
          <input
            type="checkbox"
            checked={form.isPublished}
            onChange={(event) =>
              updateField("isPublished", event.target.checked)
            }
            className="h-4 w-4 accent-[#D4AF37]"
          />
          Published on the website
        </label>
        <button
          type="submit"
          disabled={isSaving || !record}
          className="rounded-lg bg-[#06131D] px-5 py-3 font-body text-sm font-bold text-[#F3E5AB] transition hover:bg-[#0D2A3A] disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2"
        >
          {isSaving ? "Saving package..." : "Save package"}
        </button>
      </form>
    </div>
  );
}

function EditorField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="space-y-1.5 font-body text-sm font-semibold text-[#06131D]">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
        className="block w-full rounded-lg border border-stone-200 bg-white px-3.5 py-3 font-normal outline-none transition focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
      />
    </label>
  );
}

function EditorSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-1.5 font-body text-sm font-semibold text-[#06131D]">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="block h-10 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm font-normal outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
