import { FormEvent, useEffect, useState } from 'react';
import { api, post } from '../api';
import { useAuth } from '../context/AuthContext';

// Siswa menghubungi guru bila tidak bisa bertemu langsung
export default function Contact() {
  const { user } = useAuth();
  const [teachers, setTeachers] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [msg, setMsg] = useState('');
  useEffect(() => {
    api('/teachers').then(setTeachers);
    api('/messages').then((r) => setMessages(r.data));
  }, []);

  const send = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget).entries());
    await post('/messages', f);
    setMsg('Pesan terkirim');
    e.currentTarget.reset();
  };

  return (
    <div style={{ maxWidth: 640 }}>
      <h1>Hubungi Guru</h1>
      <p className="muted">Gunakan halaman ini bila tidak dapat bertemu guru secara langsung.</p>
      {user?.role === 'siswa' && (
        <form onSubmit={send} className="card">
          <label>Kepada guru</label>
          <select name="to_id" required>
            <option value="">Pilih guru...</option>
            {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <label>Subjek</label><input name="subject" required />
          <label>Pesan</label><textarea name="body" rows={4} required />
          <button>Kirim</button>
          {msg && <p className="muted">{msg}</p>}
        </form>
      )}
      <h2>Riwayat Pesan</h2>
      {messages.map((m) => (
        <div className="card" key={m.id}>
          <strong>{m.subject}</strong>
          <p className="muted">{m.from?.name} → {m.to?.name}</p>
          <p>{m.body}</p>
        </div>
      ))}
    </div>
  );
}
