"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence } from "framer-motion";
import ToastComponent from "./Toast";
import {
  DEFAULT_DURATIONS,
  MAX_VISIBLE_TOASTS,
  type ToastApi,
  type ToastHandle,
  type ToastOptions,
  type ToastRecord,
  type ToastVariant,
} from "./types";

const ToastContext = createContext<ToastApi | null>(null);

/**
 * The toast API for confirming or reporting the outcome of an action the user
 * just took. For field validation, empty states, or persistent conditions,
 * keep the message inline instead — see docs/notifications-plan.md §2.
 */
export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error("useToast must be used inside <ToastProvider>");
  return api;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const nextId = useRef(0);

  // createPortal needs document.body, which isn't available during SSR.
  useEffect(() => setIsMounted(true), []);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const update = useCallback((id: number, patch: Partial<ToastRecord>) => {
    setToasts((current) =>
      current.map((toast) => (toast.id === id ? { ...toast, ...patch } : toast)),
    );
  }, []);

  const makeHandle = useCallback(
    (id: number): ToastHandle => ({
      id,
      dismiss: () => dismiss(id),
      success: (title, options) =>
        update(id, {
          variant: "success",
          title,
          duration: DEFAULT_DURATIONS.success,
          ...options,
        }),
      error: (title, options) =>
        update(id, {
          variant: "error",
          title,
          duration: DEFAULT_DURATIONS.error,
          ...options,
        }),
    }),
    [dismiss, update],
  );

  const push = useCallback(
    (variant: ToastVariant, title: string, options: ToastOptions = {}) => {
      const id = nextId.current++;
      setToasts((current) => {
        // A keyed toast replaces its predecessor rather than stacking — a
        // held reorder arrow should leave one "Order updated", not ten.
        const withoutKey = options.key
          ? current.filter((toast) => toast.key !== options.key)
          : current;
        const next: ToastRecord = { id, variant, title, ...options };
        return [...withoutKey, next].slice(-MAX_VISIBLE_TOASTS);
      });
      return makeHandle(id);
    },
    [makeHandle],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (title, options) => push("success", title, options),
      error: (title, options) => push("error", title, options),
      info: (title, options) => push("info", title, options),
      loading: (title, options) =>
        push("loading", title, { duration: Infinity, ...options }),
      dismiss,
    }),
    [push, dismiss],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {isMounted &&
        createPortal(<ToastViewport toasts={toasts} onDismiss={dismiss} />, document.body)}
    </ToastContext.Provider>
  );
}

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: ToastRecord[];
  onDismiss: (id: number) => void;
}) {
  const politeToasts = toasts.filter((toast) => toast.variant !== "error");
  const assertiveToasts = toasts.filter((toast) => toast.variant === "error");

  return (
    <div
      role="region"
      aria-label="Notifications"
      className="pointer-events-none fixed inset-x-4 top-4 z-[100] flex flex-col gap-2 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:top-auto sm:w-96"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {/* Two live regions, always present in the DOM (even empty) so
          assistive tech reliably picks up content added to them later.
          Success/info are "polite" so they don't interrupt; errors are
          assertive, since a failure should. display:contents keeps these
          wrappers out of the flex layout so both groups still stack
          together as one visual column, success/info above error. */}
      <div aria-live="polite" aria-atomic="false" className="contents">
        <AnimatePresence initial={false}>
          {politeToasts.map((toast) => (
            <ToastComponent
              key={`${toast.id}-${toast.variant}`}
              toast={toast}
              onDismiss={onDismiss}
            />
          ))}
        </AnimatePresence>
      </div>
      <div role="alert" className="contents">
        <AnimatePresence initial={false}>
          {assertiveToasts.map((toast) => (
            <ToastComponent
              key={`${toast.id}-${toast.variant}`}
              toast={toast}
              onDismiss={onDismiss}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
