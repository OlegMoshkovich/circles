import * as React from "react";
import {
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StyleSheet,
  StatusBar,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useSignIn } from "@clerk/clerk-expo";
import { BlurView } from "expo-blur";
import Svg, { Path } from "react-native-svg";
import { RootStackScreenProps } from "../types";

export default function ForgotPasswordScreen({
  navigation,
  route,
}: RootStackScreenProps<"ForgotPassword">) {
  const { signIn, setActive, isLoaded } = useSignIn();
  const [step, setStep] = React.useState<"email" | "reset">("email");
  const [email, setEmail] = React.useState(route.params?.email ?? "");
  const [code, setCode] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [error, setError] = React.useState("");

  async function sendCode() {
    if (!isLoaded) return;
    setError("");
    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: email,
      });
      setStep("reset");
    } catch (err: any) {
      const message = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || err?.message || "Something went wrong";
      setError(message);
    }
  }

  async function resetPassword() {
    if (!isLoaded) return;
    setError("");
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code,
        password: newPassword,
      });
      await setActive({ session: result.createdSessionId });
    } catch (err: any) {
      const message = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || err?.message || "Something went wrong";
      setError(message);
    }
  }

  return (
    <ImageBackground
      source={require("../assets/Background.webp")}
      style={styles.container}
      imageStyle={styles.backgroundImage}
      resizeMode="cover"
    >
      <BlurView intensity={0} tint="light" style={StyleSheet.absoluteFill} />
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
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
        {step === "email" ? (
          <>
            <Text style={styles.titleText}>Reset your</Text>
            <Text style={styles.titleText}>password</Text>
          </>
        ) : (
          <>
            <Text style={styles.titleText}>Check your</Text>
            <Text style={styles.titleText}>email</Text>
          </>
        )}
      </View>

      <View style={styles.formContainer}>
        {step === "email" ? (
          <>
            <Text style={styles.subtitleText}>
              Enter your email and we'll send you a reset code.
            </Text>
            <View style={styles.inputRow}>
              <TextInput
                autoCapitalize="none"
                value={email}
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="rgba(239,237,225,0.55)"
                keyboardType="email-address"
                onChangeText={setEmail}
              />
            </View>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <TouchableOpacity style={styles.primaryButton} onPress={sendCode}>
              <BlurView intensity={28} tint="light" style={StyleSheet.absoluteFill} />
              <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(255,255,255,0.15)" }]} />
              <View style={[StyleSheet.absoluteFill, { borderRadius: 50, borderWidth: 1, borderColor: "rgba(255,255,255,0.35)" }]} />
              <Text style={styles.primaryButtonText}>Send Code</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.subtitleText}>
              Enter the code we sent to {email} and your new password.
            </Text>
            <View style={styles.inputRow}>
              <TextInput
                value={code}
                style={styles.input}
                placeholder="Reset code"
                placeholderTextColor="rgba(239,237,225,0.55)"
                keyboardType="number-pad"
                onChangeText={setCode}
              />
            </View>
            <View style={styles.inputRow}>
              <TextInput
                value={newPassword}
                style={styles.input}
                placeholder="New password"
                placeholderTextColor="rgba(239,237,225,0.55)"
                secureTextEntry
                onChangeText={setNewPassword}
              />
            </View>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <TouchableOpacity style={styles.primaryButton} onPress={resetPassword}>
              <BlurView intensity={28} tint="light" style={StyleSheet.absoluteFill} />
              <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(255,255,255,0.15)" }]} />
              <View style={[StyleSheet.absoluteFill, { borderRadius: 50, borderWidth: 1, borderColor: "rgba(255,255,255,0.35)" }]} />
              <Text style={styles.primaryButtonText}>Reset Password</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity onPress={() => navigation.replace("SignIn")}>
          <Text style={styles.backText}>Back to Sign In</Text>
        </TouchableOpacity>
      </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1, justifyContent: "flex-end" },
  scrollContent: { flexGrow: 1, justifyContent: "flex-end", paddingBottom: 48 },
  backgroundImage: { top: -280, left: -200 },
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
    marginBottom: 28,
    lineHeight: 20,
  },
  formContainer: { paddingHorizontal: 32 },
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
  errorText: {
    color: "#ff6b6b",
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 18,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 36,
  },
  backText: {
    color: "#efede1",
    fontSize: 14,
    fontFamily: "Lora_400Regular",
    textDecorationLine: "underline",
  },
});
