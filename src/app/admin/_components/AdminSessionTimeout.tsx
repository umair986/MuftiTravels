"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const SESSION_TIMEOUT_MS = 15 * 60 * 1000;
/** Don't reset the clock more than once a second on a burst of mousemoves. */
const ACTIVITY_THROTTLE_MS = 1000;

const ACTIVITY_EVENTS = ["pointerdown", "keydown", "scroll", "focus"] as const;

/**
 * Signs an idle admin out after 15 minutes.
 *
 * The timer is reset by activity. It used to run from sign-in and never reset,
 * which meant an admin part-way through editing a package was signed out on a
 * fixed schedule and lost whatever was unsaved — the timeout was punishing the
 * people using it properly rather than the abandoned session it exists for.
 */
export default function AdminSessionTimeout() {
  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    let timeoutId: number | undefined;
    let lastReset = 0;
    let isArmed = false;

    const clearTimeoutId = () => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };

    const startTimeout = () => {
      isArmed = true;
      clearTimeoutId();
      timeoutId = window.setTimeout(async () => {
        await supabase.auth.signOut();
        window.location.assign("/admin?timeout=1");
      }, SESSION_TIMEOUT_MS);
    };

    const onActivity = () => {
      if (!isArmed) return;
      const now = Date.now();
      if (now - lastReset < ACTIVITY_THROTTLE_MS) return;
      lastReset = now;
      startTimeout();
    };

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) startTimeout();
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) startTimeout();
      if (event === "SIGNED_OUT") {
        isArmed = false;
        clearTimeoutId();
      }
    });

    ACTIVITY_EVENTS.forEach((eventName) =>
      window.addEventListener(eventName, onActivity, { passive: true }),
    );

    return () => {
      clearTimeoutId();
      subscription.unsubscribe();
      ACTIVITY_EVENTS.forEach((eventName) =>
        window.removeEventListener(eventName, onActivity),
      );
    };
  }, []);

  return null;
}
