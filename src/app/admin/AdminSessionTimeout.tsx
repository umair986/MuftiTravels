"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const SESSION_TIMEOUT_MS = 15 * 60 * 1000;

export default function AdminSessionTimeout() {
  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    let timeoutId: number | undefined;

    const clearTimeoutId = () => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };

    const startTimeout = () => {
      clearTimeoutId();
      timeoutId = window.setTimeout(async () => {
        await supabase.auth.signOut();
        window.location.assign("/admin?timeout=1");
      }, SESSION_TIMEOUT_MS);
    };

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) startTimeout();
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) startTimeout();
      if (event === "SIGNED_OUT") clearTimeoutId();
    });

    return () => {
      clearTimeoutId();
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
