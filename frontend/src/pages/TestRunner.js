import { element } from '../view.js';
import { useEffect, useRef, useState } from '../view.js';
import { useNavigate, useParams } from '../navigation.js';
import { api, post } from '../api.js';
import { useAttemptAnswers } from '../useAttemptAnswers.js';
import Timer from '../components/Timer.js';
export default function TestRunner() {
    const { id } = useParams();
    const nav = useNavigate();
    const [attemptId, setAttemptId] = useState();
    const [questions, setQuestions] = useState([]);
    const { answers, save: setAnswers, restore, clear } = useAttemptAnswers('test');
    const [duration, setDuration] = useState(0);
    const [result, setResult] = useState(null);
    const [score, setScore] = useState(null);
    const [startError, setStartError] = useState('');
    const submitting = useRef(false);
    const [expired, setExpired] = useState(false);
    const [sending, setSending] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [idx, setIdx] = useState(0);
    useEffect(() => {
        let active = true;
        async function start() {
            const tests = await api('/tests');
            if (!active)
                return;
            const minutes = tests.find(test => String(test.id) === id)?.duration_minutes;
            if (!minutes || minutes <= 0)
                throw new Error('Durasi tes tidak tersedia.');
            const r = await post(`/tests/${id}/start`);
            if (!active)
                return;
            const started = Date.parse(r.attempt.started_at);
            const seconds = r.attempt.duration_override ?? minutes * 60;
            setDuration(Number.isFinite(started) ? Math.max(0, Math.ceil((started - Date.now()) / 1000 + seconds)) : seconds);
            restore(r.attempt.id);
            setAttemptId(r.attempt.id);
            setQuestions(r.questions);
        }
        start().catch(e => { if (active)
            setStartError(e.message || 'Test gagal dimuat.'); });
        return () => { active = false; };
    }, [id]);
    const submit = async () => {
        if (submitting.current || !attemptId)
            return;
        submitting.current = true;
        setSending(true);
        setSubmitError('');
        try {
            const r = await post(`/attempts/${attemptId}/submit`, { answers });
            setScore(r.attempt?.score ?? r.score ?? null);
            clear();
            setResult(r.answers.map((a) => ({
                ...a,
                question: { ...questions.find(q => q.id === a.question_id), ...a.question },
            })));
        }
        catch {
            submitting.current = false;
            setSending(false);
            setSubmitError('Pengiriman belum terkonfirmasi. Jawaban masih tersedia di halaman ini.');
        }
    };
    if (startError)
        return element("div", null,
            element("p", { role: "alert" }, startError),
            element("button", { onClick: () => nav('/bimbel') }, "Kembali ke daftar tes"));
    if (!attemptId)
        return element("p", { role: "status" }, "Memuat test...");
    if (result) {
        // Setiap akhir soal diberi ringkasan jawaban tepat (diisi guru)
        return (element("div", null,
            element("h1", null, score == null ? 'Tes dikumpulkan. Menunggu penilaian.' : `Hasil Test — Skor ${score}`),
            result.map((a, i) => (element("div", { className: "card", key: a.question_id },
                element("h2", null,
                    i + 1,
                    ". ",
                    a.question.body),
                element("p", null,
                    "Jawaban Anda: ",
                    a.answer || '-'),
                a.is_correct == null ? element("p", null, "Belum dinilai") : element("p", null,
                    "Kunci: ",
                    element("strong", null, a.question.answer_key),
                    " (",
                    a.is_correct ? 'Benar' : 'Kurang tepat',
                    ")"),
                a.question.review && element("p", { className: "muted" },
                    "Ringkasan: ",
                    a.question.review)))),
            element("button", { onClick: () => nav('/hasil') }, "Lihat Semua Hasil")));
    }
    const q = questions[idx];
    return (element("div", null,
        element("div", { className: "runner-heading" },
            element("h1", null, "Test Bimbel"),
            element(Timer, { seconds: duration, onExpire: () => { setExpired(true); void submit(); } })),
        sending && element("p", { role: "status" }, "Mengirim jawaban..."),
        submitError && element("p", { role: "alert" },
            submitError,
            " ",
            element("button", { onClick: submit }, "Kirim ulang")),
        element("div", { className: "question-nav" }, questions.map((_, i) => (element("button", { key: i, className: answers[questions[i].id] ? 'answered' : '', "aria-current": i === idx ? "step" : undefined, "aria-label": `Soal ${i + 1}`, onClick: () => setIdx(i) }, i + 1)))),
        q && (element("div", { className: "card" },
            element("h2", null,
                idx + 1,
                ". ",
                q.body),
            q.type === 'pg' && q.options && Object.entries(q.options).map(([k, v]) => (element("label", { key: k, className: "answer-option" },
                element("input", { disabled: sending || expired, type: "radio", name: `q${q.id}`, checked: answers[q.id] === k, onChange: () => setAnswers({ ...answers, [q.id]: k }), style: { width: 'auto', margin: 0 } }),
                k,
                ". ",
                v))),
            q.type === 'essay' && (element("textarea", { disabled: sending || expired, rows: 5, value: answers[q.id] ?? '', onChange: (e) => setAnswers({ ...answers, [q.id]: e.target.value }), placeholder: "Tulis jawaban Anda..." })),
            element("div", { className: "runner-actions" },
                element("button", { disabled: idx === 0, onClick: () => setIdx(idx - 1) }, "Sebelumnya"),
                idx < questions.length - 1
                    ? element("button", { onClick: () => setIdx(idx + 1) }, "Berikutnya")
                    : element("button", { disabled: sending, onClick: submit }, "Selesai & Kumpulkan"))))));
}
