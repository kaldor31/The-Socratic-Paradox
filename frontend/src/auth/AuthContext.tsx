import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { api } from '../api/client';
import type { AuthUser, RegisterDto, LoginDto, VerifyDto, ResetPasswordDto } from '../api/types';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (dto: LoginDto) => Promise<AuthUser>;
  register: (dto: RegisterDto) => Promise<void>;
  resendVerification: (email: string) => Promise<void>;
  verify: (dto: VerifyDto) => Promise<AuthUser>;
  resetPassword: (dto: ResetPasswordDto) => Promise<AuthUser>;
  logout: () => void;
  setUser: (user: AuthUser) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUser = useCallback(async () => {
    try {
      const res = await api.getMe();
      setUser(res.user);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = useCallback(async (dto: LoginDto) => {
    const res = await api.login(dto);
    setUser(res.user);
    return res.user;
  }, []);

  const register = useCallback(async (dto: RegisterDto) => {
    await api.register(dto);
  }, []);

  const resendVerification = useCallback(async (email: string) => {
    await api.resendVerification(email);
  }, []);

  const verify = useCallback(async (dto: VerifyDto) => {
    const res = await api.verify(dto);
    setUser(res.user);
    return res.user;
  }, []);

  const resetPassword = useCallback(async (dto: ResetPasswordDto) => {
    const res = await api.resetPassword(dto);
    setUser(res.user);
    return res.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {}
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user && !user.isAnonymous,
        login,
        register,
        resendVerification,
        verify,
        resetPassword,
        logout,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
