import React from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import LoadingScreen from '@/components/LoadingScreen';

export default function Index() {
  const { isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;

  // Pengguna dapat melihat daftar event tanpa harus login.
  // Login/registrasi diminta saat mengakses pesanan, profil, atau checkout.
  return <Redirect href="/(tabs)" />;
}
