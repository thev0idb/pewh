import { useEffect, useState } from 'react';
import { api, put } from '../api';

type Submission = {
  id: number; attempt_id: number; answer: string; score: number | null;
  question: { body: string; points: number; answer_key: string | null };
  attempt: { user: { name: string }; test: { title: string } };
};

function Review({ item }: { item: Submission }) {
  const [score, setScore] = useState(item.score);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  async function save(correct: boolean) {
    setSaving(true);
    try {
      const result = await put(`/attempts/${item.attempt_id}/essays/${item.id}`, { correct });
      setScore(result.score);
      setMessage('Nilai tersimpan.');
    } catch {
      setMessage('Nilai gagal disimpan. Coba lagi.');
    } finally {
      setSaving(false);
    }
  }
  return <section className="card">
    <h2>{item.attempt.test.title} · {item.attempt.user.name}</h2>
    <p><strong>{item.question.body}</strong></p>
    <p>Jawaban siswa: {item.answer || 'Kosong'}</p>
    {item.question.answer_key && <p>Kunci: {item.question.answer_key}</p>}
    <p>{score === null ? 'Menunggu koreksi' : `Nilai tersimpan: ${score}/${item.question.points}`}</p>
    <div className="runner-actions">
      <button disabled={saving} onClick={() => save(true)}>Benar (+{item.question.points})</button>
      <button disabled={saving} onClick={() => save(false)}>Salah (0)</button>
    </div>
    <span role="status">{message}</span>
  </section>;
}

export default function EssayReviews() {
  const [items, setItems] = useState<Submission[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    api('/essay-reviews').then(setItems).catch(() => setError(true));
  }, []);
  return <div><h1>Koreksi Esai</h1>
    {error && <p role="alert">Jawaban gagal dimuat.</p>}
    {!error && !items && <p>Memuat jawaban...</p>}
    {items?.length === 0 && <p>Belum ada jawaban esai yang dikumpulkan.</p>}
    {items?.map(item => <Review key={item.id} item={item} />)}
  </div>;
}
