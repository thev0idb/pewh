import { FormEvent, useRef, useState } from 'react';
import { post } from '../api';
import { usePageData } from '../usePageData';
import { useAuth } from '../context/AuthContext';

// Siswa menghubungi guru bila tidak bisa bertemu langsung
export default function Contact() {
  const { user } = useAuth();
  type Person = { id: number; name: string };
  type Message = { id: number; subject: string; body: string; from?: Person; to?: Person };
  const teachers = usePageData<Person[]>(user?.role === 'siswa' ? '/teachers' : null);
  const messages = usePageData<{ data: Message[] }>('/messages');
  const [msg, setMsg] = useState('');
  const busy = useRef(false);
  const [sending, setSending] = useState(false);

  const send = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy.current) return;
    busy.current = true;
    setSending(true);
    setMsg('');
    const form = e.currentTarget;
    const f = Object.fromEntries(new FormData(form).entries());
    try {
      const message = await post('/messages', f);
      const recipient = teachers.data?.find(t => String(t.id) === String(f.to_id));
      messages.setData(previous => previous && ({ ...previous,
        data: [{ ...message, from: user, to: recipient }, ...previous.data],
      }));
    } catch (error) {
      setMsg(error instanceof Error ? error.message : 'Pesan gagal dikirim.');
      return;
    } finally {
      busy.current = false;
      setSending(false);
    }
    setMsg('Pesan terkirim');
    form.reset();
  };

  return (
    <div style={{ maxWidth: 640 }}>
      <h1>{user?.role === 'siswa' ? 'Hubungi Guru' : 'Pesan Masuk'}</h1>
      {user?.role === 'siswa' && (
        <form onSubmit={send} className="card">
          {teachers.failed && <p role="alert">Daftar guru gagal dimuat. <button type="button" onClick={teachers.retry}>Coba lagi</button></p>}
          {!teachers.failed && !teachers.data && <p role="status">Memuat daftar guru…</p>}
          {teachers.data?.length === 0 && <p>Belum ada guru yang dapat dihubungi.</p>}
          <fieldset disabled={sending || !teachers.data?.length}>
          <label htmlFor="Contact-to_id">Kepada guru</label>
          <select id="Contact-to_id" name="to_id" required>
            <option value="">Pilih guru...</option>
            {teachers.data?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <label htmlFor="Contact-subject">Subjek</label><input id="Contact-subject" name="subject" required />
          <label htmlFor="Contact-body">Pesan</label><textarea id="Contact-body" name="body" rows={4} required />
          <button>{sending ? 'Mengirim…' : 'Kirim'}</button>
          </fieldset>
          {msg && <p role="status">{msg}</p>}
        </form>
      )}
      <h2>Riwayat Pesan</h2>
      {messages.failed && <p role="alert">Riwayat pesan gagal dimuat. <button onClick={messages.retry}>Coba lagi</button></p>}
      {!messages.failed && !messages.data && <p role="status">Memuat riwayat pesan…</p>}
      {messages.data?.data.length === 0 && <p>Belum ada pesan.</p>}
      {messages.data?.data.map((m) => (
        <div className="card" key={m.id}>
          <strong>{m.subject}</strong>
          <p className="muted">{m.from?.name} → {m.to?.name}</p>
          <p>{m.body}</p>
        </div>
      ))}
    </div>
  );
}
