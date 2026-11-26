import { usePageData } from '../usePageData.js';
import { classLabel } from '../components/SchoolClass.js';
import { element, group } from '../view.js';
import { useState } from '../view.js';
import { post, put } from '../api.js';
const emptyOptions = () => ({ A: '', B: '', C: '', D: '' });
const newTestQuestion = () => ({
    body: '',
    type: 'pg',
    options: emptyOptions(),
    answer_key: 'A',
    review: '',
    shortAnswerKey: '',
    points: 1,
});
const newExamSection = (index) => ({
    label: index === 0 ? 'Essay' : 'Pilihan Ganda',
    type: index === 0 ? 'essay' : 'pg',
    duration_minutes: index === 0 ? 30 : 15,
});
const newExamQuestion = () => ({
    section_index: 0,
    body: '',
    options: emptyOptions(),
    answer_key: 'A',
    points: 1,
});
const subBoxStyle = {
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
};
const secondaryBtnStyle = {
    background: '#fff',
    color: 'var(--text)',
    border: '1px solid var(--border)',
};
const dangerBtnStyle = {
    background: '#fff',
    color: '#dc2626',
    border: '1px solid var(--border)',
    padding: '4px 10px',
    fontSize: 12,
};
// Guru/Operator: buat test bimbel + soal, dan buat ujian CBT (durasi total & per bagian)
function localDate(value) {
    if (!value) return '';
    const date = new Date(value);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0,16);
}
export default function Manage({ section, exam, onSaved }) {
    const rooms = usePageData(section==='cbt' && !exam ? '/school-classes' : null);
    const [classIds,setClassIds] = useState([]);
    const selected = (rooms.data ?? []).filter(c=>classIds.includes(c.id));
    const [notice, setNotice] = useState(null);
    const [loading, setLoading] = useState(null);
    // State Form Test Bimbel
    const [testTitle, setTestTitle] = useState('');
    const [testMode, setTestMode] = useState('pilihan_ganda');
    const [testDayType, setTestDayType] = useState('online');
    const [testDuration, setTestDuration] = useState(30);
    const [testQuestions, setTestQuestions] = useState([newTestQuestion()]);
    // State Form Ujian CBT
    const [examTitle, setExamTitle] = useState(exam?.title ?? '');
    const [examRoom, setExamRoom] = useState(exam?.room ?? '');
    const [examStart, setExamStart] = useState(localDate(exam?.start_at));
    const [examEnd, setExamEnd] = useState(localDate(exam?.end_at));
    const [examDuration, setExamDuration] = useState(exam?.sections.reduce((sum,s)=>sum+Number(s.duration_minutes),0) || 30);
    const [sections, setSections] = useState(exam?.sections ?? [newExamSection(0)]);
    const [examQuestions, setExamQuestions] = useState(() => exam ? exam.questions.map(q => ({...q, options:q.options ?? emptyOptions(), answer_key:q.answer_key ?? 'A', section_index:Math.max(0, exam.sections.findIndex(s => s.id === q.section_id))})) : [newExamQuestion()]);
    const showNotice = (type, text) => {
        setNotice({ type, text });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    // --- Handler ---
    const updateTestQuestion = (index, patch) => {
        setTestQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...patch } : q)));
    };
    const updateTestOption = (qIndex, key, value) => {
        setTestQuestions((prev) => prev.map((q, i) => i === qIndex ? { ...q, options: { ...q.options, [key]: value } } : q));
    };
    const createTest = async (e) => {
        e.preventDefault();
        setNotice(null);
        try {
            setLoading('test');
            const formattedQuestions = testQuestions.map((q) => {
                const effectiveType = testMode === 'pilihan_ganda' ? 'pg' : testMode === 'essay' ? 'essay' : q.type;
                return {
                    body: q.body,
                    type: effectiveType,
                    options: effectiveType === 'pg' ? q.options : null,
                    answer_key: effectiveType === 'pg' ? q.answer_key : q.shortAnswerKey.trim() || null,
                    review: q.review.trim() || null,
                    points: Number(q.points) || 1,
                };
            });
            await post('/tests', {
                title: testTitle,
                mode: testMode,
                day_type: testDayType,
                duration_minutes: Number(testDuration),
                questions: formattedQuestions,
            });
            setTestTitle('');
            setTestMode('pilihan_ganda');
            setTestDayType('online');
            setTestDuration(30);
            setTestQuestions([newTestQuestion()]);
            showNotice('success', 'Test bimbel berhasil dibuat.');
        }
        catch (err) {
            showNotice('error', err.message || 'Gagal membuat test bimbel.');
        }
        finally {
            setLoading(null);
        }
    };
    // --- Handler ---
    const syncTotalDuration = (nextSections) => {
        const sum = nextSections.reduce((acc, s) => acc + (Number(s.duration_minutes) || 0), 0);
        if (sum > 0)
            setExamDuration(sum);
    };
    const addSection = () => {
        const next = [...sections, newExamSection(sections.length)];
        setSections(next);
        syncTotalDuration(next);
    };
    const updateSection = (index, patch) => {
        const next = sections.map((s, i) => (i === index ? { ...s, ...patch } : s));
        setSections(next);
        if (patch.duration_minutes !== undefined)
            syncTotalDuration(next);
    };
    const removeSection = (index) => {
        if (sections.length <= 1)
            return;
        if (examQuestions.some(q => q.section_index === index)) {
            showNotice('error', 'Bagian ini masih berisi soal. Pindahkan soalnya sebelum menghapus bagian.');
            return;
        }
        const next = sections.filter((_, i) => i !== index);
        setSections(next);
        syncTotalDuration(next);
        setExamQuestions((prev) => prev.map((q) => ({
            ...q,
            section_index: q.section_index > index ? q.section_index - 1 : q.section_index,
        })));
    };
    const updateExamQuestion = (index, patch) => {
        setExamQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...patch } : q)));
    };
    const updateExamOption = (qIndex, key, value) => {
        setExamQuestions((prev) => prev.map((q, i) => i === qIndex ? { ...q, options: { ...q.options, [key]: value } } : q));
    };
    const createExam = async (e) => {
        e.preventDefault();
        setNotice(null);
        try {
            setLoading('exam');
            if (new Date(examEnd) <= new Date(examStart)) {
                throw new Error('Waktu selesai ujian harus lebih akhir dari waktu mulai.');
            }
            const formattedQuestions = examQuestions.map((q) => {
                const targetSection = sections[q.section_index] ?? sections[0];
                const qType = targetSection.type;
                return {
                    body: q.body,
                    type: qType,
                    options: qType === 'pg' ? q.options : null,
                    answer_key: qType === 'pg' ? q.answer_key : null,
                    points: Number(q.points) || 1,
                    section_index: q.section_index,
                };
            });
            await (exam ? put : post)(exam ? '/manage/exams/' + exam.id : '/exams', {
                ...(exam ? {} : {class_ids:classIds}),
                title: examTitle,
                room: examRoom,
                start_at: new Date(examStart).toISOString(),
                end_at: new Date(examEnd).toISOString(),
                duration_minutes: Number(examDuration),
                sections: sections.map((s) => ({
                    label: s.label,
                    type: s.type,
                    duration_minutes: Number(s.duration_minutes) || 1,
                })),
                questions: formattedQuestions,
            });
            if (onSaved) { onSaved(); return; }
            setExamTitle('');
            setExamRoom('');
            setExamStart('');
            setExamEnd('');
            setExamDuration(30);
            setSections([newExamSection(0)]);
            setExamQuestions([newExamQuestion()]);
            showNotice('success', 'Ujian CBT dibuat & notifikasi email + WhatsApp dikirim ke siswa.');
        }
        catch (err) {
            showNotice('error', err.message || 'Gagal membuat ujian CBT.');
        }
        finally {
            setLoading(null);
        }
    };
    return (element("div", { style: { maxWidth: 640 } },
        element("h1", null, "Kelola Soal & Ujian"),
        notice && (element("p", { className: "muted", style: { color: notice.type === 'error' ? '#dc2626' : 'var(--accent)', fontWeight: 500 } }, notice.text)),
        section === 'test' && (element("div", { className: "card" },
            element("h2", null, "Buat Test Bimbel"),
            element("form", { onSubmit: createTest },
                element("label", null, "Judul"),
                element("input", { value: testTitle, onChange: (e) => setTestTitle(e.target.value), placeholder: "Contoh: Latihan Matematika Pekan 1", required: true }),
                element("label", null, "Mode"),
                element("select", { value: testMode, onChange: (e) => setTestMode(e.target.value) },
                    element("option", { value: "pilihan_ganda" }, "Pilihan Ganda"),
                    element("option", { value: "essay" }, "Essay"),
                    element("option", { value: "campuran" }, "Campuran")),
                element("label", null, "Hari pelaksanaan"),
                element("select", { value: testDayType, onChange: (e) => setTestDayType(e.target.value) },
                    element("option", { value: "online" }, "Online (Senin\u2013Kamis)"),
                    element("option", { value: "offline" }, "Offline / Tugas (Jumat)")),
                element("label", null, "Durasi (menit)"),
                element("input", { type: "number", min: 1, value: testDuration, onChange: (e) => setTestDuration(Number(e.target.value)), required: true }),
                element("label", null, "Daftar Soal"),
                testQuestions.map((q, idx) => {
                    const effectiveType = testMode === 'pilihan_ganda' ? 'pg' : testMode === 'essay' ? 'essay' : q.type;
                    return (element("div", { key: idx, style: subBoxStyle },
                        element("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 } },
                            element("strong", { style: { fontSize: 13 } },
                                "Soal #",
                                idx + 1),
                            testQuestions.length > 1 && (element("button", { type: "button", style: dangerBtnStyle, onClick: () => setTestQuestions((prev) => prev.filter((_, i) => i !== idx)) }, "Hapus"))),
                        testMode === 'campuran' && (element(group, null,
                            element("label", null, "Tipe soal"),
                            element("select", { value: q.type, onChange: (e) => updateTestQuestion(idx, { type: e.target.value }) },
                                element("option", { value: "pg" }, "Pilihan Ganda"),
                                element("option", { value: "essay" }, "Essay")))),
                        element("label", null, "Pertanyaan"),
                        element("textarea", { rows: 2, value: q.body, onChange: (e) => updateTestQuestion(idx, { body: e.target.value }), placeholder: "Tulis pertanyaan...", required: true }),
                        effectiveType === 'pg' && (element(group, null,
                            element("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 } }, ['A', 'B', 'C', 'D'].map((opt) => (element("div", { key: opt },
                                element("label", null,
                                    "Opsi ",
                                    opt),
                                element("input", { value: q.options[opt], onChange: (e) => updateTestOption(idx, opt, e.target.value), placeholder: `Jawaban ${opt}`, required: true }))))),
                            element("label", null, "Kunci jawaban"),
                            element("select", { value: q.answer_key, onChange: (e) => updateTestQuestion(idx, { answer_key: e.target.value }) },
                                element("option", { value: "A" }, "A"),
                                element("option", { value: "B" }, "B"),
                                element("option", { value: "C" }, "C"),
                                element("option", { value: "D" }, "D")))),
                        effectiveType === 'essay' && (element("label", null,
                            "Acuan koreksi guru (opsional)",
                            element("input", { value: q.shortAnswerKey, maxLength: 255, onChange: (e) => updateTestQuestion(idx, { shortAnswerKey: e.target.value }), placeholder: "Contoh: 5" }))),
                        element("label", null, "Ringkasan jawaban / pembahasan (opsional)"),
                        element("input", { value: q.review, onChange: (e) => updateTestQuestion(idx, { review: e.target.value }), placeholder: "Ditampilkan setelah siswa selesai mengerjakan" }),
                        element("label", null, "Bobot soal (poin)"),
                        element("input", { type: "number", min: 1, value: q.points, onChange: (e) => updateTestQuestion(idx, { points: Number(e.target.value) }), required: true })));
                }),
                element("div", { style: { display: 'flex', gap: 8 } },
                    element("button", { type: "button", style: secondaryBtnStyle, onClick: () => setTestQuestions((prev) => [...prev, newTestQuestion()]) }, "+ Tambah Soal"),
                    element("button", { disabled: loading === 'test' }, loading === 'test' ? 'Menyimpan...' : 'Buat Test'))))),
        section === 'cbt' && (element("div", { className: "card cbt-card" },
            element("h2", null, exam ? "Edit Ujian CBT" : "Buat Ujian CBT"),
            element("p", { className: "muted" }, "Setiap bagian punya durasi sendiri (mis. Essay 30 menit, Pilihan Ganda 15 menit). Durasi total dihitung dari seluruh bagian."),
            element("form", { className: "cbt-form", onSubmit: createExam },
                element("label", null, "Judul ujian"),
                element("input", { value: examTitle, onChange: (e) => setExamTitle(e.target.value), placeholder: "Contoh: Try Out UTBK 1", required: true }),
                !exam && element('fieldset',null,element('legend',null,'Kelas peserta'),
                    rooms.failed ? element('button',{type:'button',onClick:rooms.retry},'Daftar kelas gagal dimuat. Coba lagi') :
                    !rooms.data ? 'Memuat kelas...' : !rooms.data.length ? 'Belum ada kelas. Operator dapat membuat kelas di Direktori Sekolah.' :
                    rooms.data.map(c=>element('label',{key:c.id},element('input',{type:'checkbox',disabled:!c.students_count,checked:classIds.includes(c.id),
                        onChange:e=>setClassIds(ids=>e.target.checked ? [...ids,c.id] : ids.filter(id=>id!==c.id))}),classLabel(c)+' ? '+c.students_count+' siswa')),
                    element('p',{role:'status'},(selected.map(classLabel).join(', ') || 'Belum ada kelas dipilih')+' ? '+selected.reduce((n,c)=>n+Number(c.students_count),0)+' peserta')),
                exam && element('p',null,'Daftar peserta mengikuti saat ujian diterbitkan.'),
                element("label", null, "Ruang CBT"),
                element("input", { value: examRoom, onChange: (e) => setExamRoom(e.target.value), placeholder: "Ruang 1", required: true }),
                element("div", { className: "cbt-schedule" },
                    element("div", null,
                        element("label", null, "Mulai"),
                        element("input", { type: "datetime-local", value: examStart, onChange: (e) => setExamStart(e.target.value), required: true })),
                    element("div", null,
                        element("label", null, "Selesai"),
                        element("input", { type: "datetime-local", value: examEnd, onChange: (e) => setExamEnd(e.target.value), required: true }))),
                element("label", null, "Durasi total (menit)"),
                element("input", { type: "number", min: 1, value: examDuration, readOnly: true, required: true }),
                element("label", null, "Bagian Ujian"),
                sections.map((s, idx) => (element("div", { key: idx, style: subBoxStyle },
                    element("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 } },
                        element("strong", { style: { fontSize: 13 } },
                            "Bagian ",
                            idx + 1),
                        sections.length > 1 && (element("button", { type: "button", style: dangerBtnStyle, onClick: () => removeSection(idx) }, "Hapus"))),
                    element("div", { className: "cbt-section-fields" },
                        element("div", null,
                            element("label", null, "Nama bagian"),
                            element("input", { value: s.label, onChange: (e) => updateSection(idx, { label: e.target.value }), placeholder: "Contoh: Essay", required: true })),
                        element("div", null,
                            element("label", null, "Tipe"),
                            element("select", { value: s.type, onChange: (e) => updateSection(idx, { type: e.target.value }) },
                                element("option", { value: "essay" }, "Essay"),
                                element("option", { value: "pg" }, "Pilihan Ganda"))),
                        element("div", null,
                            element("label", null, "Durasi (menit)"),
                            element("input", { type: "number", min: 1, value: s.duration_minutes, onChange: (e) => updateSection(idx, { duration_minutes: Number(e.target.value) }), required: true })))))),
                element("div", { style: { marginBottom: 16 } },
                    element("button", { type: "button", style: secondaryBtnStyle, onClick: addSection }, "+ Tambah Bagian")),
                element("label", null, "Daftar Soal CBT"),
                examQuestions.map((q, idx) => {
                    const activeSection = sections[q.section_index] ?? sections[0];
                    const isPg = activeSection?.type === 'pg';
                    return (element("div", { key: idx, style: subBoxStyle },
                        element("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 } },
                            element("strong", { style: { fontSize: 13 } },
                                "Soal #",
                                idx + 1),
                            examQuestions.length > 1 && (element("button", { type: "button", style: dangerBtnStyle, onClick: () => setExamQuestions((prev) => prev.filter((_, i) => i !== idx)) }, "Hapus"))),
                        element("label", null, "Masuk ke bagian"),
                        element("select", { value: q.section_index, onChange: (e) => updateExamQuestion(idx, { section_index: Number(e.target.value) }) }, sections.map((sec, sIdx) => (element("option", { key: sIdx, value: sIdx },
                            "Bagian ",
                            sIdx + 1,
                            ": ",
                            sec.label || 'Tanpa Nama',
                            " (",
                            sec.type === 'pg' ? 'Pilihan Ganda' : 'Essay',
                            ")")))),
                        element("label", null, "Pertanyaan"),
                        element("textarea", { rows: 2, value: q.body, onChange: (e) => updateExamQuestion(idx, { body: e.target.value }), placeholder: "Tulis pertanyaan...", required: true }),
                        isPg && (element(group, null,
                            element("div", { className: "cbt-options" }, ['A', 'B', 'C', 'D'].map((opt) => (element("div", { key: opt },
                                element("label", null,
                                    "Opsi ",
                                    opt),
                                element("input", { value: q.options[opt], onChange: (e) => updateExamOption(idx, opt, e.target.value), placeholder: `Jawaban ${opt}`, required: true }))))),
                            element("label", null, "Kunci jawaban"),
                            element("select", { value: q.answer_key, onChange: (e) => updateExamQuestion(idx, { answer_key: e.target.value }) },
                                element("option", { value: "A" }, "A"),
                                element("option", { value: "B" }, "B"),
                                element("option", { value: "C" }, "C"),
                                element("option", { value: "D" }, "D")))),
                        element("label", null, "Poin"),
                        element("input", { type: "number", min: 1, value: q.points, onChange: (e) => updateExamQuestion(idx, { points: Number(e.target.value) }), required: true })));
                }),
                element("div", { className: "cbt-actions" },
                    element("button", { type: "button", style: secondaryBtnStyle, onClick: () => setExamQuestions((prev) => [...prev, newExamQuestion()]) }, "+ Tambah Soal"),
                    element("button", { disabled: loading === 'exam' || (!exam && !selected.length) }, loading === 'exam' ? 'Memproses...' : exam ? 'Simpan perubahan' : 'Buat & Notifikasi Siswa')))))));
}
