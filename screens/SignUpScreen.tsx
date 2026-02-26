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
import { log } from "../logger";
import { RootStackScreenProps } from "../types";
import { OAuthButtons } from "../components/OAuth";
import { colors } from "../src/theme/colors";

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
    <ImageBackground
      source={require("../assets/Background.webp")}
      style={styles.container}
      resizeMode="cover"
    >
      <StatusBar barStyle="dark-content" />

      <View style={styles.titleContainer}>
        <Text style={styles.titleText}>Create{"\n"}your account</Text>
      </View>

      <View style={styles.formContainer}>
        <View style={styles.inputRow}>
          <TextInput
            value={firstName}
            style={styles.input}
            placeholder="First name"
            placeholderTextColor={colors.textMuted}
            onChangeText={setFirstName}
          />
        </View>

        <View style={styles.inputRow}>
          <TextInput
            value={lastName}
            style={styles.input}
            placeholder="Last name"
            placeholderTextColor={colors.textMuted}
            onChangeText={setLastName}
          />
        </View>

        <View style={styles.inputRow}>
          <TextInput
            autoCapitalize="none"
            value={emailAddress}
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={colors.textMuted}
            onChangeText={setEmailAddress}
          />
        </View>

        <View style={styles.inputRow}>
          <TextInput
            value={password}
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={colors.textMuted}
            secureTextEntry={true}
            onChangeText={setPassword}
          />
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={onSignUpPress}>
          <Text style={styles.primaryButtonText}>Sign Up</Text>
        </TouchableOpacity>

        <OAuthButtons
          buttonStyle={styles.oauthButton}
          textStyle={styles.oauthButtonText}
        />
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Already have an account? </Text>
        <TouchableOpacity onPress={onSignInPress}>
          <Text style={styles.signInText}>Sign In</Text>
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
  titleContainer: {
    paddingHorizontal: 32,
    paddingBottom: 44,
  },
  titleText: {
    fontSize: 36,
    fontWeight: "700",
    color: colors.text,
    lineHeight: 44,
  },
  formContainer: {
    paddingHorizontal: 32,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    marginBottom: 28,
    paddingBottom: 8,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    height: 36,
  },
  primaryButton: {
    backgroundColor: colors.text,
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
    backgroundColor: colors.card,
    borderRadius: 50,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  oauthButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 36,
  },
  footerText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  signInText: {
    color: colors.text,
    fontSize: 14,
    textDecorationLine: "underline",
    fontWeight: "600",
  },
});
