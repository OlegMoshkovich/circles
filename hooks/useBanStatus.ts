import { useUser } from "@clerk/clerk-expo";
import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { supabase } from "../lib/supabase";

type BanState = {
  banned: boolean;
  reason: string | null;
  bannedAt: string | null;
};

const EMPTY: BanState = { banned: false, reason: null, bannedAt: null };

export function useBanStatus() {
  const { user, isLoaded } = useUser();
  const userId = user?.id ?? null;
  const [state, setState] = useState<BanState>(EMPTY);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;
    if (!userId) {
      setState(EMPTY);
      setResolved(true);
      return;
    }

    let cancelled = false;
    const check = async () => {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("banned_at, ban_reason")
        .eq("user_id", userId)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        console.warn("useBanStatus: query failed", error.message);
        setState(EMPTY);
      } else if (data?.banned_at) {
        setState({ banned: true, reason: data.ban_reason ?? null, bannedAt: data.banned_at });
      } else {
        setState(EMPTY);
      }
      setResolved(true);
    };

    check();

    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") check();
    });

    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [isLoaded, userId]);

  return { ...state, resolved };
}
