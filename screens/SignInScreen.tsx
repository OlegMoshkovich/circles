import React from "react";
import {
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StyleSheet,
  StatusBar,
  ImageBackground,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useSignIn } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { log } from "../logger";
import { RootStackScreenProps } from "../types";
import { OAuthButtons } from "../components/OAuth";
import { BlurView } from "expo-blur";
import Svg, { Path } from "react-native-svg";

export default function SignInScreen({
  navigation,
}: RootStackScreenProps<"SignIn">) {
  const { signIn, setActive, isLoaded } = useSignIn();

  const [emailAddress, setEmailAddress] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [rememberMe, setRememberMe] = React.useState(false);
  const [error, setError] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [debugInfo, setDebugInfo] = React.useState("");
  const [needsSecondFactor, setNeedsSecondFactor] = React.useState(false);
  const [secondFactorCode, setSecondFactorCode] = React.useState("");
  const [secondFactorStrategy, setSecondFactorStrategy] = React.useState<string | null>(null);

  const onSignInPress = async () => {
    if (submitting) return;
    if (!isLoaded) {
      const msg = "Clerk not loaded yet. Please wait a second and try again.";
      setError(msg);
      setDebugInfo(msg);
      log(msg);
      return;
    }
    if (!emailAddress.trim() || !password) {
      const msg = "Please enter both username/email and password.";
      setError(msg);
      setDebugInfo(msg);
      return;
    }
    setError("");
    setDebugInfo("Starting sign-in request...");
    setNeedsSecondFactor(false);
    setSubmitting(true);
    try {
      const identifier = emailAddress.trim();
      log(`Sign in start for identifier: ${identifier}`);
      const completeSignIn = await signIn.create({
        identifier,
        password,
      });
      const status = (completeSignIn as any)?.status ?? "unknown";
      const createdSessionId = completeSignIn?.createdSessionId ?? null;
      const firstFactorVerificationStatus = (completeSignIn as any)?.firstFactorVerification?.status ?? "n/a";
      const responseSummary = `signIn.create status=${status}, firstFactor=${firstFactorVerificationStatus}, hasSession=${!!createdSessionId}`;
      log(responseSummary);
      setDebugInfo(responseSummary);

      if (status === "needs_second_factor") {
        const secondFactors = ((signIn as any)?.supportedSecondFactors ?? []) as Array<{ strategy?: string }>;
        const strategy =
          secondFactors.find((f) => f?.strategy === "totp")?.strategy ??
          secondFactors[0]?.strategy ??
          "totp";
        setSecondFactorStrategy(strategy);
        setNeedsSecondFactor(true);
        const msg = "Two-factor code required. Enter your authenticator/verification code below.";
        setError(msg);
        setDebugInfo(`${responseSummary}\nSecond factor strategy: ${strategy}`);
        return;
      }

      if (!createdSessionId) {
        const msg = "Login did not return a session. Your account may require an additional step (verification/challenge).";
        setError(msg);
        setDebugInfo(`${responseSummary}\n${msg}`);
        return;
      }

      log(`Calling setActive with session ${createdSessionId}`);
      await setActive({ session: createdSessionId });
      setDebugInfo(`${responseSummary}\nsetActive succeeded`);
    } catch (err: any) {
      const message = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || err?.message || "Something went wrong";
      setError(message);
      const clerkCode = err?.errors?.[0]?.code || "unknown_code";
      const longMessage = err?.errors?.[0]?.longMessage || "";
      const debug = `Sign in failed (${clerkCode}): ${message}${longMessage && longMessage !== message ? ` | ${longMessage}` : ""}`;
      setDebugInfo(debug);
      log(debug);
    } finally {
      setSubmitting(false);
    }
  };

  const onSecondFactorPress = async () => {
    if (!isLoaded || submitting) return;
    const code = secondFactorCode.trim();
    if (!code) {
      setError("Please enter your verification code.");
      return;
    }
    const strategy = secondFactorStrategy ?? "totp";
    setError("");
    setSubmitting(true);
    try {
      log(`Attempting second factor with strategy: ${strategy}`);
      const result = await (signIn as any).attemptSecondFactor({
        strategy,
        code,
      });
      const status = result?.status ?? "unknown";
      const createdSessionId = result?.createdSessionId ?? null;
      const summary = `attemptSecondFactor status=${status}, hasSession=${!!createdSessionId}`;
      log(summary);
      setDebugInfo(summary);

      if (status === "complete" && createdSessionId) {
        await setActive({ session: createdSessionId });
        return;
      }

      setError("Verification code was not accepted. Please try again.");
    } catch (err: any) {
      const message = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || err?.message || "Second-factor verification failed";
      setError(message);
      const clerkCode = err?.errors?.[0]?.code || "unknown_code";
      const debug = `Second factor failed (${clerkCode}): ${message}`;
      setDebugInfo(debug);
      log(debug);
    } finally {
      setSubmitting(false);
    }
  };

  const onSignUpPress = () => navigation.replace("SignUp");

  return (
    <ImageBackground
      source={require("../assets/Background.webp")}
      style={styles.container}
      imageStyle={styles.backgroundImage}
      resizeMode="cover"
    >
      <BlurView intensity={0} tint="light" style={StyleSheet.absoluteFill} />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
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
        <Text style={styles.titleText}>Welcome to</Text>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Text style={styles.titleText}>ValMia</Text>
          {/* <Text style={styles.titleText}> La Punt</Text> */}
  
        </View>
      </View>

      <View style={styles.formContainer}>
        <View style={styles.inputRow}>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="username"
            value={emailAddress}
            style={styles.input}
            placeholder="Username/Email"
            placeholderTextColor="rgba(239,237,225,0.55)"
            onChangeText={setEmailAddress}
            onSubmitEditing={onSignInPress}
          />
        </View>

        <View style={styles.inputRow}>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="password"
            value={password}
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="rgba(239,237,225,0.55)"
            secureTextEntry={true}
            onChangeText={setPassword}
            onSubmitEditing={onSignInPress}
          />
          <TouchableOpacity onPress={() => navigation.navigate("ForgotPassword", { email: emailAddress })}>
            <Text style={styles.forgotText}>Forgot?</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.rememberRow}
          onPress={() => setRememberMe(!rememberMe)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
            {rememberMe && <Ionicons name="checkmark" size={13} color="#333" />}
          </View>
          <Text style={styles.rememberText}>Remember me</Text>
        </TouchableOpacity>

        <OAuthButtons
          buttonStyle={styles.oauthButton}
          textStyle={styles.oauthButtonText}
          strategy="oauth_google"
          buttonText="Continue with Google"
          iconName="logo-google"
          onError={(message) => {
            setError(message);
            setDebugInfo(`OAuth failed (google): ${message}`);
          }}
        />
        <OAuthButtons
          buttonStyle={styles.oauthButton}
          textStyle={styles.oauthButtonText}
          strategy="oauth_apple"
          buttonText="Continue with Apple"
          iconName="logo-apple"
          onError={(message) => {
            setError(message);
            setDebugInfo(`OAuth failed (apple): ${message}`);
          }}
        />

        <TouchableOpacity style={styles.primaryButton} onPress={onSignInPress} disabled={submitting}>
          <BlurView intensity={28} tint="light" style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(255,255,255,0.15)" }]} />
          <View style={[StyleSheet.absoluteFill, { borderRadius: 50, borderWidth: 1, borderColor: "rgba(255,255,255,0.35)" }]} />
          {submitting ? (
            <ActivityIndicator color="#efede1" />
          ) : (
            <Text style={styles.primaryButtonText}>Log In</Text>
          )}
        </TouchableOpacity>

        {needsSecondFactor && (
          <>
            <View style={styles.inputRow}>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                value={secondFactorCode}
                style={styles.input}
                placeholder="Verification code"
                placeholderTextColor="rgba(239,237,225,0.55)"
                onChangeText={setSecondFactorCode}
                onSubmitEditing={onSecondFactorPress}
              />
            </View>
            <TouchableOpacity style={styles.primaryButton} onPress={onSecondFactorPress} disabled={submitting}>
              <BlurView intensity={28} tint="light" style={StyleSheet.absoluteFill} />
              <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(255,255,255,0.15)" }]} />
              <View style={[StyleSheet.absoluteFill, { borderRadius: 50, borderWidth: 1, borderColor: "rgba(255,255,255,0.35)" }]} />
              {submitting ? (
                <ActivityIndicator color="#efede1" />
              ) : (
                <Text style={styles.primaryButtonText}>Verify Code</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {debugInfo ? <Text style={styles.debugText}>{debugInfo}</Text> : null}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Don't have an account? </Text>
        <TouchableOpacity onPress={onSignUpPress}>
          <Text style={styles.signUpText}>Sign Up</Text>
        </TouchableOpacity>
      </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
    justifyContent: "flex-end",
  },
  scrollContent: {
    flexGrow: 1,
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
    paddingBottom: 120,
  },
  titleContainer: {
    paddingHorizontal: 32,
    paddingBottom: 30,
  },
  titleText: {
    fontSize: 36,
    fontFamily: "Lora_400Regular",
    color: '#efede1',
    lineHeight: 44,
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
  },
  forgotText: {
    color: "rgba(239,237,225,0.65)",
    fontSize: 14,
  },
  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 28,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "rgba(239,237,225,0.5)",
    marginRight: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: "#efede1",
    borderColor: "#efede1",
  },
  rememberText: {
    color: "#efede1",
    fontSize: 14,
    fontFamily: "Lora_400Regular",
  },
  oauthButton: {
    borderRadius: 50,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    overflow: "hidden",
  },
  errorText: {
    color: "#ff6b6b",
    fontSize: 13,
    marginTop: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  debugText: {
    color: "rgba(239,237,225,0.75)",
    fontSize: 12,
    marginTop: 8,
    lineHeight: 16,
    textAlign: "center",
  },
  oauthButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "400",
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
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 36,
  },
  footerText: {
    color: "rgba(239,237,225,0.65)",
    fontSize: 14,
    fontFamily: "Lora_400Regular",
  },
  signUpText: {
    color: "#efede1",
    fontSize: 14,
    fontFamily: "Lora_400Regular",
    textDecorationLine: "underline",
  },
});
