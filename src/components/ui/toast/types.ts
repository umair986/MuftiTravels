export type ToastVariant = "success" | "error" | "info" | "loading";

export type ToastAction = {
  label: string;
  onClick: () => void;
};

export type ToastOptions = {
  /** Secondary line — an error message, a list of failures. */
  description?: string;
  /** ms. Defaults per variant (see DEFAULT_DURATIONS); Infinity pins it until dismissed. */
  duration?: number;
  /**
   * Replaces any existing toast with the same key instead of stacking —
   * for repeatable actions (e.g. reorder arrows) that would otherwise flood
   * the stack with one toast per click.
   */
  key?: string;
  action?: ToastAction;
};

export type ToastRecord = ToastOptions & {
  id: number;
  variant: ToastVariant;
  title: string;
};

/** Returned by every push method, and by loading() for resolving later. */
export type ToastHandle = {
  id: number;
  dismiss: () => void;
  /** Replaces a loading toast with a success outcome. */
  success: (title: string, options?: ToastOptions) => void;
  /** Replaces a loading toast with an error outcome. */
  error: (title: string, options?: ToastOptions) => void;
};

export type ToastApi = {
  success: (title: string, options?: ToastOptions) => ToastHandle;
  error: (title: string, options?: ToastOptions) => ToastHandle;
  info: (title: string, options?: ToastOptions) => ToastHandle;
  loading: (title: string, options?: ToastOptions) => ToastHandle;
  dismiss: (id: number) => void;
};

export const MAX_VISIBLE_TOASTS = 3;

export const DEFAULT_DURATIONS: Record<ToastVariant, number> = {
  success: 4000,
  info: 6000,
  error: Infinity,
  loading: Infinity,
};
