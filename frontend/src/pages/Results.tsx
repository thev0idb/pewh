import { useEffect, useState } from 'react';
import { api } from '../api';

export default function Results() {
  const [tests, setTests] = useState<any[]>([]);
  useEffect(() => { api('/tests').then(setTests); }, []);
  const done = tests.filter((t) => t.attempt?.status === 'submitted');
  return (
    <div>
      <h1>Hasil Bimbel</h1>
      {done.length === 0 && <p className="muted">Belum ada hasil. Selesaikan test untuk melihat nilai.</p>}
      <table>
        <thead><tr><th>Test</th><th>Mode</th><th>Skor</th></tr></thead>
        <tbody>
          {done.map((t) => (
            <tr key={t.id}><td>{t.title}</td><td>{t.mode}</td><td><strong>{t.attempt.score}</strong></td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
