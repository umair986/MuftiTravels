"use client";

import { useState, useMemo, useEffect, FC } from "react";
import { PackageData, PackageTier, SharingType } from "../packageData";

interface PriceSelectorProps {
  pkg: PackageData;
  onEnquire: () => void;
}

export const PriceSelector: FC<PriceSelectorProps> = ({ pkg, onEnquire }) => {
  const availableTiers = Object.keys(pkg.prices) as PackageTier[];

  // This is the complete list of all possible sharing options.
  const allSharingTypes: SharingType[] = [
    "Quint",
    "Quad",
    "Triple",
    "Double",
    "Child(6-11)",
    "Child(2-5)",
    "Infant(0-2)",
  ];

  const initialTier = availableTiers.includes("Silver")
    ? "Silver"
    : availableTiers[0];
  const [selectedTier, setSelectedTier] = useState<PackageTier>(initialTier);
  const [selectedSharing, setSelectedSharing] = useState<SharingType>("Quad");

  useEffect(() => {
    if (!availableTiers.includes(selectedTier)) {
      setSelectedTier(availableTiers[0] || "Silver");
    }
  }, [availableTiers, selectedTier]);

  useEffect(() => {
    // If the currently selected sharing option is not available for the selected tier,
    // find the first available one and set it as the new selection.
    if (!pkg.prices[selectedTier]?.[selectedSharing]) {
      const firstAvailableSharing = allSharingTypes.find(
        (s) => pkg.prices[selectedTier]?.[s]
      );
      // Default to 'Quad' if no other options are available for some reason
      setSelectedSharing(firstAvailableSharing || "Quad");
    }
  }, [selectedTier, selectedSharing, pkg.prices, allSharingTypes]);

  const currentPrice = useMemo(() => {
    const price = pkg.prices[selectedTier]?.[selectedSharing];
    return price ? `₹${price.toLocaleString("en-IN")}` : "N/A";
  }, [selectedTier, selectedSharing, pkg.prices]);

  const tierIsAvailable = (tier: PackageTier) => availableTiers.includes(tier);
  // This function checks if a price exists for a given sharing type in your packageData.ts file.
  // If a price doesn't exist, the button will be disabled.
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
          {/* This now correctly maps over the full list of sharing types */}
          {allSharingTypes.map((sharing) => (
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
