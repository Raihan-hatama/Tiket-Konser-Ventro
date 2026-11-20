import React, { useCallback, useState } from "react";
import { Redirect } from "expo-router";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import PrimaryButton from "@/components/PrimaryButton";
import LoadingScreen from "@/components/LoadingScreen";
import { formatDate } from "@/utils/format";

type FeatherName = React.ComponentProps<typeof Feather>["name"];

const COLORS = {
  accent: "#4F46E5",
  accentSoft: "#EEF2FF",
  screen: "#F9FAFB",
  card: "#FFFFFF",
  ink: "#111827",
  muted: "#6B7280",
  faint: "#9CA3AF",
  line: "#F3F4F6",
};

interface InfoRowProps {
  icon: FeatherName;
  label: string;
  value: string;
  isLast?: boolean;
}

const InfoRow = ({ icon, label, value, isLast }: InfoRowProps) => (
  <>
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Feather name={icon} size={15} color={COLORS.accent} />
      </View>

      <View style={styles.infoText}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>

    {!isLast && <View style={styles.divider} />}
  </>
);

export default function ProfileScreen() {
  const { user, logout, isAuthenticated, isLoading, refreshUser } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);

    try {
      await refreshUser();
    } finally {
      setRefreshing(false);
    }
  }, [refreshUser]);

  // Guard harus setelah semua hook supaya urutan hook tetap stabil.
  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  const isAdmin = user?.role === "admin";
  const initial = user?.name?.trim().charAt(0).toUpperCase() || "?";
  const memberSince = user?.created_at ? formatDate(user.created_at) : null;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[COLORS.accent]}
          tintColor={COLORS.accent}
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profil</Text>
        <Text style={styles.headerSubtitle}>
          Informasi akun dan sesi kamu di VENTRO.
        </Text>
      </View>

      {/* ---- identitas ---- */}
      <View style={styles.identityCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>

        <View style={styles.identityInfo}>
          <Text style={styles.name} numberOfLines={1}>
            {user?.name || "-"}
          </Text>

          <Text style={styles.email} numberOfLines={1}>
            {user?.email || "-"}
          </Text>

          <View
            style={[
              styles.roleBadge,
              isAdmin ? styles.roleBadgeAdmin : styles.roleBadgeCustomer,
            ]}
          >
            <Feather
              name={isAdmin ? "shield" : "user"}
              size={11}
              color={isAdmin ? "#4338CA" : "#374151"}
            />
            <Text
              style={[
                styles.roleText,
                { color: isAdmin ? "#4338CA" : "#374151" },
              ]}
            >
              {isAdmin ? "Admin" : "Pelanggan"}
            </Text>
          </View>
        </View>
      </View>

      {/* ---- detail akun ---- */}
      <Text style={styles.sectionLabel}>Informasi Akun</Text>

      <View style={styles.card}>
        <InfoRow icon="mail" label="EMAIL" value={user?.email || "-"} />

        {!!user?.phone && (
          <InfoRow
            icon="phone"
            label="NOMOR TELEPON"
            value={user.phone}
            isLast={!memberSince}
          />
        )}

        {memberSince && (
          <InfoRow
            icon="calendar"
            label="BERGABUNG SEJAK"
            value={memberSince}
            isLast
          />
        )}
      </View>

      {/* ---- sesi ---- */}
      <Text style={styles.sectionLabel}>Sesi</Text>

      <View style={styles.sessionCard}>
        <View style={styles.sessionRow}>
          <View style={styles.infoIcon}>
            <Feather name="lock" size={15} color={COLORS.accent} />
          </View>

          <Text style={styles.sessionText}>
            Kamu masuk sebagai{" "}
            <Text style={styles.sessionStrong}>
              {isAdmin ? "Admin" : "Pelanggan"}
            </Text>
            . Keluar akan mengakhiri sesi di perangkat ini.
          </Text>
        </View>

        <PrimaryButton
          title="Keluar"
          variant="outline"
          onPress={logout}
          style={styles.logoutButton}
        />
      </View>

      <Text style={styles.footer}>VENTRO · Tiket Konser</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.screen },
  content: { paddingBottom: 40 },

  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  headerTitle: { fontSize: 24, fontWeight: "800", color: COLORS.ink },
  headerSubtitle: { fontSize: 13, color: COLORS.muted, marginTop: 4 },

  identityCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: COLORS.card,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 18,
    borderRadius: 16,
    shadowColor: "#111827",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.accent,
  },
  avatarText: { color: "#FFFFFF", fontSize: 26, fontWeight: "800" },
  identityInfo: { flex: 1 },
  name: { fontSize: 18, fontWeight: "800", color: COLORS.ink },
  email: { fontSize: 13, color: COLORS.muted, marginTop: 2 },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginTop: 8,
  },
  roleBadgeAdmin: { backgroundColor: COLORS.accentSoft },
  roleBadgeCustomer: { backgroundColor: "#F3F4F6" },
  roleText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.3 },

  sectionLabel: {
    marginHorizontal: 20,
    marginTop: 22,
    marginBottom: 8,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    color: COLORS.faint,
  },

  card: {
    backgroundColor: COLORS.card,
    marginHorizontal: 16,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 2,
    shadowColor: "#111827",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.accentSoft,
  },
  infoText: { flex: 1 },
  infoLabel: {
    fontSize: 10.5,
    fontWeight: "600",
    letterSpacing: 1,
    color: COLORS.faint,
  },
  infoValue: {
    fontSize: 14.5,
    fontWeight: "600",
    color: COLORS.ink,
    marginTop: 2,
  },
  divider: { height: 1, backgroundColor: COLORS.line },

  sessionCard: {
    backgroundColor: COLORS.card,
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#111827",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  sessionRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  sessionText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.muted,
  },
  sessionStrong: { color: COLORS.ink, fontWeight: "700" },
  logoutButton: { marginTop: 14 },

  footer: {
    marginTop: 26,
    textAlign: "center",
    fontSize: 11.5,
    letterSpacing: 0.5,
    color: COLORS.faint,
  },
});
