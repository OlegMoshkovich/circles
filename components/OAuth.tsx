import React from "react";
import * as WebBrowser from "expo-web-browser";
import { Text, TouchableOpacity, View, StyleProp, ViewStyle, TextStyle, StyleSheet } from "react-native";
import { useOAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useWamUpBrowser } from "../hooks/useWarmUpBrowser";
import { BlurView } from "expo-blur";
import type { OAuthStrategy } from "@clerk/types";
import { log } from "../logger";

WebBrowser.maybeCompleteAuthSession();

interface OAuthButtonsProps {
  buttonStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  strategy?: OAuthStrategy;
  buttonText?: string;
  iconName?: React.ComponentProps<typeof Ionicons>["name"];
  onError?: (message: string) => void;
}

export function OAuthButtons({
  buttonStyle,
  textStyle,
  strategy = "oauth_google",
  buttonText = "Continue with Google",
  iconName = "logo-google",
  onError,
}: OAuthButtonsProps) {
  useWamUpBrowser();

  const { startOAuthFlow } = useOAuth({ strategy });

  const onPress = React.useCallback(async () => {
    try {
      const { createdSessionId, setActive } = await startOAuthFlow();
      if (createdSessionId && setActive) {
        setActive({ session: createdSessionId });
      }
    } catch (err: any) {
      const code = err?.errors?.[0]?.code ?? err?.code ?? "oauth_error";
      const message =
        err?.errors?.[0]?.longMessage ||
        err?.errors?.[0]?.message ||
        err?.message ||
        "OAuth sign-in failed";
      log(`OAuth error (${String(strategy)} | ${code}): ${message}`);
      onError?.(message);
    }
  }, [onError, startOAuthFlow, strategy]);

  return (
    <TouchableOpacity style={buttonStyle} onPress={onPress} activeOpacity={0.85}>
      <BlurView intensity={28} tint="light" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(255,255,255,0.18)" }]} />
      <View style={[StyleSheet.absoluteFill, { borderRadius: 50, borderWidth: 1, borderColor: "rgba(255,255,255,0.35)" }]} />
<View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Ionicons name={iconName} size={18} color="#fff" />
        <Text style={textStyle}>{buttonText}</Text>
      </View>
    </TouchableOpacity>
  );
}
