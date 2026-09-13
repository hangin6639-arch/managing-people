import React, { createContext, useContext, useEffect, useState } from 'react';

export type UserPlan = 'free' | 'pro';
export interface AppUser {
  id: string;
  email: string;
  name: string;
  plan: UserPlan;
  limits: { graphs: number; peoplePerGraph: number; aiPerMonth: number };
  aiUsage: number;
}
interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
async function api(url: string, options?: RequestInit) {
  const response = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', ...options?.headers } });
  if (!response.ok) { const body = await response.json().catch(() => ({})); throw new Error(body.error || '요청을 처리하지 못했습니다.'); }
  return response.status === 204 ? null : response.json();
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api('/api/auth/me').then(setUser).catch(() => setUser(null)).finally(() => setLoading(false)); }, []);
  const login = async (email: string, password: string) => setUser(await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }));
  const register = async (name: string, email: string, password: string) => setUser(await api('/api/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) }));
  const logout = async () => { await api('/api/auth/logout', { method: 'POST' }); setUser(null); };
  const deleteAccount = async () => { await api('/api/account', { method: 'DELETE' }); setUser(null); };
  return <AuthContext.Provider value={{ user, loading, login, register, logout, deleteAccount }}>{children}</AuthContext.Provider>;
};
export const useAuth = () => { const context = useContext(AuthContext); if (!context) throw new Error('useAuth must be used within AuthProvider'); return context; };
