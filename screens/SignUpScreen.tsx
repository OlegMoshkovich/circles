import * as React from "react";
import {
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StyleSheet,
  StatusBar,
} from "react-native";
import { useSignUp } from "@clerk/clerk-expo";
import { log } from "../logger";
import { RootStackScreenProps } from "../types";
import { OAuthButtons } from "../components/OAuth";

export default function SignUpScreen({
  navigation,
}: RootStackScreenProps<"SignUp">) {
  const { isLoaded, signUp } = useSignUp();
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [emailAddress, setEmailAddress] = React.useState("");
  const [password, setPassword] = React.useState("");

  const onSignUpPress = async () => {
    if (!isLoaded) return;
    try {
      await signUp.create({ firstName, lastName, emailAddress, password });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      navigation.navigate("VerifyCode");
    } catch (err: any) {
      log("Error:> " + err?.status || "");
      log("Error:> " + err?.errors ? JSON.stringify(err.errors) : err);
    }
  };

  const onSignInPress = () => navigation.replace("SignIn");

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Title */}
      <View style={styles.titleContainer}>
        <Text style={styles.titleText}>Create{"\n"}your account</Text>
      </View>

      {/* Form */}
      <View style={styles.formContainer}>
        <View style={styles.inputRow}>
          <TextInput
            value={firstName}
            style={styles.input}
            placeholder="First name"
            placeholderTextColor="rgba(255,255,255,0.75)"
            onChangeText={setFirstName}
          />
        </View>

        <View style={styles.inputRow}>
          <TextInput
            value={lastName}
            style={styles.input}
            placeholder="Last name"
            placeholderTextColor="rgba(255,255,255,0.75)"
            onChangeText={setLastName}
          />
        </View>

        <View style={styles.inputRow}>
          <TextInput
            autoCapitalize="none"
            value={emailAddress}
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="rgba(255,255,255,0.75)"
            onChangeText={setEmailAddress}
          />
        </View>

        <View style={styles.inputRow}>
          <TextInput
            value={password}
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="rgba(255,255,255,0.75)"
            secureTextEntry={true}
            onChangeText={setPassword}
          />
        </View>

        {/* Sign Up button */}
        <TouchableOpacity style={styles.primaryButton} onPress={onSignUpPress}>
          <Text style={styles.primaryButtonText}>Sign Up</Text>
        </TouchableOpacity>

        {/* OAuth */}
        <OAuthButtons
          buttonStyle={styles.oauthButton}
          textStyle={styles.oauthButtonText}
        />
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Already have an account? </Text>
        <TouchableOpacity onPress={onSignInPress}>
          <Text style={styles.signInText}>Sign In</Text>
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
  signInText: {
    color: "#fff",
    fontSize: 14,
    textDecorationLine: "underline",
    fontWeight: "600",
  },
});
