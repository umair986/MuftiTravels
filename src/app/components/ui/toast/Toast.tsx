"use client";

import { useCallback, useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  FiAlertCircle,
  FiCheckCircle,
  FiInfo,
  FiLoader,
  FiX,
} from "react-icons/fi";
import { DEFAULT_DURATIONS, type ToastRecord } from "./types";

const ICON_BY_VARIANT = {
  success: FiCheckCircle,
  error: FiAlertCircle,
  info: FiInfo,
  loading: FiLoader,
} as const;

const ACCENT_BY_VARIANT = {
  success: "#D4AF37",
  error: "#DC2626",
  info: "#B8C2C5",
  loading: "#D4AF37",
} as const;

export default function Toast({
  toast,
  onDismiss,
}: {
  toast: ToastRecord;
  onDismiss: (id: number) => void;
}) {
  const shouldReduceMotion = useReducedMotion();
  const duration = toast.duration ?? DEFAULT_DURATIONS[toast.variant];

  // Pause-on-hover/focus needs the exact remaining time, not just "was it
  // paused" — so track the wall-clock start of the current countdown and
  // subtract elapsed time on pause, rather than a boolean.
  const timeoutRef = useRef<number | null>(null);
  const remainingRef = useRef(duration);
  const startRef = useRef(0);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const schedule = useCallback(
    (ms: number) => {
      clearTimer();
      if (!Number.isFinite(ms)) return;
      startRef.current = Date.now();
      timeoutRef.current = window.setTimeout(() => onDismiss(toast.id), ms);
    },
    [clearTimer, onDismiss, toast.id],
  );

  useEffect(() => {
    schedule(remainingRef.current);
    return clearTimer;
    // Runs once per mount. The parent remounts this component (via a
    // variant-qualified key) whenever a loading toast resolves, so a fresh
    // countdown starts naturally rather than needing duration in deps here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pause() {
    if (!Number.isFinite(duration) || timeoutRef.current === null) return;
    const elapsed = Date.now() - startRef.current;
    remainingRef.current = Math.max(0, remainingRef.current - elapsed);
    clearTimer();
  }

  function resume() {
    if (!Number.isFinite(duration)) return;
    schedule(remainingRef.current);
  }

  const Icon = ICON_BY_VARIANT[toast.variant];
  const accent = ACCENT_BY_VARIANT[toast.variant];

  return (
    <motion.div
      layout
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: 8 }}
      transition={{ type: "spring", duration: 0.25, bounce: 0.15 }}
      onMouseEnter={pause}
      onMouseLeave={resume}
      onFocus={pause}
      onBlur={resume}
      className="pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-xl border border-white/10 bg-[#06131D] p-3.5 pr-9 shadow-2xl shadow-black/40"
      style={{ borderLeft: `3px solid ${accent}` }}
    >
      <span
        className="mt-0.5 flex-shrink-0"
        style={{ color: accent }}
        aria-hidden="true"
      >
        <Icon
          className={`h-4.5 w-4.5 ${toast.variant === "loading" ? "animate-spin" : ""}`}
        />
      </span>

      <div className="min-w-0 flex-1">
        <p className="font-body text-sm font-semibold text-[#F3E5AB]">
          {toast.title}
        </p>
        {toast.description && (
          <p className="mt-0.5 line-clamp-3 font-body text-xs leading-relaxed text-[#B8C2C5]">
            {toast.description}
          </p>
        )}
        {toast.action && (
          <button
            type="button"
            onClick={toast.action.onClick}
            className="mt-2 font-body text-xs font-bold uppercase tracking-wide text-[#D4AF37] hover:text-[#F3E5AB]"
          >
            {toast.action.label}
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        className="absolute right-2.5 top-2.5 rounded-full p-1 text-[#526168] transition hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
      >
        <FiX className="h-3.5 w-3.5" />
      </button>
    </motion.div>
  );
}
