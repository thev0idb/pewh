import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

type Test = {
  id: number; title: string; mode: string; day_type: string;
  duration_minutes: number; question_count: number; day_allowed: boolean;
  attempt: { id: number; score: number | null; status: string } | null;
};

// Daftar bimbel & test online (Senin–Kamis) / tugas offline (Jumat)
export default function Tests() {
  const [tests, setTests] = useState<Test[] | null>(null);
  const nav = useNavigate();
  const [failed, setFailed] = useState(false);
  const [request, setRequest] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    api('/tests', { signal: controller.signal })
      .then(items => { if (!controller.signal.aborted) setTests(items); })
      .catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [request]);

  return (
    <div>
      <h1>Bimbel & Test</h1>
      <p className="muted">Test online tersedia Senin–Kamis. Tugas tambahan (offline) dikerjakan hari Jumat sesuai waktu yang ditentukan guru.</p>
      {failed && (
        <div role="alert">
          <p>Daftar tes bimbel gagal dimuat.</p>
          <button onClick={() => { setFailed(false); setRequest(n => n + 1); }}>Coba lagi</button>
        </div>
      )}
      {!tests && !failed && <p role="status">Memuat daftar tes bimbel...</p>}
      {tests?.length === 0 && <p className="muted">Belum ada tes bimbel yang tersedia.</p>}
      {tests?.map((t) => (
        <div className="card" key={t.id}>
          <h2>
            {t.title}{' '}
            <span className="badge">{t.day_type === 'offline' ? 'Offline · Jumat' : 'Online · Senin–Kamis'}</span>{' '}
            <span className="badge">{t.mode}</span>
          </h2>
          <p className="muted">{t.question_count} soal · {t.duration_minutes} menit</p>
          {t.attempt?.status === 'submitted' ? (
            <p>Hasil: <strong>{t.attempt.score ?? 'Menunggu penilaian'}</strong></p>
          ) : (
            <button disabled={!t.day_allowed} onClick={() => nav(`/test/${t.id}`)}>
              {t.day_allowed ? 'Mulai' : 'Bukan hari pelaksanaan'}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
