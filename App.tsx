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

SplashScreen.preventAutoHideAsync();

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";

export const OnboardingRestartContext = React.createContext<{ restart: () => void }>({ restart: () => {} });

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
    AsyncStorage.getItem(`onboarding_v1_${user.id}`).then((val) => {
      setNeedsOnboarding(val !== "1");
      setReady(true);
    });
  }, [isSignedIn, user?.id]);

  function restart() {
    if (!user) return;
    AsyncStorage.removeItem(`onboarding_v1_${user.id}`).then(() => setNeedsOnboarding(true));
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
    supabase.from("user_profiles").upsert(
      { user_id: user.id, display_name: displayName, updated_at: new Date().toISOString() },
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
