import { element, group } from '../view.js';
import { useEffect, useState } from '../view.js';
import { useNavigate } from '../navigation.js';
import { api } from '../api.js';
// Halaman pelaksanaan CBT: login CBT = login sistem bimbel (satu akun)
export default function Exams() {
    const [exams, setExams] = useState(null);
    const nav = useNavigate();
    const [now, setNow] = useState(Date.now);
    useEffect(() => {
        const interval = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(interval);
    }, []);
    const [failed, setFailed] = useState(false);
    const [request, setRequest] = useState(0);
    useEffect(() => {
        const controller = new AbortController();
        api('/exams', { signal: controller.signal })
            .then(items => { if (!controller.signal.aborted)
            setExams(items); })
            .catch(() => { if (!controller.signal.aborted)
            setFailed(true); });
        return () => controller.abort();
    }, [request]);
    return (element("div", null,
        element("h1", null, "Pelaksanaan CBT"),
        element("p", { className: "muted" }, "Masuk menggunakan username & password akun bimbel Anda. Perhatikan ruang dan waktu pelaksanaan."),
        failed && (element("div", { role: "alert" },
            element("p", null, "Daftar ujian CBT gagal dimuat."),
            element("button", { onClick: () => { setFailed(false); setRequest(n => n + 1); } }, "Coba lagi"))),
        !exams && !failed && element("p", { role: "status" }, "Memuat daftar ujian CBT..."),
        exams?.length === 0 && element("p", { className: "muted" }, "Belum ada ujian CBT yang tersedia."),
        exams?.map((e) => (element("div", { className: "card", key: e.id },
            element("h2", null,
                e.title,
                " ",
                element("span", { className: "badge" },
                    "Ruang: ",
                    e.room)),
            element("p", { className: "muted" },
                new Date(e.start_at).toLocaleString('id-ID'),
                " \u2014 ",
                new Date(e.end_at).toLocaleString('id-ID'),
                " \u00B7 Durasi ",
                e.duration_minutes,
                " menit",
                e.sections?.length > 0 && (element(group, null,
                    " \u00B7 Bagian: ",
                    e.sections.map((s) => `${s.label} ${s.duration_minutes}m`).join(', ')))),
            e.attempt?.status === 'submitted'
                ? element("p", null,
                    "Selesai \u2014 Nilai otomatis: ",
                    element("strong", null, e.attempt.score ?? 'menunggu penilaian'))
                : now < Date.parse(e.start_at) ? element("p", null, "Belum dimulai")
                    : now >= Date.parse(e.end_at) ? element("p", null, "Sudah berakhir")
                        : element("button", { onClick: () => nav(`/cbt/${e.id}`) }, e.attempt?.status === "in_progress" ? "Lanjutkan ujian" : "Mulai Ujian"))))));
}
