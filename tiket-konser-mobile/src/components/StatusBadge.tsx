import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

const COLORS: Record<string, { bg: string; fg: string; label: string }> = {
  pending: { bg: '#FEF3C7', fg: '#92400E', label: 'Menunggu' },
  paid: { bg: '#D1FAE5', fg: '#065F46', label: 'Lunas' },
  verified: { bg: '#D1FAE5', fg: '#065F46', label: 'Terverifikasi' },
  rejected: { bg: '#FEE2E2', fg: '#991B1B', label: 'Ditolak' },
  cancelled: { bg: '#FEE2E2', fg: '#991B1B', label: 'Dibatalkan' },
  open: { bg: '#DBEAFE', fg: '#1E40AF', label: 'Dibuka' },
  closed: { bg: '#E5E7EB', fg: '#374151', label: 'Ditutup' },
};

const StatusBadge: React.FC<{ status?: string }> = ({ status }) => {
  const cfg = COLORS[status ?? ''] ?? {
    bg: '#E5E7EB',
    fg: '#374151',
    label: status ?? '-',
  };
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.text, { color: cfg.fg }]}>{cfg.label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  text: { fontSize: 12, fontWeight: '600' },
});

export default StatusBadge;
