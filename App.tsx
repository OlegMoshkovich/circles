import React from "react";
import { Animated, StyleSheet, View } from "react-native";
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

// Single source of truth for the cold-start / login loading experience.
//
// The previous design spread the splash across two separate gates (one that
// *returned* the splash, one that *overlaid* it). During the login transition
// those gates mounted and unmounted, and because the native splash is already
// gone by then, any frame where neither gate painted showed through as a blank
// white screen. This collapses everything into ONE persistent overlay node that
// stays mounted continuously until the first real screen is ready, so there is
// never an unpainted frame:
//
//   - signed out                 -> auth screens, no overlay
//   - signed in, bootstrapping   -> overlay (nothing else known yet)
//   - signed in, needs onboarding-> onboarding (Suspense fallback = splash)
//   - signed in, banned          -> banned screen, no overlay
//   - signed in, home            -> overlay until the home tab's first load
//
// A safety timeout reveals whatever is underneath so a stalled startup can never
// strand the user on the splash.
const SPLASH_FADE_DURATION = 400;

function AppGate({ children }: { children: React.ReactNode }) {
  const { user, isSignedIn, isLoaded } = useUser();
  const { ready, needsOnboarding, completeOnboarding, beginOnboarding, onboardingCompleteLocally, banned } =
    useSessionBootstrap();
  const { homeReady, markHomeReady } = useHomeReady();
  const [forceReveal, setForceReveal] = React.useState(false);
  // Keep showing the setup line through onboarding and the first home fetch.
  const firstSetupActive = React.useRef(false);
  // Splash overlay is kept mounted across one extra render so we can fade it
  // out (instead of cutting to the destination) when loading finishes, and
  // fade it back in if a later transition (e.g. sign-out -> sign-in) makes it
  // reappear.
  const splashOpacity = React.useRef(new Animated.Value(1)).current;
  const [splashMounted, setSplashMounted] = React.useState(true);
  // Skip the fade-in on cold start: the native splash is still painted under
  // us at that moment, and fading in would leave a one-frame gap of bare app.
  const isInitialSplash = React.useRef(true);

  // Hand the native splash off to our own (identical) JS splash overlay as soon
  // as Clerk has restored. The overlay is already mounted underneath at that
  // point, so the handoff is seamless and nothing white shows through.
  React.useEffect(() => {
    if (isLoaded) SplashScreen.hideAsync();
  }, [isLoaded]);

  // Never let a hung network / failed home fetch trap the user on the splash.
  React.useEffect(() => {
    if (!isSignedIn) {
      setForceReveal(false);
      return;
    }
    const timer = setTimeout(() => setForceReveal(true), 10000);
    return () => clearTimeout(timer);
  }, [isSignedIn]);

  React.useEffect(() => {
    if (!isSignedIn) {
      firstSetupActive.current = false;
    }
  }, [isSignedIn]);

  React.useEffect(() => {
    if (needsOnboarding) firstSetupActive.current = true;
  }, [needsOnboarding]);

  React.useEffect(() => {
    if (homeReady) firstSetupActive.current = false;
  }, [homeReady]);

  const isNewUserSetup =
    isSignedIn &&
    (needsOnboarding ||
      (!ready && onboardingCompleteLocally === false) ||
      (firstSetupActive.current && ready && !needsOnboarding && !banned && !homeReady));

  const setupStatusMessage = isNewUserSetup ? "Setting up your app…" : undefined;

  const restart = React.useCallback(
    async (options?: OnboardingRestartOptions) => {
      if (!user) return;
      if (options?.clearTermsAcceptance) {
        await supabase.from("terms_acceptances").delete().eq("user_id", user.id);
      }
      await AsyncStorage.removeItem(onboardingStorageKey(user.id));
      firstSetupActive.current = true;
      beginOnboarding();
    },
    [user, beginOnboarding]
  );
  const restartValue = React.useMemo(() => ({ restart }), [restart]);

  // What to paint underneath the overlay. While signed in but not yet
  // bootstrapped the destination (onboarding vs home) is unknown, so render
  // nothing and let the overlay cover it.
  let content: React.ReactNode;
  if (!isSignedIn) {
    content = children; // Navigation -> auth stack
  } else if (!ready) {
    content = null; // covered by the splash overlay
  } else if (needsOnboarding) {
    content = (
      <React.Suspense fallback={<SplashLoadingView statusMessage={setupStatusMessage} />}>
        <OnboardingScreen onComplete={completeOnboarding} />
      </React.Suspense>
    );
  } else {
    content = children; // Navigation -> home (or banned)
  }

  // Whether the branded splash overlay is showing.
  let splashVisible: boolean;
  if (!isLoaded) {
    splashVisible = true; // Clerk still restoring the session
  } else if (!isSignedIn) {
    splashVisible = false; // show the auth screen immediately
  } else if (!ready) {
    splashVisible = true; // bootstrapping onboarding/ban state
  } else if (needsOnboarding) {
    splashVisible = false; // the Suspense fallback already shows the splash
  } else if (banned) {
    splashVisible = false; // banned screen has no home load to wait on
  } else {
    splashVisible = !(homeReady || forceReveal); // home tab's first load
  }

  // Drive the fade in both directions. When loading ends we animate to 0 then
  // unmount; when it starts again we mount at 0 and animate to 1. The very
  // first appearance skips the fade-in so the JS splash takes over the native
  // splash without a flicker.
  React.useEffect(() => {
    if (splashVisible) {
      setSplashMounted(true);
      if (isInitialSplash.current) {
        isInitialSplash.current = false;
        splashOpacity.setValue(1);
        return;
      }
      splashOpacity.setValue(0);
      const animation = Animated.timing(splashOpacity, {
        toValue: 1,
        duration: SPLASH_FADE_DURATION,
        useNativeDriver: true,
      });
      animation.start();
      return () => animation.stop();
    }
    isInitialSplash.current = false;
    const animation = Animated.timing(splashOpacity, {
      toValue: 0,
      duration: SPLASH_FADE_DURATION,
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (finished) setSplashMounted(false);
    });
    return () => animation.stop();
  }, [splashVisible, splashOpacity]);

  return (
    <OnboardingRestartContext.Provider value={restartValue}>
      <View style={{ flex: 1 }}>
        {content}
        {splashMounted && (
          <Animated.View
            style={[StyleSheet.absoluteFill, { opacity: splashOpacity }]}
            pointerEvents={splashVisible ? "auto" : "none"}
          >
            <SplashLoadingView statusMessage={setupStatusMessage} />
          </Animated.View>
        )}
      </View>
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
                    <AppGate>
                      <Navigation />
                    </AppGate>
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
