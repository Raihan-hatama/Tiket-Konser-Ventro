import React from 'react';
import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import LoadingScreen from '@/components/LoadingScreen';

export default function AuthLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;
  if (isAuthenticated) return <Redirect href="/(tabs)" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
