import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api, post, ApiError } from '../api';

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
  const [sessionError, setSessionError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    if (localStorage.getItem('token')) {
      setLoading(true);
      setSessionError(false);
      api('/me', { signal: controller.signal })
        .then(value => { if (!controller.signal.aborted) setUser(value); })
        .catch(error => {
          if (!controller.signal.aborted && !(error instanceof ApiError && error.status === 401)) setSessionError(true);
        })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    } else setLoading(false);
    return () => controller.abort();
  }, [attempt]);

  const login = async (username: string, password: string) => {
    const res = await post_login(username, password);
    localStorage.setItem('token', res.token);
    setUser(res.user);
  };
  const register = async (data: Record<string, string>) => {
    const res = await post('/register', data);
    localStorage.setItem('token', res.token);
    setUser(res.user);
  };
  const logout = () => {
    fetch('/api/logout', { method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
    localStorage.removeItem('token');
    setUser(null);
  };
  const refresh = async () => setUser(await api('/me'));

  if (sessionError) return <main className="content">
    <p role="alert">Sesi belum dapat diperiksa. Periksa koneksi Anda.</p>
    <button onClick={() => setAttempt(n => n + 1)}>Coba lagi</button>
  </main>;
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
