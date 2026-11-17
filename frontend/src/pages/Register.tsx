import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [err, setErr] = useState('');
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget).entries());
    if (f.password !== f.password_confirmation) return setErr('Konfirmasi password tidak sama');
    try { await register(f as Record<string, string>); nav('/'); }
    catch (e: any) { setErr(e.message); }
  };
  return (
    <div className="auth-box">
      <h1>Daftar Bimbel</h1>
      <p className="muted">Siswa lain dapat mendaftar di sini untuk mengikuti bimbel.</p>
      {err && <p style={{ color: '#dc2626' }}>{err}</p>}
      <form onSubmit={submit}>
        <label>Nama lengkap</label><input name="name" required />
        <label>Username</label><input name="username" required />
        <label>Email</label><input name="email" type="email" />
        <label>No. HP (untuk notifikasi WhatsApp)</label><input name="phone" />
        <label>Password</label><input name="password" type="password" required />
        <label>Konfirmasi password</label><input name="password_confirmation" type="password" required />
        <button style={{ width: '100%' }}>Daftar</button>
      </form>
    </div>
  );
}
