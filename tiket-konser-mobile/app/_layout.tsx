import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <CartProvider>
          <StatusBar style="dark" />

          <Stack
            screenOptions={{
              headerTintColor: "#4F46E5",
            }}
          >
            <Stack.Screen
              name="index"
              options={{
                headerShown: false,
              }}
            />

            <Stack.Screen
              name="(auth)"
              options={{
                headerShown: false,
              }}
            />

            <Stack.Screen
              name="(tabs)"
              options={{
                headerShown: false,
              }}
            />

            <Stack.Screen
              name="event/[id]"
              options={{
                title: "Detail Event",
              }}
            />

            <Stack.Screen
              name="checkout"
              options={{
                title: "Checkout",
              }}
            />

            <Stack.Screen
              name="order/[id]"
              options={{
                title: "Detail Pesanan",
              }}
            />
          </Stack>
        </CartProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}