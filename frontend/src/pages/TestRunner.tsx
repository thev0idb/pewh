import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { post } from '../api';
import Timer from '../components/Timer';

type Q = { id: number; body: string; type: 'essay' | 'pg'; options: Record<string, string> | null; points: number };
type Answer = { question_id: number; answer: string; is_correct: boolean | null; score: number | null; question: Q & { answer_key: string; review: string | null } };

export default function TestRunner() {
  const { id } = useParams();
  const nav = useNavigate();
  const [attemptId, setAttemptId] = useState<number>();
  const [questions, setQuestions] = useState<Q[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [duration, setDuration] = useState(0);
  const [result, setResult] = useState<Answer[] | null>(null);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    post(`/tests/${id}/start`).then((r) => {
      setAttemptId(r.attempt.id);
      setQuestions(r.questions);
      setDuration(r.attempt.duration_override ?? 0);
      if (!r.attempt.duration_override) {
        // ambil durasi dari list test bila perlu; default 30 menit
        setDuration(30 * 60);
      }
    });
  }, [id]);

  const submit = async () => {
    const r = await post(`/attempts/${attemptId}/submit`, { answers });
    setResult(r.answers);
  };

  if (result) {
    // Setiap akhir soal diberi ringkasan jawaban tepat (diisi guru)
    const score = result.reduce((s, a) => s + (a.score ?? 0), 0);
    const max = result.reduce((s, a) => s + a.question.points, 0);
    return (
      <div>
        <h1>Hasil Test — Skor {Math.round(score / Math.max(max, 1) * 100)}</h1>
        {result.map((a, i) => (
          <div className="card" key={a.question_id}>
            <h2>{i + 1}. {a.question.body}</h2>
            <p>Jawaban Anda: {a.answer || '-'}</p>
            {a.question.type === 'pg' && <p>Kunci: <strong>{a.question.answer_key}</strong> ({a.is_correct ? 'Benar' : 'Kurang tepat'})</p>}
            {a.question.review && <p className="muted">Ringkasan: {a.question.review}</p>}
          </div>
        ))}
        <button onClick={() => nav('/hasil')}>Lihat Semua Hasil</button>
      </div>
    );
  }

  const q = questions[idx];
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Test Bimbel</h1>
        <Timer seconds={duration} onExpire={submit} />
      </div>
      <div className="question-nav">
        {questions.map((_, i) => (
          <button key={i} className={answers[questions[i].id] ? 'answered' : ''} onClick={() => setIdx(i)}>{i + 1}</button>
        ))}
      </div>
      {q && (
        <div className="card">
          <h2>{idx + 1}. {q.body}</h2>
          {q.type === 'pg' && q.options && Object.entries(q.options).map(([k, v]) => (
            <label key={k} style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
              <input type="radio" name={`q${q.id}`} checked={answers[q.id] === k} onChange={() => setAnswers({ ...answers, [q.id]: k })} style={{ width: 'auto', margin: 0 }} />
              {k}. {v}
            </label>
          ))}
          {q.type === 'essay' && (
            <textarea rows={5} value={answers[q.id] ?? ''} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} placeholder="Tulis jawaban Anda..." />
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button disabled={idx === 0} onClick={() => setIdx(idx - 1)}>Sebelumnya</button>
            {idx < questions.length - 1
              ? <button onClick={() => setIdx(idx + 1)}>Berikutnya</button>
              : <button onClick={submit}>Selesai & Kumpulkan</button>}
          </div>
        </div>
      )}
    </div>
  );
}
