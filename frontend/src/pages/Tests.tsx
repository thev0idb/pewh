import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, post } from '../api';

type Test = {
  id: number; title: string; mode: string; day_type: string;
  duration_minutes: number; question_count: number; day_allowed: boolean;
  attempt: { id: number; score: number | null; status: string } | null;
};

// Daftar bimbel & test online (Senin–Kamis) / tugas offline (Jumat)
export default function Tests() {
  const [tests, setTests] = useState<Test[]>([]);
  const nav = useNavigate();
  useEffect(() => { api('/tests').then(setTests); }, []);

  return (
    <div>
      <h1>Bimbel & Test</h1>
      <p className="muted">Test online tersedia Senin–Kamis. Tugas tambahan (offline) dikerjakan hari Jumat sesuai waktu yang ditentukan guru.</p>
      {tests.map((t) => (
        <div className="card" key={t.id}>
          <h2>
            {t.title}{' '}
            <span className="badge">{t.day_type === 'offline' ? 'Offline · Jumat' : 'Online · Senin–Kamis'}</span>{' '}
            <span className="badge">{t.mode}</span>
          </h2>
          <p className="muted">{t.question_count} soal · {t.duration_minutes} menit</p>
          {t.attempt?.status === 'submitted' ? (
            <p>Hasil: <strong>{t.attempt.score}</strong></p>
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
