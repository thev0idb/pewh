import { FormEvent, useState } from 'react';
import { put } from '../api';
import { useAuth } from '../context/AuthContext';

// Siswa bisa ubah username, password, email, no hp — NIS & kelas hanya dari data sekolah
export default function Profile() {
  const { user, refresh } = useAuth();
  const [msg, setMsg] = useState('');
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    Object.keys(data).forEach((k) => !data[k] && delete data[k]);
    if (data.password && data.password !== data.password_confirmation) return setMsg('Konfirmasi password tidak sama');
    try {
      await put('/profile', data);
      await refresh();
      setMsg('Profil berhasil diperbarui');
      e.currentTarget.reset();
    } catch (err: any) { setMsg(err.message); }
  };
  if (!user) return null;
  return (
    <div style={{ maxWidth: 480 }}>
      <h1>Profil</h1>
      {msg && <p className="muted">{msg}</p>}
      <form onSubmit={submit}>
        <label>Nama</label><input name="name" defaultValue={user.name} />
        <label>Username</label><input name="username" defaultValue={user.username} />
        <label>Email</label><input name="email" type="email" defaultValue={user.email ?? ''} />
        <label>No. HP</label><input name="phone" defaultValue={user.phone ?? ''} />
        <label>Password baru (kosongkan bila tidak diubah)</label>
        <input name="password" type="password" />
        <label>Konfirmasi password</label>
        <input name="password_confirmation" type="password" />
        <button>Simpan Perubahan</button>
      </form>
      <div className="card" style={{ marginTop: 16 }}>
        <p className="muted" style={{ margin: 0 }}>
          Data sekolah (tidak dapat diubah di sini):<br />
          NIS: {user.nis ?? '-'} · Kelas: {user.class_room ?? '-'}
        </p>
      </div>
    </div>
  );
}
