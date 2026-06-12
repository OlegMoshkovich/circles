import React from "react";
import { Image, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GradientRingLoader } from "./src/components/loaders/GradientRingLoader";
import { ErrorBoundary } from "./src/components/ErrorBoundary";
import useCachedResources from "./hooks/useCachedResources";
import Navigation from "./navigation";
import { ClerkProvider, useAuth, useUser } from "@clerk/clerk-expo";
import { tokenCache } from "./cache";
import * as SplashScreen from "expo-splash-screen";
import { LanguageProvider } from "./src/i18n/LanguageContext";
import { NotificationProvider } from "./src/contexts/NotificationContext";
import { BackgroundProvider } from "./src/contexts/BackgroundContext";
import { ReportProvider } from "./src/contexts/ReportProvider";
import { supabase, setSupabaseTokenGetter } from "./lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  SessionBootstrapProvider,
  useSessionBootstrap,
  onboardingStorageKey,
} from "./src/contexts/SessionBootstrapContext";
import {
  OnboardingRestartContext,
  OnboardingRestartOptions,
} from "./src/contexts/OnboardingRestartContext";

SplashScreen.preventAutoHideAsync();

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";

// Loaded lazily: the onboarding bundle (incl. react-native-maps) is only
// parsed for users who actually need onboarding, keeping it off the cold
// start path for everyone else.
const OnboardingScreen = React.lazy(() => import("./screens/OnboardingScreen"));

// Shown while SessionBootstrap resolves the signed-in user's onboarding/ban
// state. On cold start the native splash sits on top of this; it's most
// visible right after onboarding, where the new account's startup checks can
// take a while. Rendering the same splash image (full-screen cover) keeps that
// "setting up" wait looking like a seamless continuation of the splash rather
// than a bare spinner, with a subtle loader near the bottom to signal progress.
function SessionLoadingScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: "#ffffff" }}>
      <Image
        source={require("./assets/splash.png")}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 64, alignItems: "center" }}>
        <GradientRingLoader size={32} strokeWidth={6} />
      </View>
    </View>
  );
}

// Shows OnboardingScreen for new users; renders children once complete.
// The actual onboarding/ban checks run in SessionBootstrapProvider as one
// parallel batch.
function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const { ready, needsOnboarding, setNeedsOnboarding } = useSessionBootstrap();

  // Navigation (which normally hides the splash) doesn't mount on the
  // onboarding path, so release the splash screen here.
  React.useEffect(() => {
    if (ready && needsOnboarding) {
      SplashScreen.hideAsync();
    }
  }, [ready, needsOnboarding]);

  const restart = React.useCallback(
    async (options?: OnboardingRestartOptions) => {
      if (!user) return;
      if (options?.clearTermsAcceptance) {
        await supabase.from("terms_acceptances").delete().eq("user_id", user.id);
      }
      await AsyncStorage.removeItem(onboardingStorageKey(user.id));
      setNeedsOnboarding(true);
    },
    [user, setNeedsOnboarding]
  );
  const restartValue = React.useMemo(() => ({ restart }), [restart]);

  if (!ready) return <SessionLoadingScreen />;
  return (
    <OnboardingRestartContext.Provider value={restartValue}>
      {needsOnboarding ? (
        <React.Suspense fallback={null}>
          <OnboardingScreen onComplete={() => setNeedsOnboarding(false)} />
        </React.Suspense>
      ) : (
        children
      )}
    </OnboardingRestartContext.Provider>
  );
}

// Registers the Clerk JWT getter so the shared Supabase client authenticates
// every request as the signed-in user (required for RLS policies to recognize
// the user via auth.jwt() ->> 'sub').
function SupabaseAuthBridge() {
  const { getToken } = useAuth();
  React.useEffect(() => {
    setSupabaseTokenGetter(() => getToken({ template: "supabase" }));
  }, [getToken]);
  return null;
}

// Upserts the signed-in user's name to user_profiles on every app open.
// Deferred a few seconds so it doesn't compete with the startup queries.
function ProfileSync() {
  const { user } = useUser();
  React.useEffect(() => {
    if (!user) return;
    const displayName = user.fullName ?? user.firstName ?? null;
    if (!displayName) return;
    const avatarUrl = (user.externalAccounts?.find((a: any) => a.provider === "oauth_google" || a.provider === "google") as any)?.imageUrl ?? user.imageUrl ?? null;
    const timer = setTimeout(() => {
      supabase.from("user_profiles").upsert(
        { user_id: user.id, display_name: displayName, avatar_url: avatarUrl, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      ).then(() => {});
    }, 3000);
    return () => clearTimeout(timer);
  }, [user?.id]);
  return null;
}

export default function App() {
  const isLoadingComplete = useCachedResources();

  if (!isLoadingComplete) {
    return null;
  } else {
    return (
      <LanguageProvider>
        <BackgroundProvider>
        <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
          <SafeAreaProvider>
            <SupabaseAuthBridge />
            <SessionBootstrapProvider>
              <ReportProvider>
                <NotificationProvider>
                  <ProfileSync />
                  <ErrorBoundary>
                    <OnboardingGate>
                      <Navigation />
                    </OnboardingGate>
                  </ErrorBoundary>
                  <StatusBar />
                </NotificationProvider>
              </ReportProvider>
            </SessionBootstrapProvider>
          </SafeAreaProvider>
        </ClerkProvider>
        </BackgroundProvider>
      </LanguageProvider>
    );
  }
}
