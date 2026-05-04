import * as React from "react";
import {
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StyleSheet,
  StatusBar,
  ImageBackground,
} from "react-native";
import { useSignUp } from "@clerk/clerk-expo";
import { RootStackScreenProps } from "../types";
import { log } from "../logger";
import { BlurView } from "expo-blur";
import Svg, { Path } from "react-native-svg";

export default function VerifyCodeScreen({
  navigation,
}: RootStackScreenProps<"VerifyCode">) {
  const { isLoaded, signUp, setActive } = useSignUp();
  const [code, setCode] = React.useState("");

  const onPress = async () => {
    if (!isLoaded) return;
    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({ code });
      await setActive({ session: completeSignUp.createdSessionId });
    } catch (err: any) {
      log("Error:> " + err?.status || "");
      log("Error:> " + err?.errors ? JSON.stringify(err.errors) : err);
    }
  };

  return (
    <ImageBackground
      source={require("../assets/Background.webp")}
      style={styles.container}
      imageStyle={styles.backgroundImage}
      resizeMode="cover"
    >
      <BlurView intensity={0} tint="light" style={StyleSheet.absoluteFill} />
      <StatusBar barStyle="dark-content" />

      <View style={styles.logoContainer}>
        <Svg width={26} height={40} viewBox="0 0 132 175" fill="none">
          <Path
            d="M128.5 3.0005L66.1263 112.457C65.7404 113.135 64.7625 113.13 64.3836 112.448L3.5 3.00048"
            stroke="#efede1"
            strokeWidth={6}
            strokeLinecap="round"
          />
          <Path
            d="M3 171.5V47.8296C3 46.7998 4.36875 46.4423 4.87231 47.3407L64.6312 153.95C65.0124 154.631 65.9906 154.632 66.3741 153.953L126.629 47.3112C127.135 46.4162 128.5 46.7751 128.5 47.8031V171.5"
            stroke="#efede1"
            strokeWidth={6}
            strokeLinecap="round"
          />
        </Svg>
      </View>

      <View style={styles.titleContainer}>
        <Text style={styles.titleText}>Check your</Text>
        <Text style={styles.titleText}>email</Text>
      </View>

      <View style={styles.formContainer}>
        <Text style={styles.subtitleText}>
          We sent a verification code to your email address.
        </Text>

        <View style={styles.inputRow}>
          <TextInput
            value={code}
            style={styles.input}
            placeholder="Verification code"
            placeholderTextColor="rgba(239,237,225,0.55)"
            keyboardType="number-pad"
            onChangeText={setCode}
          />
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={onPress}>
          <BlurView intensity={28} tint="light" style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(255,255,255,0.15)" }]} />
          <View style={[StyleSheet.absoluteFill, { borderRadius: 50, borderWidth: 1, borderColor: "rgba(255,255,255,0.35)" }]} />
          <Text style={styles.primaryButtonText}>Verify Email</Text>
        </TouchableOpacity>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-end",
    paddingBottom: 48,
  },
  backgroundImage: {
    top: -280,
    left: -200,
  },
  logoContainer: {
    alignItems: "center",
    paddingHorizontal: 32,
    paddingBottom: 100,
  },
  titleContainer: {
    paddingHorizontal: 32,
    paddingBottom: 16,
  },
  titleText: {
    fontSize: 36,
    fontFamily: "Lora_400Regular",
    color: "#efede1",
    lineHeight: 44,
  },
  subtitleText: {
    color: "rgba(239,237,225,0.65)",
    fontSize: 14,
    fontFamily: "Lora_400Regular",
    marginBottom: 32,
    lineHeight: 20,
  },
  formContainer: {
    paddingHorizontal: 32,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(239,237,225,0.4)",
    marginBottom: 28,
    paddingBottom: 8,
  },
  input: {
    flex: 1,
    color: "#efede1",
    fontSize: 16,
    height: 36,
    letterSpacing: 4,
  },
  primaryButton: {
    borderRadius: 50,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  primaryButtonText: {
    color: "#efede1",
    fontSize: 16,
    fontWeight: "600",
  },
});
