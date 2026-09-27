import React, { useMemo } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import EventsScreen from "../screens/EventsScreen";
import CirclesScreen from "../screens/CirclesScreen";
import MyProfileScreen from "../screens/MyProfileScreen";
import { colors } from "../src/theme/colors";
import { StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLanguage, Language } from "../src/i18n/LanguageContext";
import { Translations } from "../src/i18n/translations";
import { useNotificationContext } from "../src/contexts/NotificationContext";
import { useBackground, useColors } from "../src/contexts/BackgroundContext";
import { CirclesMapViewProvider, useCirclesMapView } from "../src/contexts/CirclesMapViewContext";

const Tab = createBottomTabNavigator();

// Note: tab button components are created once at module scope (below).
// Creating them inside render would give each render a new component type,
// remounting the buttons every time the navigator re-renders.
function makeTabButton(getLabel: (t: Translations) => string, showBadge = false) {
  return function TabButton({ onPress, accessibilityState }: any) {
    const { t } = useLanguage();
    const { bgOption } = useBackground();
    const { mapViewActive } = useCirclesMapView();
    const { unreadCount } = useNotificationContext();
    const focused = accessibilityState?.selected;
    const labelColor = mapViewActive
      ? colors.text
      : bgOption === "onboarding"
      ? (focused ? "rgba(255, 255, 255, 0.96)" : "rgba(255, 255, 255, 0.72)")
      : bgOption === "glass"
        ? (focused ? "rgba(255, 255, 255, 0.96)" : "rgba(255, 255, 255, 0.72)")
      : bgOption === "light"
        ? (focused ? colors.text : colors.textMuted)
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

const CirclesTabButton = makeTabButton((t) => t.nav.circles);
const ProfileTabButton = makeTabButton((t) => t.nav.profile, true);

function TabBarBackground() {
  const themeColors = useColors();
  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        {
          backgroundColor: themeColors.background,
          borderRadius: 28,
          borderWidth: 1,
          borderColor: themeColors.cardBorder,
          overflow: "hidden",
        },
      ]}
    >
      <View style={[StyleSheet.absoluteFill, { backgroundColor: themeColors.card }]} />
    </View>
  );
}

const renderTabBarBackground = () => <TabBarBackground />;

const TAB_PILL_WIDTH = 216;

function TabNavigatorInner() {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const tabBarBottom = insets.bottom > 0 ? insets.bottom - 8 : 16;

  const tabBarStyle = useMemo(
    () => ({
      position: "absolute" as const,
      bottom: tabBarBottom,
      left: (windowWidth - TAB_PILL_WIDTH) / 2,
      width: TAB_PILL_WIDTH,
      borderRadius: 28,
      height: 56,
      backgroundColor: "transparent",
      borderTopWidth: 0,
      elevation: 0,
      shadowOpacity: 0,
    }),
    [tabBarBottom, windowWidth]
  );

  return (
    <Tab.Navigator
      safeAreaInsets={{ bottom: 0 }}
      screenOptions={{
        headerShown: false,
        tabBarStyle,
        tabBarBackground: renderTabBarBackground,
      }}
    >
      <Tab.Screen
        name="Circles"
        component={CirclesScreen}
        options={{
          tabBarButton: CirclesTabButton,
        }}
      />
      <Tab.Screen
        name="Events"
        component={EventsScreen}
        options={{
          tabBarButton: () => null,
          tabBarItemStyle: { display: "none" },
        }}
      />
      <Tab.Screen
        name="Profile"
        component={MyProfileScreen}
        options={{
          tabBarButton: ProfileTabButton,
        }}
      />
    </Tab.Navigator>
  );
}

export default function TabNavigator() {
  return (
    <CirclesMapViewProvider>
      <TabNavigatorInner />
    </CirclesMapViewProvider>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: "#FF4D00",
    marginTop: -6,
  },
  tabDotOnboarding: {
    backgroundColor: "#FF4D00",
  },
  labelText: {
    fontSize: 14,
    fontWeight: "500",
    fontFamily: "Lora_400Regular",
  },
});
