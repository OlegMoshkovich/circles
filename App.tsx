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
import { supabase } from "./lib/supabase";

SplashScreen.preventAutoHideAsync();

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";

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
        <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
          <SafeAreaProvider>
            <NotificationProvider>
              <ProfileSync />
              <Navigation />
              <StatusBar />
            </NotificationProvider>
          </SafeAreaProvider>
        </ClerkProvider>
      </LanguageProvider>
    );
  }
}
