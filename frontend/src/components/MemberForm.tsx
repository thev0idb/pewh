import { FormEvent, useState } from 'react';
import { ApiError, post, put } from '../api';

export type MemberRole = 'guru' | 'siswa';
export type Member = {
  id: number; name: string; username: string; role: MemberRole;
  email?: string | null; phone?: string | null; nis?: string | null;
  class_room?: string | null; is_bimbel?: boolean;
};
type Props = { role: MemberRole; member?: Member; onSaved: () => void; onCancel?: () => void };

export default function MemberForm({ role, member, onSaved, onCancel }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    const data: Record<string, unknown> = Object.fromEntries(form);
    if (!member) data.role = role;
    if (member && !data.password) delete data.password;
    if (role === 'siswa') data.is_bimbel = form.has('is_bimbel');
    setBusy(true);
    setError('');
    try {
      if (member) await put('/directory/' + member.id, data);
      else await post('/directory', data);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? Object.values(err.errors).flat().join(' ') || err.message : 'Gagal menghubungi server.');
    } finally {
      setBusy(false);
    }
  }
  return <form className="card member-form" onSubmit={submit}>
    <h2>{member ? 'Ubah' : 'Tambah'} {role}</h2>
    <label>Nama<input name="name" defaultValue={member?.name} required maxLength={255} /></label>
    <label>Username<input name="username" defaultValue={member?.username} required maxLength={255} /></label>
    <label>Email<input name="email" type="email" defaultValue={member?.email ?? ''} required={role === 'guru'} maxLength={255} /></label>
    <label>No. HP<input name="phone" type="tel" defaultValue={member?.phone ?? ''} maxLength={255} /></label>
    {role === 'siswa' && <>
      <label>NIS<input name="nis" defaultValue={member?.nis ?? ''} required maxLength={255} /></label>
      <label>Kelas<input name="class_room" defaultValue={member?.class_room ?? ''} maxLength={255} /></label>
      <label><input type="checkbox" name="is_bimbel" defaultChecked={member?.is_bimbel} /> Peserta bimbel</label>
    </>}
    <label>{member ? 'Password baru (opsional)' : 'Password'}<input name="password" type="password" autoComplete="new-password" minLength={8} maxLength={255} required={!member} /></label>
    {error && <p role="alert">{error}</p>}
    <div className="member-actions">
      <button disabled={busy} type="submit">{busy ? 'Menyimpan…' : 'Simpan'}</button>
      {onCancel && <button disabled={busy} type="button" onClick={onCancel}>Batal</button>}
    </div>
  </form>;
}
