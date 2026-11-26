import { element, useState } from '../view.js';
import { put } from '../api.js';
import { usePageData } from '../usePageData.js';

// Guru melihat hasil siswa pada test bimbel (esai, pilihan ganda, campuran):
// daftar test → daftar siswa → detail jawaban per soal (esai bisa langsung dikoreksi).
const MODE = { essay: 'Esai', pilihan_ganda: 'Pilihan ganda', campuran: 'Campuran' };
const STATUS = { submitted: 'Selesai', in_progress: 'Sedang mengerjakan', expired: 'Kedaluwarsa' };
const fmt = (iso) => iso ? new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

function Loading({ data, label }) {
    if (data.failed) return element('p', { role: 'alert' }, label + ' gagal dimuat. ', element('button', { type: 'button', onClick: data.retry }, 'Coba lagi'));
    if (!data.data) return element('p', { role: 'status' }, 'Memuat ' + label.toLowerCase() + '…');
    return null;
}

export default function TestResults() {
    const [test, setTest] = useState(null);
    const [attempt, setAttempt] = useState(null);
    if (test && attempt) return element(AttemptDetail, { test, attemptId: attempt, onBack: () => setAttempt(null) });
    if (test) return element(TestAttempts, { test, onBack: () => setTest(null), onOpen: setAttempt });
    return element(TestList, { onOpen: setTest });
}

function TestList({ onOpen }) {
    const tests = usePageData('/manage/tests');
    return element('div', null,
        element('h1', null, 'Hasil Siswa'),
        element('p', { className: 'muted' }, 'Pilih test bimbel untuk melihat nilai dan jawaban setiap siswa.'),
        element(Loading, { data: tests, label: 'Daftar test' }),
        tests.data?.length === 0 && element('p', { className: 'card' }, 'Belum ada test. Buat test di menu "Buat Test Bimbel".'),
        tests.data?.map(t => element('button', { key: t.id, type: 'button', className: 'card result-card', onClick: () => onOpen(t) },
            element('span', { className: 'result-card-title' },
                element('strong', null, t.title),
                element('span', { className: 'badge' }, MODE[t.mode] ?? t.mode)),
            element('span', { className: 'result-stats' },
                element(Stat, { label: 'Soal', value: t.question_count }),
                element(Stat, { label: 'Dikerjakan', value: t.submitted_count }),
                element(Stat, { label: 'Rata-rata', value: t.average_score ?? '—' }),
                element(Stat, { label: 'Esai belum dikoreksi', value: t.pending_count, warn: t.pending_count > 0 })))));
}

function Stat({ label, value, warn }) {
    return element('span', { className: 'result-stat' + (warn ? ' warn' : '') }, element('b', null, value), element('small', null, label));
}

