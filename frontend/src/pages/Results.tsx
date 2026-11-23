import { useEffect, useState } from 'react';
import { api } from '../api';

export default function Results() {
  const [tests, setTests] = useState<any[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    api('/tests').then(data => { if (active) setTests(data); })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, []);
  const done = tests?.filter((t) => t.attempt?.status === 'submitted');
  return (
    <div>
      <h1>Hasil Bimbel</h1>
      {failed && <p role="alert">Hasil gagal dimuat. <button onClick={() => window.location.reload()}>Coba lagi</button></p>}
      {!failed && !tests && <p role="status">Memuat hasil...</p>}
      {done?.length === 0 && <p className="muted">Belum ada hasil. Selesaikan test untuk melihat nilai.</p>}
      {done && done.length > 0 && <table>
        <thead><tr><th>Test</th><th>Mode</th><th>Skor</th></tr></thead>
        <tbody>
          {done.map((t) => (
            <tr key={t.id}><td>{t.title}</td><td>{t.mode}</td><td><strong>{t.attempt.score ?? 'Menunggu penilaian'}</strong></td></tr>
          ))}
        </tbody>
      </table>}
    </div>
  );
}
