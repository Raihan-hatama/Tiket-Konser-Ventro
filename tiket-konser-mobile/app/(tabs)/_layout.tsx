import React from "react";
import { Text } from "react-native";
import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#4F46E5",
        tabBarInactiveTintColor: "#9CA3AF",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Event",
          tabBarIcon: () => (
            <Text style={{ fontSize: 18 }}>🏠</Text>
          ),
        }}
      />

      <Tabs.Screen
        name="orders"
        options={{
          title: "Pesanan",
          tabBarIcon: () => (
            <Text style={{ fontSize: 18 }}>🎟️</Text>
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon: () => (
            <Text style={{ fontSize: 18 }}>👤</Text>
          ),
        }}
      />
    </Tabs>
  );
}