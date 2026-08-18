"use client";

import React, { useState, useRef, useEffect } from "react";
import { FiChevronDown, FiCheck } from "react-icons/fi";

export interface DropdownOption {
  value: string;
  label: string;
  badge?: string;
  sublabel?: string;
}

interface CustomDropdownProps {
  label: string;
  icon: React.ReactNode;
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  align?: "left" | "right";
}

export default function CustomDropdown({
  label,
  icon,
  options,
  value,
  onChange,
  className = "",
  align = "left",
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value) || options[0];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (optValue: string) => {
    onChange(optValue);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className={`relative select-none ${className}`}>
      {/* Label */}
      <div className="text-[11px] uppercase tracking-wider text-stone-500 font-semibold flex items-center gap-1.5 mb-1.5">
        <span className="text-[#D4AF37]">{icon}</span>
        <span>{label}</span>
      </div>

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-left font-semibold text-stone-900 text-xs sm:text-sm py-1 px-1 rounded-lg hover:text-[#946E19] transition-colors focus:outline-none group cursor-pointer"
        aria-expanded={isOpen}
      >
        <span className="truncate pr-2">{selectedOption?.label || value}</span>
        <FiChevronDown
          className={`w-4 h-4 text-stone-400 group-hover:text-[#D4AF37] transition-transform duration-300 flex-shrink-0 ${
            isOpen ? "rotate-180 text-[#D4AF37]" : ""
          }`}
        />
      </button>

      {/* Floating Menu Popover */}
      {isOpen && (
        <div
          className={`absolute top-full mt-2 w-full min-w-[260px] sm:w-72 max-w-[calc(100vw-2.5rem)] bg-white rounded-2xl shadow-2xl border border-[#D4AF37]/35 p-2 z-50 animate-in fade-in-0 zoom-in-95 duration-200 ${
            align === "right" ? "right-0 left-auto" : "left-0"
          }`}
        >
          <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between group cursor-pointer ${
                    isSelected
                      ? "bg-[#06131D] text-white shadow-sm"
                      : "hover:bg-[#FAF8F5] text-stone-800 hover:text-[#946E19]"
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="text-xs sm:text-sm font-semibold flex items-center gap-2">
                      {option.label}
                      {option.badge && (
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                            isSelected
                              ? "gold-gradient-bg text-[#06131D]"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {option.badge}
                        </span>
                      )}
                    </span>
                    {option.sublabel && (
                      <span
                        className={`text-[11px] mt-0.5 ${
                          isSelected ? "text-stone-400" : "text-stone-500"
                        }`}
                      >
                        {option.sublabel}
                      </span>
                    )}
                  </div>

                  {isSelected && (
                    <FiCheck className="w-4 h-4 text-[#D4AF37] flex-shrink-0 ml-2" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
