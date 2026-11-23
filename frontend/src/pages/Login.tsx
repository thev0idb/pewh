import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [err, setErr] = useState('');
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      await login(f.get('username') as string, f.get('password') as string);
      nav('/');
    } catch (e: any) { setErr(e.message); }
  };
  return (
    <div className="man-auth">
      <header className="man-header"><strong>Madrasah Aliyah Negeri 2 Kota Tangerang</strong></header>
      <div className="man-strip">Portal Bimbel &amp; CBT</div>
      <main className="man-card">
      <h1>Masuk</h1>
      <p className="muted">Gunakan username & password akun bimbel Anda.</p>
      {err && <p style={{ color: '#dc2626' }}>{err}</p>}
      <form onSubmit={submit}>
        <label htmlFor="auth-username">Username</label>
        <input id="auth-username" name="username" required autoFocus />
        <label htmlFor="auth-password">Password</label>
        <input id="auth-password" name="password" type="password" required />
        <button style={{ width: '100%' }}>Masuk</button>
      </form>
      <p className="muted">Belum punya akun? <Link to="/register">Daftar bimbel</Link></p>
      </main>
    </div>
  );
}
