import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';

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

// Untuk user, fitur yang ditonjolkan lebih ke pengalaman beli tiket,
// bukan pengelolaan (event/artis/pesanan/pembayaran ala admin)
const FEATURES = [
  { icon: 'search', label: 'Cari Event' },
  { icon: 'tag', label: 'Beli Tiket' },
  { icon: 'clock', label: 'Riwayat' },
  { icon: 'user', label: 'Profil' },
] as const;

export default function LoginUserScreen() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.25, duration: 1100, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 1100, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Lengkapi data', 'Email dan password wajib diisi');
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      Alert.alert('Login gagal', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#fff' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        {/* ---- panel identitas (biru) ---- */}
        <View style={styles.brandPanel}>
          <View style={styles.brandCenter}>
            <Image
              source={require('../../assets/icons/voltra.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.brandName}>VENTRO</Text>
            <Text style={styles.brandTagline}>Nonton Konser Jadi Lebih Mudah</Text>
            <Text style={styles.brandDesc}>
              Temukan event favoritmu, beli tiket, dan kelola pesananmu
              dalam satu aplikasi.
            </Text>

            <View style={styles.featureRow}>
              {FEATURES.map((f) => (
                <View key={f.label} style={styles.featureChip}>
                  <Feather name={f.icon} size={13} color="rgba(255,255,255,0.85)" />
                  <Text style={styles.featureLabel}>{f.label}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.footerRow}>
            <Animated.View style={[styles.pulseDot, { opacity: pulse }]} />
            <Text style={styles.footerText}>SISTEM ONLINE — SIAP MELAYANI KAMU</Text>
          </View>
        </View>

        {/* ---- panel form (putih) ---- */}
        <View style={styles.formPanel}>
          <Text style={styles.eyebrow}>SELAMAT DATANG</Text>
          <Text style={styles.formTitle}>MASUK KE AKUN</Text>
          <Text style={styles.formSub}>Masuk untuk mulai berburu tiket konser.</Text>

          <View style={styles.field}>
            <Text style={styles.label}>EMAIL</Text>
            <TextInput
              style={styles.input}
              placeholder="email@contoh.com"
              placeholderTextColor="#A6AFC4"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>PASSWORD</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#A6AFC4"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <TouchableOpacity
            style={[styles.submit, loading && { opacity: 0.7 }]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text style={styles.submitText}>{loading ? 'Memproses...' : 'Masuk'}</Text>
            {!loading && <Feather name="arrow-right" size={16} color="#fff" />}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.registerLink}
            onPress={() => router.push('/(auth)/register')}
          >
            <Text style={styles.registerLinkText}>Belum punya akun? Daftar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  brandPanel: {
    backgroundColor: COLORS.blue900,
    paddingHorizontal: 28,
    paddingTop: 48,
    paddingBottom: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  brandCenter: { alignItems: 'center', paddingVertical: 8 },
  logo: { width: 84, height: 84 },
  brandName: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 34,
    letterSpacing: 1,
    marginTop: 14,
  },
  brandTagline: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 6,
  },
  brandDesc: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12.5,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 12,
    maxWidth: 300,
  },
  featureRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
  },
  featureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  featureLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 11 },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.14)',
  },
  pulseDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#4ADE80' },
  footerText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    letterSpacing: 1,
    textAlign: 'center',
  },
  formPanel: { paddingHorizontal: 28, paddingTop: 32, paddingBottom: 40 },
  eyebrow: {
    color: COLORS.blue700,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
  },
  formTitle: {
    color: COLORS.ink,
    fontWeight: '700',
    fontSize: 26,
    letterSpacing: 0.5,
    marginTop: 6,
  },
  formSub: { color: '#4B5670', fontSize: 14, marginTop: 6 },
  field: { marginTop: 26 },
  label: {
    color: COLORS.muted,
    fontSize: 10.5,
    letterSpacing: 1.2,
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.line,
    paddingVertical: 10,
    paddingHorizontal: 2,
    fontSize: 15,
    color: COLORS.ink,
  },
  submit: {
    marginTop: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.blue600,
    paddingVertical: 14,
    borderRadius: 10,
  },
  submitText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  registerLink: { marginTop: 18, alignItems: 'center' },
  registerLinkText: { color: COLORS.blue700, fontSize: 13, fontWeight: '600' },
});