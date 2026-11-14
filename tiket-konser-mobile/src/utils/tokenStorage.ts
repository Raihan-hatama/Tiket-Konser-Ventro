import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const TOKEN_KEY = 'tiket_konser_token';

const isWeb = Platform.OS === 'web';

/**
 * Token disimpan di SecureStore (terenkripsi) pada Android/iOS.
 * Di web, SecureStore tidak tersedia sehingga memakai AsyncStorage.
 * Jika token lama masih tersimpan di AsyncStorage, token dipindahkan
 * otomatis agar pengguna tidak perlu login ulang.
 */
export const getToken = async (): Promise<string | null> => {
  if (isWeb) {
    return AsyncStorage.getItem(TOKEN_KEY);
  }

  try {
    const secureToken = await SecureStore.getItemAsync(TOKEN_KEY);
    if (secureToken) return secureToken;

    const legacyToken = await AsyncStorage.getItem(TOKEN_KEY);
    if (legacyToken) {
      await SecureStore.setItemAsync(TOKEN_KEY, legacyToken);
      await AsyncStorage.removeItem(TOKEN_KEY);
      return legacyToken;
    }

    return null;
  } catch {
    return AsyncStorage.getItem(TOKEN_KEY);
  }
};

export const setToken = async (token: string): Promise<void> => {
  if (isWeb) {
    await AsyncStorage.setItem(TOKEN_KEY, token);
    return;
  }

  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  }
};

export const removeToken = async (): Promise<void> => {
  if (isWeb) {
    await AsyncStorage.removeItem(TOKEN_KEY);
    return;
  }

  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
    // abaikan, tetap bersihkan cadangan di AsyncStorage
  }

  await AsyncStorage.removeItem(TOKEN_KEY);
};
