import React from "react";
import { useRouter } from "expo-router";
import SignInScreen from "../screens/SignInScreen";

function useAuthNavigation() {
  const router = useRouter();
  return React.useMemo(
    () => ({
      replace: (name: string) => {
        if (name === "SignUp") router.replace("/sign-up");
        else if (name === "SignIn") router.replace("/sign-in");
      },
      navigate: (name: string) => {
        if (name === "VerifyCode") router.push("/verify-code");
        if (name === "SignUp") router.push("/sign-up");
        if (name === "SignIn") router.push("/sign-in");
      },
    }),
    [router]
  );
}

export default function SignInRoute() {
  const navigation = useAuthNavigation();
  return <SignInScreen navigation={navigation as any} route={{ key: "SignIn", name: "SignIn", params: undefined }} />;
}
