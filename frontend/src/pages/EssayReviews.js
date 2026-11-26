import { element } from '../view.js';
import { useEffect, useState } from '../view.js';
import { api, put } from '../api.js';
function Review({ item }) {
    const [score, setScore] = useState(item.score);
    const [message, setMessage] = useState('');
    const [saving, setSaving] = useState(false);
    async function save(correct) {
        setSaving(true);
        try {
            const result = await put(`/attempts/${item.attempt_id}/essays/${item.id}`, { correct });
            setScore(result.score);
            setMessage('Nilai tersimpan.');
        }
        catch {
            setMessage('Nilai gagal disimpan. Coba lagi.');
        }
        finally {
            setSaving(false);
        }
    }
    return element("section", { className: "card" },
        element("h2", null,
            item.attempt.test.title,
            " \u00B7 ",
            item.attempt.user.name),
        element("p", null,
            element("strong", null, item.question.body)),
        element("p", null,
            "Jawaban siswa: ",
            item.answer || 'Kosong'),
        item.question.answer_key && element("p", null,
            "Kunci: ",
            item.question.answer_key),
        element("p", null, score === null ? 'Menunggu koreksi' : `Nilai tersimpan: ${score}/${item.question.points}`),
        element("div", { className: "runner-actions" },
            element("button", { disabled: saving, onClick: () => save(true) },
                "Benar (+",
                item.question.points,
                ")"),
            element("button", { disabled: saving, onClick: () => save(false) }, "Salah (0)")),
        element("span", { role: "status" }, message));
}
export default function EssayReviews() {
    const [items, setItems] = useState(null);
    const [error, setError] = useState(false);
    useEffect(() => {
        api('/essay-reviews').then(setItems).catch(() => setError(true));
    }, []);
    return element("div", null,
        element("h1", null, "Koreksi Esai"),
        error && element("p", { role: "alert" }, "Jawaban gagal dimuat."),
        !error && !items && element("p", null, "Memuat jawaban..."),
        items?.length === 0 && element("p", null, "Belum ada jawaban esai yang dikumpulkan."),
        items?.map(item => element(Review, { key: item.id, item: item })));
}
