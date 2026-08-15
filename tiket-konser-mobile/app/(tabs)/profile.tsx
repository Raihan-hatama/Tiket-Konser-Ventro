import React from "react";
import { Redirect } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import PrimaryButton from "@/components/PrimaryButton";
import LoadingScreen from "@/components/LoadingScreen";

const COLORS = {
  blue900: '#0A1E4D',
  blue700: '#143FA6',
  blue600: '#1D4ED8',
  blue100: '#E7EDFC',
  blue50: '#F4F7FE',
  line: '#D6E0F7',
  ink: '#0B0F19',
  muted: '#6B7690',
};

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

  const isAdmin = user?.role === 'admin';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* ---- panel header (biru, senada dengan login) ---- */}
      <View style={styles.headerPanel}>
        <Text style={styles.headerEyebrow}>AKUN SAYA</Text>
        <Text style={styles.headerTitle}>Profil</Text>

        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.name?.charAt(0).toUpperCase() ?? '?'}
          </Text>
        </View>

        <Text style={styles.name}>{user?.name}</Text>

        <View style={styles.roleBadge}>
          <Feather
            name={isAdmin ? 'shield' : 'user'}
            size={12}
            color={COLORS.blue700}
          />
          <Text style={styles.roleText}>{isAdmin ? 'Admin' : 'Pelanggan'}</Text>
        </View>
      </View>

      {/* ---- kartu detail info ---- */}
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <View style={styles.infoIcon}>
            <Feather name="mail" size={15} color={COLORS.blue700} />
          </View>
          <View style={styles.infoText}>
            <Text style={styles.infoLabel}>EMAIL</Text>
            <Text style={styles.infoValue}>{user?.email}</Text>
          </View>
        </View>

        {!!user?.phone && (
          <>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Feather name="phone" size={15} color={COLORS.blue700} />
              </View>
              <View style={styles.infoText}>
                <Text style={styles.infoLabel}>NOMOR TELEPON</Text>
                <Text style={styles.infoValue}>{user.phone}</Text>
              </View>
            </View>
          </>
        )}
      </View>

      {/* Logging out flips isAuthenticated to false, which makes the
          (tabs) layout redirect to /(auth)/login automatically. */}
      <View style={styles.logoutWrap}>
        <PrimaryButton
          title="Keluar"
          variant="outline"
          onPress={logout}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.blue50 },

  headerPanel: {
    backgroundColor: COLORS.blue900,
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 32,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerEyebrow: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
  },
  headerTitle: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 22,
    letterSpacing: 0.3,
    marginTop: 4,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: COLORS.blue600,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  avatarText: { color: '#fff', fontSize: 30, fontWeight: '800' },
  name: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 14,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginTop: 10,
  },
  roleText: { color: COLORS.blue700, fontWeight: '700', fontSize: 12 },

  infoCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: -20,
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 18,
    shadowColor: '#0A1E4D',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  infoIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: COLORS.blue100,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoText: { flex: 1 },
  infoLabel: {
    color: COLORS.muted,
    fontSize: 10.5,
    letterSpacing: 1,
    fontWeight: '600',
  },
  infoValue: {
    color: COLORS.ink,
    fontSize: 14.5,
    fontWeight: '600',
    marginTop: 3,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.line,
  },

  logoutWrap: {
    marginHorizontal: 20,
    marginTop: 28,
  },
});