function TestAttempts({ test, onBack, onOpen }) {
    const data = usePageData(`/manage/tests/${test.id}/results`);
    const [room, setRoom] = useState('');
    const [search, setSearch] = useState('');
    const rows = data.data?.attempts ?? [];
    const rooms = [...new Set(rows.map(a => a.student?.class_room).filter(Boolean))].sort();
    const q = search.trim().toLowerCase();
    const shown = rows.filter(a => (!room || a.student?.class_room === room)
        && (!q || [a.student?.name, a.student?.nis].some(v => v?.toLowerCase().includes(q))));
    const s = data.data?.summary;

    function downloadCsv() {
        const head = ['Nama', 'NIS', 'Kelas', 'Percobaan', 'Status', 'Nilai', 'Lulus', 'Benar', 'Esai belum dikoreksi', 'Selesai'];
        const body = shown.map(a => [a.student?.name, a.student?.nis, a.student?.class_room, a.attempt_no, STATUS[a.status] ?? a.status,
            a.score ?? '', a.passed === null ? '' : a.passed ? 'Ya' : 'Tidak', a.correct_count, a.pending_essays, fmt(a.finished_at)]);
        const csv = [head, ...body].map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
        const link = document.createElement('a');
        link.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' }));
        link.download = `hasil-${test.title.replace(/[^\w-]+/g, '-')}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);
    }

    return element('div', null,
        element('button', { type: 'button', className: 'link-button', onClick: onBack }, '← Semua test'),
        element('h1', null, test.title),
        element('p', { className: 'muted' }, `${MODE[test.mode] ?? test.mode} · KKM ${test.passing_score}`),
        element(Loading, { data, label: 'Hasil siswa' }),
        s && element('div', { className: 'result-stats card' },
            element(Stat, { label: 'Selesai', value: s.submitted }),
            element(Stat, { label: 'Sedang mengerjakan', value: s.in_progress }),
            element(Stat, { label: 'Rata-rata', value: s.average ?? '—' }),
            element(Stat, { label: 'Tertinggi', value: s.highest ?? '—' }),
            element(Stat, { label: 'Terendah', value: s.lowest ?? '—' }),
            element(Stat, { label: 'Lulus KKM', value: s.passed }),
            element(Stat, { label: 'Menunggu koreksi esai', value: s.pending, warn: s.pending > 0 })),
        data.data && element('div', { className: 'result-filters' },
            element('select', { value: room, onChange: e => setRoom(e.target.value), 'aria-label': 'Filter kelas' },
                element('option', { value: '' }, 'Semua kelas'), rooms.map(r => element('option', { key: r, value: r }, r))),
            element('input', { type: 'search', placeholder: 'Cari nama atau NIS', value: search, onChange: e => setSearch(e.target.value), 'aria-label': 'Cari siswa' }),
            element('button', { type: 'button', onClick: downloadCsv, disabled: !shown.length }, 'Unduh CSV')),
        data.data && shown.length === 0 && element('p', { className: 'card' }, rows.length ? 'Tidak ada siswa yang cocok dengan filter.' : 'Belum ada siswa yang mengerjakan test ini.'),
        shown.length > 0 && element('div', { className: 'directory-table-wrap' }, element('table', null,
            element('thead', null, element('tr', null,
                ['Nama', 'Kelas', 'Status', 'Nilai', 'Benar', 'Selesai', ''].map(h => element('th', { key: h }, h)))),
            element('tbody', null, shown.map(a => element('tr', { key: a.id },
                element('td', null, element('strong', null, a.student?.name ?? '—'),
                    a.attempt_no > 1 && element('small', { className: 'muted' }, ` (percobaan ${a.attempt_no})`),
                    a.student?.nis && element('div', { className: 'muted' }, 'NIS ' + a.student.nis)),
                element('td', null, a.student?.class_room ?? '—'),
                element('td', null, STATUS[a.status] ?? a.status),
                element('td', null, a.status !== 'submitted' ? '—'
                    : a.score === null ? element('span', { className: 'badge result-pending' }, 'Menunggu koreksi')
                    : element('span', { className: 'badge ' + (a.passed ? 'result-pass' : 'result-fail') }, `${a.score} · ${a.passed ? 'Lulus' : 'Belum lulus'}`)),
                element('td', null, `${a.correct_count}/${data.data.test.question_count}`),
                element('td', null, fmt(a.finished_at)),
                element('td', null, element('button', { type: 'button', onClick: () => onOpen(a.id) }, a.pending_essays > 0 ? 'Koreksi' : 'Lihat jawaban'))))))));
}

function AttemptDetail({ test, attemptId, onBack }) {
    const data = usePageData(`/manage/tests/${test.id}/attempts/${attemptId}`);
    const d = data.data;
    const optionText = (q, key) => key && q.options?.[key] ? `${key}. ${q.options[key]}` : (key || '—');
    return element('div', { style: { maxWidth: 860 } },
        element('button', { type: 'button', className: 'link-button', onClick: onBack }, '← Daftar siswa'),
        element(Loading, { data, label: 'Jawaban siswa' }),
        d && element('div', null,
            element('h1', null, d.attempt.student?.name ?? 'Siswa'),
            element('p', { className: 'muted' }, [d.test.title, d.attempt.student?.class_room, d.attempt.student?.nis && 'NIS ' + d.attempt.student.nis, 'Selesai ' + fmt(d.attempt.finished_at)].filter(Boolean).join(' · ')),
            element('div', { className: 'result-stats card' },
                element(Stat, { label: 'Nilai', value: d.attempt.score ?? 'Menunggu koreksi' }),
                element(Stat, { label: 'Benar', value: d.questions.filter(q => q.is_correct).length + '/' + d.questions.length }),
                element(Stat, { label: 'Esai belum dikoreksi', value: d.questions.filter(q => q.type === 'essay' && q.answer_id && q.score === null).length })),
            d.questions.map((q, i) => element('section', { key: q.id, className: 'card answer-card ' + (q.score === null && q.answer_id ? 'pending' : q.is_correct ? 'correct' : 'wrong') },
                element('div', { className: 'answer-head' },
                    element('strong', null, `Soal ${i + 1}`),
                    element('span', { className: 'badge' }, q.type === 'pg' ? 'Pilihan ganda' : 'Esai'),
                    element('span', { className: 'muted' }, q.answer_id && q.score !== null ? `${q.score}/${q.points} poin` : `${q.points} poin`)),
                element('p', { className: 'answer-body' }, q.body),
                q.type === 'pg' && q.options && element('ul', { className: 'answer-options' },
                    Object.entries(q.options).map(([k, v]) => element('li', { key: k,
                        className: (k === q.answer_key ? 'key ' : '') + (k === q.answer ? 'chosen' : '') },
                        `${k}. ${v}`, k === q.answer_key && ' ✓ kunci', k === q.answer && k !== q.answer_key && ' ✗ dipilih siswa'))),
                element('p', null, element('b', null, 'Jawaban siswa: '),
                    !q.answer_id || q.answer === null || q.answer === '' ? element('em', { className: 'muted' }, 'Tidak dijawab')
                    : q.type === 'pg' ? optionText(q, q.answer) : element('span', { className: 'answer-text' }, q.answer)),
                q.type === 'essay' && q.answer_key && element('p', null, element('b', null, 'Kunci/acuan: '), q.answer_key),
                q.review && element('p', { className: 'muted' }, element('b', null, 'Pembahasan: '), q.review),
                q.type === 'essay' && q.answer_id && element(EssayGrade, { attemptId, question: q, onSaved: data.retry })))));
}

function EssayGrade({ attemptId, question, onSaved }) {
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    async function save(correct) {
        setSaving(true); setError('');
        try { await put(`/attempts/${attemptId}/essays/${question.answer_id}`, { correct }); onSaved(); }
        catch (err) { setError(err.message || 'Nilai gagal disimpan.'); }
        finally { setSaving(false); }
    }
    return element('div', { className: 'runner-actions' },
        element('span', { className: 'muted' }, question.score === null ? 'Belum dikoreksi:' : 'Ubah koreksi:'),
        element('button', { type: 'button', disabled: saving, onClick: () => save(true) }, `Benar (+${question.points})`),
        element('button', { type: 'button', disabled: saving, className: 'button-secondary', onClick: () => save(false) }, 'Salah (0)'),
        error && element('span', { role: 'alert' }, error));
}
