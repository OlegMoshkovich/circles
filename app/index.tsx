import { Redirect } from "expo-router";
import React from "react";
import { useUser } from "@clerk/clerk-expo";
import * as SplashScreen from "expo-splash-screen";

export default function Index() {
  const { isSignedIn, isLoaded } = useUser();

  React.useEffect(() => {
    if (isLoaded) {
      SplashScreen.hideAsync();
    }
  }, [isLoaded]);

  if (!isLoaded) {
    return null;
  }

  if (isSignedIn) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/sign-in" />;
}
