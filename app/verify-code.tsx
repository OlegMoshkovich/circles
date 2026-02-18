import React from "react";
import { useRouter } from "expo-router";
import VerifyCodeScreen from "../screens/VerifyCodeScreen";

function useAuthNavigation() {
  const router = useRouter();
  return React.useMemo(
    () => ({
      replace: (name: string) => {
        if (name === "SignIn") router.replace("/sign-in");
        if (name === "SignUp") router.replace("/sign-up");
      },
      navigate: (name: string) => {
        if (name === "VerifyCode") router.push("/verify-code");
        if (name === "SignIn") router.push("/sign-in");
        if (name === "SignUp") router.push("/sign-up");
      },
    }),
    [router]
  );
}

export default function VerifyCodeRoute() {
  const navigation = useAuthNavigation();
  return (
    <VerifyCodeScreen
      navigation={navigation as any}
      route={{ key: "VerifyCode", name: "VerifyCode", params: undefined }}
    />
  );
}
