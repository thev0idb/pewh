import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../api';

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [err, setErr] = useState('');
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [sending, setSending] = useState(false);
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (sending) return;
    setErr('');
    setErrors({});
    const f = Object.fromEntries(new FormData(e.currentTarget).entries());
    if (f.password !== f.password_confirmation) return setErr('Konfirmasi password tidak sama');
    setSending(true);
    try { await register(f as Record<string, string>); nav('/'); }
    catch (error) {
      if (error instanceof ApiError) setErrors(error.errors);
      setErr(error instanceof ApiError ? error.message : 'Pendaftaran gagal. Periksa koneksi dan coba lagi.');
    } finally { setSending(false); }
  };
  return (
    <div className="man-auth">
      <header className="man-header"><strong>Madrasah Aliyah Negeri 2 Kota Tangerang</strong></header>
      <div className="man-strip">Portal Bimbel &amp; CBT</div>
      <main className="man-card">
      <h1>Daftar Bimbel</h1>
      <p className="muted">Siswa lain dapat mendaftar di sini untuk mengikuti bimbel.</p>
      {err && <div role="alert"><p>{err}</p>{Object.entries(errors).map(([field, messages]) =>
        <p key={field}><a href={`#auth-${field}`}>{field}</a> — {messages.join(' ')}</p>
      )}</div>}
      <form onSubmit={submit}>
        <label htmlFor="auth-name">Nama lengkap</label><input id="auth-name" name="name" required />
        <label htmlFor="auth-username">Username</label><input id="auth-username" name="username" required />
        <label htmlFor="auth-email">Email</label><input id="auth-email" name="email" type="email" />
        <label htmlFor="auth-phone">No. HP (untuk notifikasi WhatsApp)</label><input id="auth-phone" name="phone" type="tel" autoComplete="tel" />
        <label htmlFor="auth-password">Password</label><input id="auth-password" name="password" type="password" required />
        <label htmlFor="auth-password_confirmation">Konfirmasi password</label><input id="auth-password_confirmation" name="password_confirmation" type="password" required />
        <button disabled={sending} style={{ width: '100%' }}>{sending ? 'Mendaftarkan…' : 'Daftar'}</button>
      </form>
      <p className="muted">Sudah punya akun? <Link to="/login">Masuk</Link></p>
      </main>
    </div>
  );
}
