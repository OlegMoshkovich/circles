import React from "react";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useUser } from "@clerk/clerk-expo";
import { supabase } from "../../lib/supabase";

/**
 * Runs all of the signed-in startup checks (onboarding completion + ban
 * status) in a single parallel batch. Previously OnboardingGate and
 * useBanStatus each made their own sequential round-trips against the same
 * user_profiles row, which serialized 2-3 network hops before first paint.
 */
type SessionBootstrap = {
  /** True once the startup checks have resolved (or there is no user). */
  ready: boolean;
  needsOnboarding: boolean;
  setNeedsOnboarding: (v: boolean) => void;
  /** Call when onboarding finishes — keeps local + in-memory state in sync. */
  completeOnboarding: () => void;
  /** Replay onboarding (profile settings). */
  beginOnboarding: () => void;
  /**
   * Whether this device has recorded onboarding as done for the signed-in user.
   * `null` while unknown (first read in flight).
   */
  onboardingCompleteLocally: boolean | null;
  banned: boolean;
  banReason: string | null;
  bannedAt: string | null;
};

const SessionBootstrapContext = React.createContext<SessionBootstrap>({
  ready: false,
  needsOnboarding: false,
  setNeedsOnboarding: () => {},
  completeOnboarding: () => {},
  beginOnboarding: () => {},
  onboardingCompleteLocally: null,
  banned: false,
  banReason: null,
  bannedAt: null,
});

export function useSessionBootstrap() {
  return React.useContext(SessionBootstrapContext);
}

export function onboardingStorageKey(userId: string) {
  return `onboarding_v1_${userId}`;
}

export function SessionBootstrapProvider({ children }: { children: React.ReactNode }) {
  const { user, isSignedIn, isLoaded } = useUser();
  const userId = user?.id ?? null;
  const [ready, setReady] = React.useState(false);
  const [needsOnboarding, setNeedsOnboarding] = React.useState(false);
  const [onboardingCompleteLocally, setOnboardingCompleteLocally] = React.useState<boolean | null>(null);
  const [ban, setBan] = React.useState<{ banned: boolean; reason: string | null; at: string | null }>({
    banned: false,
    reason: null,
    at: null,
  });

  React.useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn || !userId) {
      setNeedsOnboarding(false);
      setOnboardingCompleteLocally(null);
      setBan({ banned: false, reason: null, at: null });
      setReady(true);
      return;
    }

    // A user just became signed in (or switched): the previous `ready`/
    // `needsOnboarding` reflect the old (often signed-out) state. Mark not-ready
    // until this user's checks resolve, otherwise the gate would render the main
    // app for a beat before flipping to onboarding for a brand-new user.
    setReady(false);
    setOnboardingCompleteLocally(null);

    let cancelled = false;
    const onboardingKey = onboardingStorageKey(userId);

    // Fast local read so the splash can distinguish new vs returning users
    // before the slower Supabase round-trip finishes.
    void AsyncStorage.getItem(onboardingKey).then((flag) => {
      if (cancelled) return;
      setOnboardingCompleteLocally(flag === "1");
    });

    // Everything below is independent — one storage read and one network
    // round-trip instead of the previous flag -> terms -> profile -> ban chain.
    const bootstrap = async () => {
      const [localFlag, profileRes, termsRes] = await Promise.all([
        AsyncStorage.getItem(onboardingKey),
        supabase
          .from("user_profiles")
          .select("user_id, banned_at, ban_reason")
          .eq("user_id", userId)
          .maybeSingle(),
        supabase
          .from("terms_acceptances")
          .select("user_id")
          .eq("user_id", userId)
          .maybeSingle(),
      ]);
      if (cancelled) return;

      if (profileRes.error) {
        console.warn("SessionBootstrap: profile query failed", profileRes.error.message);
      }
      const profile = profileRes.data as { user_id: string; banned_at: string | null; ban_reason: string | null } | null;
      setBan(
        profile?.banned_at
          ? { banned: true, reason: profile.ban_reason ?? null, at: profile.banned_at }
          : { banned: false, reason: null, at: null }
      );

      if (localFlag === "1") {
        setNeedsOnboarding(false);
        setOnboardingCompleteLocally(true);
      } else {
        // Fallback for reinstalls/new devices where local AsyncStorage is
        // empty: server-side traces mean onboarding is already done.
        const completedOnServer = !!termsRes.data || !!profile;
        if (completedOnServer) {
          void AsyncStorage.setItem(onboardingKey, "1");
          setOnboardingCompleteLocally(true);
          setNeedsOnboarding(false);
        } else {
          setOnboardingCompleteLocally(false);
          setNeedsOnboarding(true);
        }
      }
      setReady(true);
    };

    bootstrap();

    // Re-check ban status when the app returns to the foreground (matches the
    // old useBanStatus behavior) without re-running the onboarding logic.
    const sub = AppState.addEventListener("change", (s) => {
      if (s !== "active") return;
      supabase
        .from("user_profiles")
        .select("banned_at, ban_reason")
        .eq("user_id", userId)
        .maybeSingle()
        .then(({ data, error }) => {
          if (cancelled) return;
          if (error) return;
          setBan(
            data?.banned_at
              ? { banned: true, reason: data.ban_reason ?? null, at: data.banned_at }
              : { banned: false, reason: null, at: null }
          );
        });
    });

    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [isLoaded, isSignedIn, userId]);

  const completeOnboarding = React.useCallback(() => {
    setNeedsOnboarding(false);
    setOnboardingCompleteLocally(true);
  }, []);

  const beginOnboarding = React.useCallback(() => {
    setNeedsOnboarding(true);
    setOnboardingCompleteLocally(false);
  }, []);

  const value = React.useMemo<SessionBootstrap>(
    () => ({
      ready,
      needsOnboarding,
      setNeedsOnboarding,
      completeOnboarding,
      beginOnboarding,
      onboardingCompleteLocally,
      banned: ban.banned,
      banReason: ban.reason,
      bannedAt: ban.at,
    }),
    [ready, needsOnboarding, completeOnboarding, beginOnboarding, onboardingCompleteLocally, ban]
  );

  return <SessionBootstrapContext.Provider value={value}>{children}</SessionBootstrapContext.Provider>;
}
