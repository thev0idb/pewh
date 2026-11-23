import { FormEvent, useState } from 'react';
import { put } from '../api';
import { useAuth } from '../context/AuthContext';

// Siswa bisa ubah username, password, email, no hp — NIS & kelas hanya dari data sekolah
export default function Profile() {
  const { user, refresh } = useAuth();
  const [msg, setMsg] = useState('');
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    if (!data.password && !data.password_confirmation) {
      delete data.password;
      delete data.password_confirmation;
    }
    if (data.password && data.password !== data.password_confirmation) return setMsg('Konfirmasi password tidak sama');
    try {
      await put('/profile', data);
      await refresh();
      setMsg('Profil berhasil diperbarui');
      for (const name of ['password', 'password_confirmation']) {
        const field = form.elements.namedItem(name);
        if (field instanceof HTMLInputElement) field.value = '';
      }
    } catch (err: any) { setMsg(err.message); }
  };
  if (!user) return null;
  return (
    <div style={{ maxWidth: 480 }}>
      <h1>Profil</h1>
      {msg && <p className="muted">{msg}</p>}
      <form onSubmit={submit}>
        <label htmlFor="Profile-name">Nama</label><input id="Profile-name" name="name" defaultValue={user.name} />
        <label htmlFor="Profile-username">Username</label><input id="Profile-username" name="username" defaultValue={user.username} />
        <label htmlFor="Profile-email">Email</label><input id="Profile-email" name="email" type="email" defaultValue={user.email ?? ''} />
        <label htmlFor="Profile-phone">No. HP</label><input id="Profile-phone" name="phone" defaultValue={user.phone ?? ''} />
        <label htmlFor="Profile-password">Password baru (kosongkan bila tidak diubah)</label>
        <input id="Profile-password" name="password" type="password" />
        <label htmlFor="Profile-password_confirmation">Konfirmasi password</label>
        <input id="Profile-password_confirmation" name="password_confirmation" type="password" />
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
