import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as authApi from '@/api/auth';
import { TOKEN_KEY } from '@/api/client';
import { User } from '@/types';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    name: string,
    email: string,
    password: string,
    phone?: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const profile = await authApi.me();
      setUser(profile);
    } catch {
      setUser(null);
      await AsyncStorage.removeItem(TOKEN_KEY);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      if (token) {
        await refreshUser();
      }
      setIsLoading(false);
    })();
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await authApi.login({ email, password });
    await AsyncStorage.setItem(TOKEN_KEY, result.token);
    if (result.user) {
      setUser(result.user as User);
    } else {
      await refreshUser();
    }
  }, [refreshUser]);

  const register = useCallback(
    async (name: string, email: string, password: string, phone?: string) => {
      const result = await authApi.register({ name, email, password, phone });
      await AsyncStorage.setItem(TOKEN_KEY, result.token);
      await refreshUser();
    },
    [refreshUser]
  );

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
