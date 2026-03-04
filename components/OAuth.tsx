import React from "react";
import * as WebBrowser from "expo-web-browser";
import { Text, TouchableOpacity, View, StyleProp, ViewStyle, TextStyle, StyleSheet } from "react-native";
import { useOAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useWamUpBrowser } from "../hooks/useWarmUpBrowser";
import { BlurView } from "expo-blur";

WebBrowser.maybeCompleteAuthSession();

interface OAuthButtonsProps {
  buttonStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export function OAuthButtons({ buttonStyle, textStyle }: OAuthButtonsProps) {
  useWamUpBrowser();

  const { startOAuthFlow } = useOAuth({ strategy: "oauth_google" });

  const onPress = React.useCallback(async () => {
    try {
      const { createdSessionId, setActive } = await startOAuthFlow();
      if (createdSessionId) {
        setActive({ session: createdSessionId });
      }
    } catch (err) {
      console.error("OAuth error", err);
    }
  }, []);

  return (
    <TouchableOpacity style={buttonStyle} onPress={onPress} activeOpacity={0.85}>
      <BlurView intensity={28} tint="light" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(255,255,255,0.18)" }]} />
      <View style={[StyleSheet.absoluteFill, { borderRadius: 50, borderWidth: 1, borderColor: "rgba(255,255,255,0.35)" }]} />
<View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Ionicons name="logo-google" size={18} color="#fff" />
        <Text style={textStyle}>Continue with Google</Text>
      </View>
    </TouchableOpacity>
  );
}
