import { element } from '../view.js';
import { useEffect, useState } from '../view.js';
import { useNavigate } from '../navigation.js';
import { api } from '../api.js';
// Daftar bimbel & test online (Senin–Kamis) / tugas offline (Jumat)
export default function Tests() {
    const [tests, setTests] = useState(null);
    const nav = useNavigate();
    const [failed, setFailed] = useState(false);
    const [request, setRequest] = useState(0);
    useEffect(() => {
        const controller = new AbortController();
        api('/tests', { signal: controller.signal })
            .then(items => { if (!controller.signal.aborted)
            setTests(items); })
            .catch(() => { if (!controller.signal.aborted)
            setFailed(true); });
        return () => controller.abort();
    }, [request]);
    return (element("div", null,
        element("h1", null, "Bimbel & Test"),
        element("p", { className: "muted" }, "Test online tersedia Senin\u2013Kamis. Tugas tambahan (offline) dikerjakan hari Jumat sesuai waktu yang ditentukan guru."),
        failed && (element("div", { role: "alert" },
            element("p", null, "Daftar tes bimbel gagal dimuat."),
            element("button", { onClick: () => { setFailed(false); setRequest(n => n + 1); } }, "Coba lagi"))),
        !tests && !failed && element("p", { role: "status" }, "Memuat daftar tes bimbel..."),
        tests?.length === 0 && element("p", { className: "muted" }, "Belum ada tes bimbel yang tersedia."),
        tests?.map((t) => (element("div", { className: "card", key: t.id },
            element("h2", null,
                t.title,
                ' ',
                element("span", { className: "badge" }, t.day_type === 'offline' ? 'Offline · Jumat' : 'Online · Senin–Kamis'),
                ' ',
                element("span", { className: "badge" }, t.mode)),
            element("p", { className: "muted" },
                t.question_count,
                " soal \u00B7 ",
                t.duration_minutes,
                " menit"),
            t.attempt?.status === 'submitted' ? (element("p", null,
                "Hasil: ",
                element("strong", null, t.attempt.score ?? 'Menunggu penilaian'))) : (element("button", { disabled: !t.day_allowed, onClick: () => nav(`/test/${t.id}`) }, t.day_allowed ? 'Mulai' : 'Bukan hari pelaksanaan')))))));
}
