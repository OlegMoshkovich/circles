import React from "react";
import { StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SplashLoadingView } from "./src/components/loaders/SplashLoadingView";
import { HomeReadyProvider, useHomeReady } from "./src/contexts/HomeReadyContext";
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

// Keeps the branded splash overlay up until the home tab has loaded its first
// batch of data. Without this, `ready` flips true as soon as the onboarding/ban
// checks resolve and the home screen mounts -- but its own (slower) data fetch
// then shows the themed app background with a lone spinner, a jarring foggy
// intermediate between the splash and the populated home. Overlaying the splash
// until home is ready makes the cold start go straight from splash to content.
// A safety timeout reveals the app regardless so a stalled/failed home load can
// never leave the user stranded on the splash.
function HomeLoadingGate({ children }: { children: React.ReactNode }) {
  const { isSignedIn } = useUser();
  const { homeReady, markHomeReady } = useHomeReady();
  // Only signed-in users land on the home tab; for the auth screens there is no
  // home load to wait on, so never overlay the splash there (CirclesScreen --
  // which clears the gate -- never mounts).
  const showOverlay = !!isSignedIn && !homeReady;
  React.useEffect(() => {
    if (!showOverlay) return;
    const timer = setTimeout(markHomeReady, 8000);
    return () => clearTimeout(timer);
  }, [showOverlay, markHomeReady]);
  return (
    <View style={{ flex: 1 }}>
      {children}
      {showOverlay && (
        <View style={StyleSheet.absoluteFill}>
          <SplashLoadingView />
        </View>
      )}
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

  if (!ready) return <SplashLoadingView />;
  return (
    <OnboardingRestartContext.Provider value={restartValue}>
      {needsOnboarding ? (
        // The onboarding bundle is lazy (it pulls in react-native-maps), so the
        // chunk can take a beat -- or stall -- to load. A null fallback shows a
        // blank white screen during that window (the native splash is already
        // hidden by the effect above); render the branded splash instead so the
        // wait looks intentional and a slow load never looks like a frozen app.
        <React.Suspense fallback={<SplashLoadingView />}>
          <OnboardingScreen onComplete={() => setNeedsOnboarding(false)} />
        </React.Suspense>
      ) : (
        <HomeLoadingGate>{children}</HomeLoadingGate>
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
      // Outermost so a render-time throw in ANY provider below (Clerk session
      // restore, bootstrap, notifications, ...) surfaces the recoverable error
      // UI instead of unmounting the whole tree to a blank white screen.
      <ErrorBoundary>
        <LanguageProvider>
        <BackgroundProvider>
        <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
          <SafeAreaProvider>
            <SupabaseAuthBridge />
            <SessionBootstrapProvider>
              <ReportProvider>
                <NotificationProvider>
                  <HomeReadyProvider>
                    <ProfileSync />
                    <OnboardingGate>
                      <Navigation />
                    </OnboardingGate>
                    <StatusBar />
                  </HomeReadyProvider>
                </NotificationProvider>
              </ReportProvider>
            </SessionBootstrapProvider>
          </SafeAreaProvider>
        </ClerkProvider>
        </BackgroundProvider>
        </LanguageProvider>
      </ErrorBoundary>
    );
  }
}
