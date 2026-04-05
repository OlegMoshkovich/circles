import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import EventsScreen from "../screens/EventsScreen";
import CirclesScreen from "../screens/CirclesScreen";
import MyProfileScreen from "../screens/MyProfileScreen";
import { colors } from "../src/theme/colors";
import { BlurView } from "expo-blur";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLanguage, Language } from "../src/i18n/LanguageContext";
import { Translations } from "../src/i18n/translations";
import { useNotificationContext } from "../src/contexts/NotificationContext";
import { useBackground } from "../src/contexts/BackgroundContext";

const Tab = createBottomTabNavigator();

function GlassBackground() {
  return (
    <>
      <BlurView
        intensity={72}
        tint="systemUltraThinMaterialLight"
        style={StyleSheet.absoluteFill}
      />
      <View style={[StyleSheet.absoluteFill, styles.glassOverlay]} />
    </>
  );
}

function makeTabButton(getLabel: (t: Translations) => string, showBadge = false) {
  return function TabButton({ onPress, accessibilityState }: any) {
    const { t } = useLanguage();
    const { bgOption } = useBackground();
    const { unreadCount } = useNotificationContext();
    const focused = accessibilityState?.selected;
    const labelColor = bgOption === "onboarding"
      ? (focused ? "rgba(255, 255, 255, 0.96)" : "rgba(255, 255, 255, 0.72)")
      : (focused ? colors.text : colors.textMuted);

    return (
      <TouchableOpacity onPress={onPress} style={styles.tabButton} activeOpacity={0.7}>
        <View style={styles.tabLabelRow}>
          <Text style={[styles.labelText, { color: labelColor }]}>
            {getLabel(t)}
          </Text>
          {showBadge && unreadCount > 0 && (
            <View style={[styles.tabDot, bgOption === "onboarding" && styles.tabDotOnboarding]} />
          )}
        </View>
      </TouchableOpacity>
    );
  };
}

export default function TabNavigator() {
  const insets = useSafeAreaInsets();
  const tabBarBottom = insets.bottom > 0 ? insets.bottom - 8 : 16;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          bottom: tabBarBottom,
          left: 20,
          right: 20,
          borderRadius: 32,
          height: 56,
          backgroundColor: "transparent",
          borderTopWidth: 0,
          elevation: 0,
          overflow: "hidden",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 20,
        },
        tabBarBackground: () => <GlassBackground />,
      }}
    >
      <Tab.Screen
        name="Circles"
        component={CirclesScreen}
        options={{
          tabBarButton: makeTabButton((t) => t.nav.circles),
        }}
      />
      <Tab.Screen
        name="Events"
        component={EventsScreen}
        options={{
          tabBarButton: makeTabButton((t) => t.nav.events),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={MyProfileScreen}
        options={{
          tabBarButton: makeTabButton((t) => t.nav.profile, true),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  glassOverlay: {
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    borderRadius: 32,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.55)",
  },
  tabButton: {
    flex: 1,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
  },
  tabLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  tabDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.text,
    marginTop: -6,
  },
  tabDotOnboarding: {
    backgroundColor: "rgba(255, 255, 255, 0.92)",
  },
  labelText: {
    fontSize: 14,
    fontWeight: "500",
    fontFamily: "Lora_400Regular",
  },
});
