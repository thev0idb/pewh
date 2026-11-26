import { element } from '../view.js';
import { usePageData } from '../usePageData.js';
import { useAuth } from '../context/AuthContext.js';
export default function Dashboard() {
    const { user } = useAuth();
    const { data: exams, failed, retry } = usePageData(user?.role === 'siswa' ? '/exams' : null);
    return (element("div", null,
        element("h1", null,
            "Halo, ",
            user?.name),
        element("p", { className: "muted" },
            "Bimbel offline: Jumat \u00B7 Bimbel online (test): Senin\u2013Kamis",
            user?.role !== 'siswa' ? ' · Anda masuk sebagai ' + user?.role : ''),
        user?.role === 'siswa' && !exams && (failed
            ? element("p", { role: "alert" },
                "Jadwal CBT gagal dimuat. ",
                element("button", { onClick: retry }, "Coba lagi"))
            : element("p", { role: "status" }, "Memuat jadwal CBT\u2026")),
        user?.role === 'siswa' && exams?.length === 0 && element("p", null, "Belum ada jadwal CBT."),
        user?.role === 'siswa' && exams && exams.length > 0 && (element("div", { className: "card" },
            element("h2", null, "Pemberitahuan CBT"),
            exams.map((e) => (element("p", { key: e.id },
                element("span", { className: "badge" }, e.room),
                " ",
                element("strong", null, e.title),
                " \u2014",
                ' ',
                new Date(e.start_at).toLocaleString('id-ID'),
                " s.d.",
                ' ',
                new Date(e.end_at).toLocaleString('id-ID'),
                ". Login CBT memakai username & password akun bimbel Anda.")))))));
}
