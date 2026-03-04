import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import HomeScreen from "../screens/HomeScreen";
import EventsScreen from "../screens/EventsScreen";
import MyProfileScreen from "../screens/MyProfileScreen";
import { colors } from "../src/theme/colors";
import { BlurView } from "expo-blur";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

function makeTabButton(label: string) {
  return function TabButton({ onPress, accessibilityState }: any) {
    const focused = accessibilityState?.selected;
    return (
      <TouchableOpacity onPress={onPress} style={styles.tabButton} activeOpacity={0.7}>
        <Text style={[styles.labelText, { color: focused ? colors.text : colors.textMuted }]}>
          {label}
        </Text>
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
        name="LocalLiving"
        component={HomeScreen}
        options={{
          tabBarButton: makeTabButton("Village Living"),
        }}
      />
      <Tab.Screen
        name="Events"
        component={EventsScreen}
        options={{
          tabBarButton: makeTabButton("Events"),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={MyProfileScreen}
        options={{
          tabBarButton: makeTabButton("Profile"),
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
  labelText: {
    fontSize: 14,
    fontWeight: "500",
    fontFamily: "Lora_400Regular",
  },
});
