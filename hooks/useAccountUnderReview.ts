import { useUser } from "@clerk/clerk-expo";
import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { supabase } from "../lib/supabase";

const ACTIVE_STATUSES = ["pending", "reviewed"] as const;

export function useAccountUnderReview() {
  const { user, isLoaded } = useUser();
  const userId = user?.id ?? null;
  const [underReview, setUnderReview] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isLoaded || !userId) {
      setUnderReview(false);
      return;
    }

    let cancelled = false;
    const check = async () => {
      setLoading(true);
      const { count, error } = await supabase
        .from("content_reports")
        .select("id", { count: "exact", head: true })
        .eq("reported_user_id", userId)
        .in("status", ACTIVE_STATUSES as unknown as string[]);
      if (cancelled) return;
      if (error) {
        console.warn("useAccountUnderReview: query failed", error.message);
        setUnderReview(false);
      } else {
        setUnderReview((count ?? 0) > 0);
      }
      setLoading(false);
    };

    check();

    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") check();
    });

    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [isLoaded, userId]);

  return { underReview, loading };
}
