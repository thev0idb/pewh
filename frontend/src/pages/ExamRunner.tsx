import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { post } from '../api';
import Timer from '../components/Timer';
import { useExamLock } from '../components/ExamLock';

type Q = { id: number; body: string; type: 'essay' | 'pg'; options: Record<string, string> | null; section_id: number | null };
type Section = { id: number; label: string; type: string; duration_minutes: number };

export default function ExamRunner() {
  const { id } = useParams();
  const nav = useNavigate();
  const [attemptId, setAttemptId] = useState<number>();
  const [questions, setQuestions] = useState<Q[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [idx, setIdx] = useState(0);
  const [violations, setViolations] = useState(0);
  const submittedRef = useRef(false);

  const doSubmit = async () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    try { await post(`/exam-attempts/${attemptId}/submit`, { answers }); } catch {}
    nav('/cbt');
  };

  useExamLock(() => setViolations((v) => v + 1), doSubmit);

  useEffect(() => {
    post(`/exams/${id}/start`).then((r) => {
      setAttemptId(r.attempt.id);
      setQuestions(r.questions);
      setSections(r.sections);
      setTotalSeconds(r.remaining_seconds);
    }).catch((e) => { alert(e.message); nav('/cbt'); });
  }, [id]);

  const q = questions[idx];
  const section = q ? sections.find((s) => s.id === q.section_id) : null;

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>CBT {section ? `· ${section.label}` : ''}</h1>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {violations > 0 && <span className="badge">Pelanggaran: {violations}</span>}
          <Timer seconds={totalSeconds} onExpire={doSubmit} />
        </div>
      </div>
      <p className="muted">Jangan keluar dari halaman ini. Semua navigasi diblokir selama ujian.</p>
      <div className="question-nav">
        {questions.map((qq, i) => (
          <button key={qq.id} className={answers[qq.id] ? 'answered' : ''} onClick={() => setIdx(i)}>{i + 1}</button>
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
            <textarea rows={6} value={answers[q.id] ?? ''} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} />
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button disabled={idx === 0} onClick={() => setIdx(idx - 1)}>Sebelumnya</button>
            {idx < questions.length - 1
              ? <button onClick={() => setIdx(idx + 1)}>Berikutnya</button>
              : <button onClick={doSubmit}>Akhiri Ujian</button>}
          </div>
        </div>
      )}
    </div>
  );
}
