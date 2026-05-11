import React from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import useCachedResources from "./hooks/useCachedResources";
import Navigation from "./navigation";
import { ClerkProvider, useUser } from "@clerk/clerk-expo";
import { tokenCache } from "./cache";
import * as SplashScreen from "expo-splash-screen";
import { LanguageProvider } from "./src/i18n/LanguageContext";
import { NotificationProvider } from "./src/contexts/NotificationContext";
import { BackgroundProvider } from "./src/contexts/BackgroundContext";
import { supabase } from "./lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import OnboardingScreen from "./screens/OnboardingScreen";
import {
  OnboardingRestartContext,
  OnboardingRestartOptions,
} from "./src/contexts/OnboardingRestartContext";

SplashScreen.preventAutoHideAsync();

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";

// Shows OnboardingScreen for new users; renders children once complete
function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { user, isSignedIn } = useUser();
  const [ready, setReady] = React.useState(false);
  const [needsOnboarding, setNeedsOnboarding] = React.useState(false);

  React.useEffect(() => {
    if (!isSignedIn || !user) {
      setNeedsOnboarding(false);
      setReady(true);
      return;
    }
    let cancelled = false;
    (async () => {
      const onboardingKey = `onboarding_v1_${user.id}`;
      const localFlag = await AsyncStorage.getItem(onboardingKey);
      if (cancelled) return;

      if (localFlag === "1") {
        setNeedsOnboarding(false);
        setReady(true);
        return;
      }

      // Fallback for reinstalls/new devices where local AsyncStorage is empty.
      // If we already have server-side onboarding traces, treat onboarding as done.
      const [termsRes, profileRes] = await Promise.all([
        supabase
          .from("terms_acceptances")
          .select("user_id")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("user_profiles")
          .select("user_id")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);
      if (cancelled) return;

      const completedOnServer = !!termsRes.data || !!profileRes.data;
      if (completedOnServer) {
        await AsyncStorage.setItem(onboardingKey, "1");
      }
      setNeedsOnboarding(!completedOnServer);
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [isSignedIn, user?.id]);

  async function restart(options?: OnboardingRestartOptions) {
    if (!user) return;
    if (options?.clearTermsAcceptance) {
      await supabase.from("terms_acceptances").delete().eq("user_id", user.id);
    }
    await AsyncStorage.removeItem(`onboarding_v1_${user.id}`);
    setNeedsOnboarding(true);
  }

  if (!ready) return null;
  return (
    <OnboardingRestartContext.Provider value={{ restart }}>
      {needsOnboarding
        ? <OnboardingScreen onComplete={() => setNeedsOnboarding(false)} />
        : children}
    </OnboardingRestartContext.Provider>
  );
}

// Upserts the signed-in user's name to user_profiles on every app open
function ProfileSync() {
  const { user } = useUser();
  React.useEffect(() => {
    if (!user) return;
    const displayName = user.fullName ?? user.firstName ?? null;
    if (!displayName) return;
    const avatarUrl = (user.externalAccounts?.find((a: any) => a.provider === "oauth_google" || a.provider === "google") as any)?.imageUrl ?? user.imageUrl ?? null;
    supabase.from("user_profiles").upsert(
      { user_id: user.id, display_name: displayName, avatar_url: avatarUrl, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    ).then(() => {});
  }, [user?.id]);
  return null;
}

export default function App() {
  const isLoadingComplete = useCachedResources();

  React.useEffect(() => {
    if (isLoadingComplete) {
      SplashScreen.hideAsync();
    }
  }, [isLoadingComplete]);

  if (!isLoadingComplete) {
    return null;
  } else {
    return (
      <LanguageProvider>
        <BackgroundProvider>
        <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
          <SafeAreaProvider>
            <NotificationProvider>
              <ProfileSync />
              <OnboardingGate>
                <Navigation />
              </OnboardingGate>
              <StatusBar />
            </NotificationProvider>
          </SafeAreaProvider>
        </ClerkProvider>
        </BackgroundProvider>
      </LanguageProvider>
    );
  }
}
