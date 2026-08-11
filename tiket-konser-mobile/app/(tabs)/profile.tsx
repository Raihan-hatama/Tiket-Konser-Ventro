import React from "react";
import { Redirect } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/context/AuthContext";
import PrimaryButton from "@/components/PrimaryButton";
import LoadingScreen from "@/components/LoadingScreen";

export default function ProfileScreen() {
  const {
    user,
    logout,
    isAuthenticated,
    isLoading,
  } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profil</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.name?.charAt(0).toUpperCase() ?? '?'}
          </Text>
        </View>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        {!!user?.phone && <Text style={styles.phone}>{user.phone}</Text>}

        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>
            {user?.role === 'admin' ? 'Admin' : 'Pelanggan'}
          </Text>
        </View>
      </View>

      {/* Logging out flips isAuthenticated to false, which makes the
          (tabs) layout redirect to /(auth)/login automatically. */}
      <PrimaryButton
        title="Keluar"
        variant="outline"
        onPress={logout}
        style={{ marginTop: 24 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F9FAFB', padding: 20 },
  header: { paddingBottom: 8 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#111827' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginTop: 12,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: { color: '#fff', fontSize: 26, fontWeight: '800' },
  name: { fontSize: 18, fontWeight: '700', color: '#111827' },
  email: { fontSize: 14, color: '#6B7280', marginTop: 2 },
  phone: { fontSize: 14, color: '#6B7280', marginTop: 2 },
  roleBadge: {
    marginTop: 14,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  roleText: { color: '#4338CA', fontWeight: '700', fontSize: 12 },
});
