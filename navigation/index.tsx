/**
 * If you are not familiar with React Navigation, refer to the "Fundamentals" guide:
 * https://reactnavigation.org/docs/getting-started
 *
 */
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import * as React from "react";
import { View } from "react-native";

import AccountReviewBanner from "../components/AccountReviewBanner";
import BannedScreen from "../screens/BannedScreen";
import { useSessionBootstrap } from "../src/contexts/SessionBootstrapContext";
import SignUpScreen from "../screens/SignUpScreen";
import SignInScreen from "../screens/SignInScreen";
import VerifyCodeScreen from "../screens/VerifyCodeScreen";
import ForgotPasswordScreen from "../screens/ForgotPasswordScreen";
import MyProfileScreen from "../screens/MyProfileScreen";
import DeleteAccountScreen from "../screens/DeleteAccountScreen";
import EventDetailScreen from "../screens/EventDetailScreen";
import PromptDetailScreen from "../screens/PromptDetailScreen";
import CircleDetailScreen from "../screens/CircleDetailScreen";
import TabNavigator from "./TabNavigator";
import { RootStackParamList } from "../types";
import LinkingConfiguration from "./LinkingConfiguration";
import { navigationRef } from "./navigationRef";
import { ClerkLoaded, useUser } from "@clerk/clerk-expo";
import * as SplashScreen from "expo-splash-screen";

export default function Navigation() {
  return (
    <NavigationContainer ref={navigationRef} linking={LinkingConfiguration}>
      <RootNavigator />
    </NavigationContainer>
  );
}

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Read more about the protected routes pattern in React Native
 *
 * https://reactnavigation.org/docs/auth-flow
 */
const RootNavigator = () => {
  const { isSignedIn, isLoaded } = useUser();
  // Ban status is resolved in SessionBootstrapProvider (one batched startup
  // query); by the time this mounts it is already available.
  const { banned, banReason, bannedAt } = useSessionBootstrap();

  React.useEffect(() => {
    if (isLoaded) {
      SplashScreen.hideAsync();
    }
  }, [isLoaded]);

  if (isSignedIn && banned) {
    return (
      <ClerkLoaded>
        <Stack.Navigator>
          <Stack.Screen name="Banned" options={{ headerShown: false }}>
            {() => <BannedScreen reason={banReason} bannedAt={bannedAt} />}
          </Stack.Screen>
        </Stack.Navigator>
      </ClerkLoaded>
    );
  }

  return (
    <ClerkLoaded>
      <View style={{ flex: 1 }}>
        {isSignedIn && <AccountReviewBanner />}
        <Stack.Navigator>
          {isSignedIn ? (
          <>
            <Stack.Screen
              name="Home"
              component={TabNavigator}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="MyProfile"
              component={MyProfileScreen}
              options={{ title: "MyProfile" }}
            />
            <Stack.Screen
              name="DeleteAccount"
              component={DeleteAccountScreen}
              options={{ title: "Delete Account" }}
            />
            <Stack.Screen
              name="EventDetail"
              component={EventDetailScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="PromptDetail"
              component={PromptDetailScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="CircleDetail"
              component={CircleDetailScreen}
              options={{ headerShown: false }}
            />
          </>
        ) : (
          <>
            <Stack.Screen
              name="SignIn"
              component={SignInScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="SignUp"
              component={SignUpScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="VerifyCode"
              component={VerifyCodeScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="ForgotPassword"
              component={ForgotPasswordScreen}
              options={{ headerShown: false }}
            />
          </>
        )}
        </Stack.Navigator>
      </View>
    </ClerkLoaded>
  );
};
