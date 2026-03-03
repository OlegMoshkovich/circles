import React from "react";
import {
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StyleSheet,
  StatusBar,
  ImageBackground,
  Image,
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
  const { signIn, setSession, isLoaded } = useSignIn();

  const [emailAddress, setEmailAddress] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [rememberMe, setRememberMe] = React.useState(false);

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
        <Text style={styles.titleText}>Welcome to</Text>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Text style={styles.titleText}>ValMia</Text>
          <Text style={styles.titleText}> La Punt</Text>
  
        </View>
      </View>

      <View style={styles.formContainer}>
        <View style={styles.inputRow}>
          <TextInput
            autoCapitalize="none"
            value={emailAddress}
            style={styles.input}
            placeholder="Username/Email"
            placeholderTextColor="rgba(239,237,225,0.55)"
            onChangeText={setEmailAddress}
          />
        </View>

        <View style={styles.inputRow}>
          <TextInput
            value={password}
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="rgba(239,237,225,0.55)"
            secureTextEntry={true}
            onChangeText={setPassword}
          />
          <TouchableOpacity>
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
        />

        <TouchableOpacity style={styles.primaryButton} disabled>
          <BlurView intensity={28} tint="light" style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(255,255,255,0.15)" }]} />
          <View style={[StyleSheet.absoluteFill, { borderRadius: 50, borderWidth: 1, borderColor: "rgba(255,255,255,0.35)" }]} />
<Text style={styles.primaryButtonText}>Log In</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Don't have an account? </Text>
        <TouchableOpacity onPress={onSignUpPress}>
          <Text style={styles.signUpText}>Sign Up</Text>
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
    left: -200
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
    opacity: 0.65,
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
