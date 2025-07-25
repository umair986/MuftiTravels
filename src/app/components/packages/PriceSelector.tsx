"use client";

import { useState, useMemo, useEffect, FC } from "react";
import { PackageData, PackageTier, SharingType } from "../packageData";

interface PriceSelectorProps {
  pkg: PackageData;
  onEnquire: () => void;
}

export const PriceSelector: FC<PriceSelectorProps> = ({ pkg, onEnquire }) => {
  const availableTiers = Object.keys(pkg.prices) as PackageTier[];
  const availableSharings = [
    "Quint",
    "Quad",
    "Triple",
    "Double",
  ] as SharingType[];

  // Set default states, ensuring they are valid for the current package
  const initialTier = availableTiers.includes("Silver")
    ? "Silver"
    : availableTiers[0];
  const [selectedTier, setSelectedTier] = useState<PackageTier>(initialTier);
  const [selectedSharing, setSelectedSharing] = useState<SharingType>("Quad");

  // Adjust selected tier if it becomes invalid (e.g., after a data change)
  useEffect(() => {
    if (!availableTiers.includes(selectedTier)) {
      setSelectedTier(availableTiers[0] || "Silver");
    }
  }, [availableTiers, selectedTier]);

  // Adjust selected sharing if it becomes invalid for the selected tier
  useEffect(() => {
    if (!pkg.prices[selectedTier]?.[selectedSharing]) {
      // Find the first available sharing option for the current tier
      const firstAvailableSharing = availableSharings.find(
        (s) => pkg.prices[selectedTier]?.[s]
      );
      setSelectedSharing(firstAvailableSharing || "Quad"); // Default to Quad if none are available
    }
  }, [selectedTier, selectedSharing, pkg.prices, availableSharings]);

  const currentPrice = useMemo(() => {
    const price = pkg.prices[selectedTier]?.[selectedSharing];
    return price ? `₹${price.toLocaleString("en-IN")}` : "N/A";
  }, [selectedTier, selectedSharing, pkg.prices]);

  const tierIsAvailable = (tier: PackageTier) => availableTiers.includes(tier);
  const sharingIsAvailable = (sharing: SharingType) =>
    pkg.prices[selectedTier]?.[sharing] !== undefined;

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 sticky top-8">
      <h3 className="text-xl font-bold text-[#092638] mb-4">
        Configure Your Package
      </h3>

      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-600 mb-2">
          Package Type
        </h4>
        <div className="flex flex-wrap gap-2">
          {["Super Saver", "Bronze", "Silver", "Gold", "Platinum"].map(
            (tier) => (
              <button
                key={tier}
                onClick={() => setSelectedTier(tier as PackageTier)}
                disabled={!tierIsAvailable(tier as PackageTier)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                  selectedTier === tier
                    ? "bg-[#092638] text-white shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                } disabled:bg-gray-50 disabled:text-gray-300 disabled:cursor-not-allowed`}
              >
                {tier}
              </button>
            )
          )}
        </div>
      </div>

      <div className="mb-8">
        <h4 className="text-sm font-semibold text-gray-600 mb-2">
          Sharing Type
        </h4>
        <div className="flex flex-wrap gap-2">
          {availableSharings.map((sharing) => (
            <button
              key={sharing}
              onClick={() => setSelectedSharing(sharing)}
              disabled={!sharingIsAvailable(sharing)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                selectedSharing === sharing
                  ? "bg-[#092638] text-white shadow-md"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              } disabled:bg-gray-50 disabled:text-gray-300 disabled:cursor-not-allowed`}
            >
              {sharing}
            </button>
          ))}
        </div>
      </div>

      <div className="text-center bg-amber-50 border-2 border-dashed border-amber-300 rounded-xl p-4">
        <p className="text-sm text-amber-800">Current Price</p>
        <p className="font-bold text-3xl text-[#f8ac0d]">{currentPrice}</p>
        <p className="text-xs text-amber-700">Per Person</p>
      </div>

      <button
        onClick={onEnquire}
        className="mt-6 w-full flex items-center justify-center gap-2 bg-[#f8ac0d] text-white px-5 py-3 rounded-lg shadow-md hover:bg-[#e59a00] transition-all font-semibold"
      >
        <span>Enquire Now</span>
      </button>
    </div>
  );
};
