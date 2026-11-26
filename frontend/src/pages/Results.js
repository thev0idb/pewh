import { element } from '../view.js';
import { useEffect, useState } from '../view.js';
import { api } from '../api.js';
export default function Results() {
    const [tests, setTests] = useState(null);
    const [failed, setFailed] = useState(false);
    useEffect(() => {
        let active = true;
        api('/tests').then(data => { if (active)
            setTests(data); })
            .catch(() => { if (active)
            setFailed(true); });
        return () => { active = false; };
    }, []);
    const done = tests?.filter((t) => t.attempt?.status === 'submitted');
    return (element("div", null,
        element("h1", null, "Hasil Bimbel"),
        failed && element("p", { role: "alert" },
            "Hasil gagal dimuat. ",
            element("button", { onClick: () => window.location.reload() }, "Coba lagi")),
        !failed && !tests && element("p", { role: "status" }, "Memuat hasil..."),
        done?.length === 0 && element("p", { className: "muted" }, "Belum ada hasil. Selesaikan test untuk melihat nilai."),
        done && done.length > 0 && element("table", null,
            element("thead", null,
                element("tr", null,
                    element("th", null, "Test"),
                    element("th", null, "Mode"),
                    element("th", null, "Skor"))),
            element("tbody", null, done.map((t) => (element("tr", { key: t.id },
                element("td", null, t.title),
                element("td", null, t.mode),
                element("td", null,
                    element("strong", null, t.attempt.score ?? 'Menunggu penilaian')))))))));
}
