import React from "react";
import * as WebBrowser from "expo-web-browser";
import { Text, TouchableOpacity, View, StyleProp, ViewStyle, TextStyle } from "react-native";
import { useOAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useWamUpBrowser } from "../hooks/useWarmUpBrowser";

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
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Ionicons name="logo-google" size={18} color="#2b2b2b" />
        <Text style={textStyle}>Continue with Google</Text>
      </View>
    </TouchableOpacity>
  );
}
