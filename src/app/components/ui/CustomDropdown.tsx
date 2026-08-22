"use client";

import React, { useEffect, useId, useRef, useState } from "react";
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

/**
 * A listbox, not a styled div.
 *
 * This control sits in the hero search and the contact form, so it is on the
 * critical path for both conversions. It previously suppressed its focus ring
 * with no replacement (keyboard users could not see where they were), carried
 * no listbox semantics, and supported no arrow-key navigation.
 */
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
  const [activeIndex, setActiveIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const baseId = useId();
  const labelId = `${baseId}-label`;
  const listId = `${baseId}-list`;

  const selectedIndex = options.findIndex((option) => option.value === value);
  const selectedOption = options[selectedIndex] ?? options[0];

  function open(startAt = selectedIndex >= 0 ? selectedIndex : 0) {
    setActiveIndex(startAt);
    setIsOpen(true);
  }

  function close({ refocus = true } = {}) {
    setIsOpen(false);
    setActiveIndex(-1);
    if (refocus) triggerRef.current?.focus();
  }

  function select(optionValue: string) {
    onChange(optionValue);
    close();
  }

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!dropdownRef.current?.contains(event.target as Node)) {
        close({ refocus: false });
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Keep the highlighted option in view when arrowing through a long list.
  useEffect(() => {
    if (!isOpen || activeIndex < 0) return;
    listRef.current
      ?.querySelectorAll("[role='option']")
      [activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [isOpen, activeIndex]);

  function handleKeyDown(event: React.KeyboardEvent) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (!isOpen) return open();
        return setActiveIndex((index) => (index + 1) % options.length);
      case "ArrowUp":
        event.preventDefault();
        if (!isOpen) return open(options.length - 1);
        return setActiveIndex(
          (index) => (index - 1 + options.length) % options.length,
        );
      case "Home":
        if (!isOpen) return;
        event.preventDefault();
        return setActiveIndex(0);
      case "End":
        if (!isOpen) return;
        event.preventDefault();
        return setActiveIndex(options.length - 1);
      case "Enter":
      case " ":
        event.preventDefault();
        if (!isOpen) return open();
        if (activeIndex >= 0) select(options[activeIndex].value);
        return;
      case "Escape":
        if (!isOpen) return;
        event.preventDefault();
        return close();
      case "Tab":
        if (isOpen) close({ refocus: false });
        return;
    }
  }

  return (
    <div ref={dropdownRef} className={`relative select-none ${className}`}>
      <span
        id={labelId}
        className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-stone-500"
      >
        <span className="text-[#D4AF37]">{icon}</span>
        <span>{label}</span>
      </span>

      <button
        ref={triggerRef}
        type="button"
        onClick={() => (isOpen ? close({ refocus: false }) : open())}
        onKeyDown={handleKeyDown}
        role="combobox"
        aria-controls={listId}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-labelledby={labelId}
        className="group flex w-full cursor-pointer items-center justify-between rounded-lg px-1 py-1 text-left text-xs font-semibold text-stone-900 transition-colors hover:text-[#946E19] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] focus-visible:ring-offset-2 sm:text-sm"
      >
        <span className="truncate pr-2">{selectedOption?.label || value}</span>
        <FiChevronDown
          aria-hidden="true"
          className={`h-4 w-4 flex-shrink-0 text-stone-400 transition-transform duration-300 group-hover:text-[#D4AF37] ${
            isOpen ? "rotate-180 text-[#D4AF37]" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div
          className={`absolute top-full z-50 mt-2 w-full min-w-[260px] max-w-[calc(100vw-2.5rem)] animate-in fade-in-0 zoom-in-95 rounded-2xl border border-[#D4AF37]/35 bg-white p-2 shadow-2xl duration-200 sm:w-72 ${
            align === "right" ? "right-0 left-auto" : "left-0"
          }`}
        >
          <div
            ref={listRef}
            id={listId}
            role="listbox"
            aria-labelledby={labelId}
            tabIndex={-1}
            className="max-h-60 space-y-1 overflow-y-auto pr-1"
          >
            {options.map((option, index) => {
              const isSelected = option.value === value;
              const isActive = index === activeIndex;
              return (
                <div
                  key={option.value}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => select(option.value)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`flex cursor-pointer items-center justify-between rounded-xl p-2.5 transition-all ${
                    isSelected
                      ? "bg-[#06131D] text-white shadow-sm"
                      : isActive
                        ? "bg-[#FAF8F5] text-[#946E19]"
                        : "text-stone-800"
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="flex items-center gap-2 text-xs font-semibold sm:text-sm">
                      {option.label}
                      {option.badge && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
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
                        className={`mt-0.5 text-[11px] ${
                          isSelected ? "text-stone-400" : "text-stone-500"
                        }`}
                      >
                        {option.sublabel}
                      </span>
                    )}
                  </div>

                  {isSelected && (
                    <FiCheck
                      aria-hidden="true"
                      className="ml-2 h-4 w-4 flex-shrink-0 text-[#D4AF37]"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
