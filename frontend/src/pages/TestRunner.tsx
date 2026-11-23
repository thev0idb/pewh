import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, post } from '../api';
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
  const [score, setScore] = useState<number | null>(null);
  const [startError, setStartError] = useState('');
  const submitting = useRef(false);
  const [sending, setSending] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    let active = true;
    async function start() {
      const tests: { id: number; duration_minutes: number }[] = await api('/tests');
      if (!active) return;
      const minutes = tests.find(test => String(test.id) === id)?.duration_minutes;
      if (!minutes || !Number.isFinite(Number(minutes)) || minutes <= 0) {
        throw new Error('Durasi tes tidak tersedia. Silakan kembali ke daftar tes.');
      }
      const r = await post(`/tests/${id}/start`);
      if (!active) return;
      setDuration(r.attempt.duration_override ?? minutes * 60);
      setAttemptId(r.attempt.id);
      setQuestions(r.questions);
    }
    start().catch(e => { if (active) setStartError(e.message || 'Test gagal dimuat.'); });
    return () => { active = false; };
  }, [id]);

  const submit = async () => {
    if (submitting.current || !attemptId) return;
    submitting.current = true;
    setSending(true);
    setSubmitError('');
    try {
      const r = await post(`/attempts/${attemptId}/submit`, { answers });
      setScore(r.attempt?.score ?? r.score ?? null);
      setResult(r.answers);
    } catch {
      submitting.current = false;
      setSending(false);
      setSubmitError('Pengiriman belum terkonfirmasi. Jawaban masih tersedia di halaman ini.');
    }
  };

  if (startError) return <div><p role="alert">{startError}</p><button onClick={() => nav('/bimbel')}>Kembali ke daftar tes</button></div>;
  if (!attemptId) return <p role="status">Memuat test...</p>;

  if (result) {
    // Setiap akhir soal diberi ringkasan jawaban tepat (diisi guru)
    return (
      <div>
        <h1>{score == null ? 'Tes telah dikumpulkan' : `Hasil Test — Skor ${score}`}</h1>
        {result.map((a, i) => (
          <div className="card" key={a.question_id}>
            <h2>{i + 1}. {a.question.body}</h2>
            <p>Jawaban Anda: {a.answer || '-'}</p>
            {a.question.type === 'pg' && <p>Kunci: <strong>{a.question.answer_key}</strong> ({a.is_correct == null ? 'Menunggu penilaian' : a.is_correct ? 'Benar' : 'Kurang tepat'})</p>}
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
      <div className="runner-heading">
        <h1>Test Bimbel</h1>
        <Timer seconds={duration} onExpire={submit} />
      </div>
      {sending && <p role="status">Mengirim jawaban...</p>}
      {submitError && <p role="alert">{submitError} <button onClick={submit}>Kirim ulang</button></p>}
      <div className="question-nav">
        {questions.map((_, i) => (
          <button key={i} className={answers[questions[i].id] ? 'answered' : ''} aria-current={i === idx ? "step" : undefined} aria-label={`Soal ${i + 1}`} onClick={() => setIdx(i)}>{i + 1}</button>
        ))}
      </div>
      {q && (
        <div className="card">
          <h2>{idx + 1}. {q.body}</h2>
          {q.type === 'pg' && q.options && Object.entries(q.options).map(([k, v]) => (
            <label key={k} className="answer-option">
              <input disabled={sending} type="radio" name={`q${q.id}`} checked={answers[q.id] === k} onChange={() => setAnswers({ ...answers, [q.id]: k })} style={{ width: 'auto', margin: 0 }} />
              {k}. {v}
            </label>
          ))}
          {q.type === 'essay' && (
            <textarea disabled={sending} rows={5} value={answers[q.id] ?? ''} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} placeholder="Tulis jawaban Anda..." />
          )}
          <div className="runner-actions">
            <button disabled={idx === 0} onClick={() => setIdx(idx - 1)}>Sebelumnya</button>
            {idx < questions.length - 1
              ? <button onClick={() => setIdx(idx + 1)}>Berikutnya</button>
              : <button disabled={sending} onClick={submit}>Selesai & Kumpulkan</button>}
          </div>
        </div>
      )}
    </div>
  );
}
