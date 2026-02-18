import React from "react";
import { Slot } from "expo-router";
import { ClerkLoaded, ClerkProvider } from "@clerk/clerk-expo";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";

import { tokenCache } from "../cache";
import useCachedResources from "../hooks/useCachedResources";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";

export default function RootLayout() {
  const isLoadingComplete = useCachedResources();

  React.useEffect(() => {
    SplashScreen.preventAutoHideAsync();
  }, []);

  if (!isLoadingComplete) {
    return null;
  }

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <SafeAreaProvider>
        <ClerkLoaded>
          <Slot />
        </ClerkLoaded>
        <StatusBar />
      </SafeAreaProvider>
    </ClerkProvider>
  );
}
