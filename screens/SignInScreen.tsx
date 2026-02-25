import React from "react";
import {
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StyleSheet,
  StatusBar,
} from "react-native";
import { useSignIn } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { log } from "../logger";
import { RootStackScreenProps } from "../types";
import { OAuthButtons } from "../components/OAuth";

export default function SignInScreen({
  navigation,
}: RootStackScreenProps<"SignIn">) {
  const { signIn, setSession, isLoaded } = useSignIn();

  const [emailAddress, setEmailAddress] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [rememberMe, setRememberMe] = React.useState(true);

  const onSignInPress = async () => {
    if (!isLoaded) return;
    try {
      const completeSignIn = await signIn.create({
        identifier: emailAddress,
        password,
      });
      await setSession(completeSignIn.createdSessionId);
    } catch (err: any) {
      log("Error:> " + err?.status || "");
      log("Error:> " + err?.errors ? JSON.stringify(err.errors) : err);
    }
  };

  const onSignUpPress = () => navigation.replace("SignUp");

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Title */}
      <View style={styles.titleContainer}>
        <Text style={styles.titleText}>Log into{"\n"}your account</Text>
      </View>

      {/* Form */}
      <View style={styles.formContainer}>
        {/* Email */}
        <View style={styles.inputRow}>
          <TextInput
            autoCapitalize="none"
            value={emailAddress}
            style={styles.input}
            placeholder="Username/Email"
            placeholderTextColor="rgba(255,255,255,0.75)"
            onChangeText={setEmailAddress}
          />
        </View>

        {/* Password */}
        <View style={styles.inputRow}>
          <TextInput
            value={password}
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="rgba(255,255,255,0.75)"
            secureTextEntry={true}
            onChangeText={setPassword}
          />
          <TouchableOpacity>
            <Text style={styles.forgotText}>Forgot?</Text>
          </TouchableOpacity>
        </View>

        {/* Remember me */}
        <TouchableOpacity
          style={styles.rememberRow}
          onPress={() => setRememberMe(!rememberMe)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
            {rememberMe && <Ionicons name="checkmark" size={13} color="#fff" />}
          </View>
          <Text style={styles.rememberText}>Remember me</Text>
        </TouchableOpacity>

        {/* Log In button */}
        <TouchableOpacity style={styles.primaryButton} onPress={onSignInPress}>
          <Text style={styles.primaryButtonText}>Log In</Text>
        </TouchableOpacity>

        {/* OAuth */}
        <OAuthButtons
          buttonStyle={styles.oauthButton}
          textStyle={styles.oauthButtonText}
        />
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Don't have an account? </Text>
        <TouchableOpacity onPress={onSignUpPress}>
          <Text style={styles.signUpText}>Sign Up</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#BFA89E",
    justifyContent: "flex-end",
    paddingBottom: 48,
  },
  titleContainer: {
    paddingHorizontal: 32,
    paddingBottom: 44,
  },
  titleText: {
    fontSize: 36,
    fontWeight: "700",
    color: "#fff",
    lineHeight: 44,
  },
  formContainer: {
    paddingHorizontal: 32,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.5)",
    marginBottom: 28,
    paddingBottom: 8,
  },
  input: {
    flex: 1,
    color: "#fff",
    fontSize: 16,
    height: 36,
  },
  forgotText: {
    color: "rgba(255,255,255,0.85)",
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
    borderColor: "rgba(255,255,255,0.8)",
    marginRight: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: "#3a3a3a",
    borderColor: "#3a3a3a",
  },
  rememberText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 14,
  },
  primaryButton: {
    backgroundColor: "#2b2b2b",
    borderRadius: 50,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  oauthButton: {
    backgroundColor: "#fff",
    borderRadius: 50,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 0,
  },
  oauthButtonText: {
    color: "#2b2b2b",
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 36,
  },
  footerText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
  },
  signUpText: {
    color: "#fff",
    fontSize: 14,
    textDecorationLine: "underline",
    fontWeight: "600",
  },
});
