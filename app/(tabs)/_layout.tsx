import { Tabs } from "expo-router";
import React from "react";
import BottomTabBar from "../../src/components/navigation/BottomTabBar";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBar: (props) => <BottomTabBar {...props} />,
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="circles" options={{ title: "Circles" }} />
      <Tabs.Screen name="events" options={{ title: "Events" }} />
    </Tabs>
  );
}
