import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from '../api';

export type User = {
  id: number; name: string; username: string; email: string | null;
  phone: string | null; role: 'admin' | 'guru' | 'siswa';
  nis: string | null; class_room: string | null;
};

type AuthCtx = {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (data: Record<string, string>) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>(null!);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (localStorage.getItem('token')) {
      api('/me').then(setUser).catch(() => localStorage.removeItem('token')).finally(() => setLoading(false));
    } else setLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    const res = await post_login(username, password);
    localStorage.setItem('token', res.token);
    setUser(res.user);
  };
  const register = async (data: Record<string, string>) => {
    const res = await post_register(data);
    localStorage.setItem('token', res.token);
    setUser(res.user);
  };
  const logout = () => {
    fetch('/api/logout', { method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
    localStorage.removeItem('token');
    setUser(null);
  };
  const refresh = async () => setUser(await api('/me'));

  return <Ctx.Provider value={{ user, loading, login, register, logout, refresh }}>{children}</Ctx.Provider>;
}

async function post_login(username: string, password: string) {
  const res = await fetch('/api/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error('Username atau password salah');
  return res.json();
}
async function post_register(data: Record<string, string>) {
  const res = await fetch('/api/register', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Registrasi gagal');
  return res.json();
}
