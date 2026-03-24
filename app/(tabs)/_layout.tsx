import { Tabs } from "expo-router";
import React from "react";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#84c059",
        tabBarInactiveTintColor: "#718096",
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: { display: "none" },
        tabBarLabelStyle: {
          fontSize: 13,
          fontFamily: "PlusJakartaSans_600SemiBold",
        },
      }}
    >
      <Tabs.Screen
        name="farmer"
        options={{
          title: "Farms",
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol name={focused ? "leaf.fill" : "leaf"} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
