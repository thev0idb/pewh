import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

// Halaman pelaksanaan CBT: login CBT = login sistem bimbel (satu akun)
export default function Exams() {
  const [exams, setExams] = useState<any[]>([]);
  const nav = useNavigate();
  useEffect(() => { api('/exams').then(setExams); }, []);

  return (
    <div>
      <h1>Pelaksanaan CBT</h1>
      <p className="muted">Masuk menggunakan username & password akun bimbel Anda. Perhatikan ruang dan waktu pelaksanaan.</p>
      {exams.map((e) => (
        <div className="card" key={e.id}>
          <h2>{e.title} <span className="badge">Ruang: {e.room}</span></h2>
          <p className="muted">
            {new Date(e.start_at).toLocaleString('id-ID')} — {new Date(e.end_at).toLocaleString('id-ID')} ·
            Durasi {e.duration_minutes} menit
            {e.sections?.length > 0 && (
              <> · Bagian: {e.sections.map((s: any) => `${s.label} ${s.duration_minutes}m`).join(', ')}</>
            )}
          </p>
          {e.attempt?.status === 'submitted'
            ? <p>Selesai — Skor: <strong>{e.attempt.score ?? 'menunggu penilaian'}</strong></p>
            : <button onClick={() => nav(`/cbt/${e.id}`)}>Mulai Ujian</button>}
        </div>
      ))}
    </div>
  );
}
