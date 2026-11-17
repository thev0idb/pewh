import { FormEvent, useState } from 'react';
import { post } from '../api';

type Notice = { type: 'success' | 'error'; text: string } | null;

type OptionsMap = { A: string; B: string; C: string; D: string };

type TestQuestionItem = {
  body: string;
  type: 'pg' | 'essay';
  options: OptionsMap;
  answer_key: string;
  review: string;
  points: number;
};

type ExamSectionItem = {
  label: string;
  type: 'essay' | 'pg';
  duration_minutes: number;
};

type ExamQuestionItem = {
  section_index: number;
  body: string;
  options: OptionsMap;
  answer_key: string;
  points: number;
};

const emptyOptions = (): OptionsMap => ({ A: '', B: '', C: '', D: '' });

const newTestQuestion = (): TestQuestionItem => ({
  body: '',
  type: 'pg',
  options: emptyOptions(),
  answer_key: 'A',
  review: '',
  points: 1,
});

const newExamSection = (index: number): ExamSectionItem => ({
  label: index === 0 ? 'Essay' : 'Pilihan Ganda',
  type: index === 0 ? 'essay' : 'pg',
  duration_minutes: index === 0 ? 30 : 15,
});

const newExamQuestion = (): ExamQuestionItem => ({
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

// Guru/Admin: buat test bimbel + soal, dan buat ujian CBT (durasi total & per bagian)
export default function Manage({ section }: { section: 'test' | 'cbt' }) {
  const [notice, setNotice] = useState<Notice>(null);
  const [loading, setLoading] = useState<'test' | 'exam' | null>(null);

  // State Form Test Bimbel
  const [testTitle, setTestTitle] = useState('');
  const [testMode, setTestMode] = useState<'pilihan_ganda' | 'essay' | 'campuran'>('pilihan_ganda');
  const [testDayType, setTestDayType] = useState<'online' | 'offline'>('online');
  const [testDuration, setTestDuration] = useState(30);
  const [testQuestions, setTestQuestions] = useState<TestQuestionItem[]>([newTestQuestion()]);

  // State Form Ujian CBT
  const [examTitle, setExamTitle] = useState('');
  const [examRoom, setExamRoom] = useState('');
  const [examStart, setExamStart] = useState('');
  const [examEnd, setExamEnd] = useState('');
  const [examDuration, setExamDuration] = useState(30);
  const [sections, setSections] = useState<ExamSectionItem[]>([newExamSection(0)]);
  const [examQuestions, setExamQuestions] = useState<ExamQuestionItem[]>([newExamQuestion()]);

  const showNotice = (type: 'success' | 'error', text: string) => {
    setNotice({ type, text });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // --- Handler ---
  const updateTestQuestion = (index: number, patch: Partial<TestQuestionItem>) => {
    setTestQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  };

  const updateTestOption = (qIndex: number, key: keyof OptionsMap, value: string) => {
    setTestQuestions((prev) =>
      prev.map((q, i) =>
        i === qIndex ? { ...q, options: { ...q.options, [key]: value } } : q
      )
    );
  };

  const createTest = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setNotice(null);

    try {
      setLoading('test');
      const formattedQuestions = testQuestions.map((q) => {
        const effectiveType =
          testMode === 'pilihan_ganda' ? 'pg' : testMode === 'essay' ? 'essay' : q.type;
        return {
          body: q.body,
          type: effectiveType,
          options: effectiveType === 'pg' ? q.options : null,
          answer_key: effectiveType === 'pg' ? q.answer_key : null,
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
    } catch (err: any) {
      showNotice('error', err.message || 'Gagal membuat test bimbel.');
    } finally {
      setLoading(null);
    }
  };

  // --- Handler ---
  const syncTotalDuration = (nextSections: ExamSectionItem[]) => {
    const sum = nextSections.reduce((acc, s) => acc + (Number(s.duration_minutes) || 0), 0);
    if (sum > 0) setExamDuration(sum);
  };

  const addSection = () => {
    const next = [...sections, newExamSection(sections.length)];
    setSections(next);
    syncTotalDuration(next);
  };

  const updateSection = (index: number, patch: Partial<ExamSectionItem>) => {
    const next = sections.map((s, i) => (i === index ? { ...s, ...patch } : s));
    setSections(next);
    if (patch.duration_minutes !== undefined) syncTotalDuration(next);
  };

  const removeSection = (index: number) => {
    if (sections.length <= 1) return;
    const next = sections.filter((_, i) => i !== index);
    setSections(next);
    syncTotalDuration(next);
    setExamQuestions((prev) =>
      prev.map((q) => ({
        ...q,
        section_index: Math.min(q.section_index, next.length - 1),
      }))
    );
  };

  const updateExamQuestion = (index: number, patch: Partial<ExamQuestionItem>) => {
    setExamQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  };

  const updateExamOption = (qIndex: number, key: keyof OptionsMap, value: string) => {
    setExamQuestions((prev) =>
      prev.map((q, i) =>
        i === qIndex ? { ...q, options: { ...q.options, [key]: value } } : q
      )
    );
  };

  const createExam = async (e: FormEvent<HTMLFormElement>) => {
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

      await post('/exams', {
        title: examTitle,
        room: examRoom,
        start_at: examStart,
        end_at: examEnd,
        duration_minutes: Number(examDuration),
        sections: sections.map((s) => ({
          label: s.label,
          type: s.type,
          duration_minutes: Number(s.duration_minutes) || 1,
        })),
        questions: formattedQuestions,
      });

      setExamTitle('');
      setExamRoom('');
      setExamStart('');
      setExamEnd('');
      setExamDuration(30);
      setSections([newExamSection(0)]);
      setExamQuestions([newExamQuestion()]);
      showNotice('success', 'Ujian CBT dibuat & notifikasi email + WhatsApp dikirim ke siswa.');
    } catch (err: any) {
      showNotice('error', err.message || 'Gagal membuat ujian CBT.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div style={{ maxWidth: 640 }}>
      <h1>Kelola Soal & Ujian</h1>

      {notice && (
        <p
          className="muted"
          style={{ color: notice.type === 'error' ? '#dc2626' : 'var(--accent)', fontWeight: 500 }}
        >
          {notice.text}
        </p>
      )}

      {section === 'test' && (
      <div className="card">
        <h2>Buat Test Bimbel</h2>
        <form onSubmit={createTest}>
          <label>Judul</label>
          <input
            value={testTitle}
            onChange={(e) => setTestTitle(e.target.value)}
            placeholder="Contoh: Latihan Matematika Pekan 1"
            required
          />

          <label>Mode</label>
          <select
            value={testMode}
            onChange={(e) => setTestMode(e.target.value as 'pilihan_ganda' | 'essay' | 'campuran')}
          >
            <option value="pilihan_ganda">Pilihan Ganda</option>
            <option value="essay">Essay</option>
            <option value="campuran">Campuran</option>
          </select>

          <label>Hari pelaksanaan</label>
          <select
            value={testDayType}
            onChange={(e) => setTestDayType(e.target.value as 'online' | 'offline')}
          >
            <option value="online">Online (Senin–Kamis)</option>
            <option value="offline">Offline / Tugas (Jumat)</option>
          </select>

          <label>Durasi (menit)</label>
          <input
            type="number"
            min={1}
            value={testDuration}
            onChange={(e) => setTestDuration(Number(e.target.value))}
            required
          />

          <label>Daftar Soal</label>
          {testQuestions.map((q, idx) => {
            const effectiveType =
              testMode === 'pilihan_ganda' ? 'pg' : testMode === 'essay' ? 'essay' : q.type;

            return (
              <div key={idx} style={subBoxStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <strong style={{ fontSize: 13 }}>Soal #{idx + 1}</strong>
                  {testQuestions.length > 1 && (
                    <button
                      type="button"
                      style={dangerBtnStyle}
                      onClick={() => setTestQuestions((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      Hapus
                    </button>
                  )}
                </div>

                {testMode === 'campuran' && (
                  <>
                    <label>Tipe soal</label>
                    <select
                      value={q.type}
                      onChange={(e) =>
                        updateTestQuestion(idx, { type: e.target.value as 'pg' | 'essay' })
                      }
                    >
                      <option value="pg">Pilihan Ganda</option>
                      <option value="essay">Essay</option>
                    </select>
                  </>
                )}

                <label>Pertanyaan</label>
                <textarea
                  rows={2}
                  value={q.body}
                  onChange={(e) => updateTestQuestion(idx, { body: e.target.value })}
                  placeholder="Tulis pertanyaan..."
                  required
                />

                {effectiveType === 'pg' && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {(['A', 'B', 'C', 'D'] as const).map((opt) => (
                        <div key={opt}>
                          <label>Opsi {opt}</label>
                          <input
                            value={q.options[opt]}
                            onChange={(e) => updateTestOption(idx, opt, e.target.value)}
                            placeholder={`Jawaban ${opt}`}
                            required
                          />
                        </div>
                      ))}
                    </div>

                    <label>Kunci jawaban</label>
                    <select
                      value={q.answer_key}
                      onChange={(e) => updateTestQuestion(idx, { answer_key: e.target.value })}
                    >
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                      <option value="D">D</option>
                    </select>
                  </>
                )}

                <label>Ringkasan jawaban / pembahasan (opsional)</label>
                <input
                  value={q.review}
                  onChange={(e) => updateTestQuestion(idx, { review: e.target.value })}
                  placeholder="Ditampilkan setelah siswa selesai mengerjakan"
                />

                <label>Poin</label>
                <input
                  type="number"
                  min={1}
                  value={q.points}
                  onChange={(e) => updateTestQuestion(idx, { points: Number(e.target.value) })}
                  required
                />
              </div>
            );
          })}

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              style={secondaryBtnStyle}
              onClick={() => setTestQuestions((prev) => [...prev, newTestQuestion()])}
            >
              + Tambah Soal
            </button>
            <button disabled={loading === 'test'}>
              {loading === 'test' ? 'Menyimpan...' : 'Buat Test'}
            </button>
          </div>
        </form>
      </div>
      )}

      {section === 'cbt' && (
      <div className="card">
        <h2>Buat Ujian CBT</h2>
        <p className="muted">
          Setiap bagian punya durasi sendiri (mis. Essay 30 menit, Pilihan Ganda 15 menit). Total
          durasi harus menampung semua bagian.
        </p>

        <form onSubmit={createExam}>
          <label>Judul ujian</label>
          <input
            value={examTitle}
            onChange={(e) => setExamTitle(e.target.value)}
            placeholder="Contoh: Try Out UTBK 1"
            required
          />

          <label>Ruang CBT</label>
          <input
            value={examRoom}
            onChange={(e) => setExamRoom(e.target.value)}
            placeholder="Ruang 1"
            required
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <label>Mulai</label>
              <input
                type="datetime-local"
                value={examStart}
                onChange={(e) => setExamStart(e.target.value)}
                required
              />
            </div>
            <div>
              <label>Selesai</label>
              <input
                type="datetime-local"
                value={examEnd}
                onChange={(e) => setExamEnd(e.target.value)}
                required
              />
            </div>
          </div>

          <label>Durasi total (menit)</label>
          <input
            type="number"
            min={1}
            value={examDuration}
            onChange={(e) => setExamDuration(Number(e.target.value))}
            required
          />

          {/* Bagian Ujian */}
          <label>Bagian Ujian</label>
          {sections.map((s, idx) => (
            <div key={idx} style={subBoxStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <strong style={{ fontSize: 13 }}>Bagian {idx + 1}</strong>
                {sections.length > 1 && (
                  <button type="button" style={dangerBtnStyle} onClick={() => removeSection(idx)}>
                    Hapus
                  </button>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 8 }}>
                <div>
                  <label>Nama bagian</label>
                  <input
                    value={s.label}
                    onChange={(e) => updateSection(idx, { label: e.target.value })}
                    placeholder="Contoh: Essay"
                    required
                  />
                </div>
                <div>
                  <label>Tipe</label>
                  <select
                    value={s.type}
                    onChange={(e) =>
                      updateSection(idx, { type: e.target.value as 'essay' | 'pg' })
                    }
                  >
                    <option value="essay">Essay</option>
                    <option value="pg">Pilihan Ganda</option>
                  </select>
                </div>
                <div>
                  <label>Durasi (menit)</label>
                  <input
                    type="number"
                    min={1}
                    value={s.duration_minutes}
                    onChange={(e) =>
                      updateSection(idx, { duration_minutes: Number(e.target.value) })
                    }
                    required
                  />
                </div>
              </div>
            </div>
          ))}

          <div style={{ marginBottom: 16 }}>
            <button type="button" style={secondaryBtnStyle} onClick={addSection}>
              + Tambah Bagian
            </button>
          </div>

          {/* Soal Ujian CBT */}
          <label>Daftar Soal CBT</label>
          {examQuestions.map((q, idx) => {
            const activeSection = sections[q.section_index] ?? sections[0];
            const isPg = activeSection?.type === 'pg';

            return (
              <div key={idx} style={subBoxStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <strong style={{ fontSize: 13 }}>Soal #{idx + 1}</strong>
                  {examQuestions.length > 1 && (
                    <button
                      type="button"
                      style={dangerBtnStyle}
                      onClick={() => setExamQuestions((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      Hapus
                    </button>
                  )}
                </div>

                <label>Masuk ke bagian</label>
                <select
                  value={q.section_index}
                  onChange={(e) =>
                    updateExamQuestion(idx, { section_index: Number(e.target.value) })
                  }
                >
                  {sections.map((sec, sIdx) => (
                    <option key={sIdx} value={sIdx}>
                      Bagian {sIdx + 1}: {sec.label || 'Tanpa Nama'} (
                      {sec.type === 'pg' ? 'Pilihan Ganda' : 'Essay'})
                    </option>
                  ))}
                </select>

                <label>Pertanyaan</label>
                <textarea
                  rows={2}
                  value={q.body}
                  onChange={(e) => updateExamQuestion(idx, { body: e.target.value })}
                  placeholder="Tulis pertanyaan..."
                  required
                />

                {isPg && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {(['A', 'B', 'C', 'D'] as const).map((opt) => (
                        <div key={opt}>
                          <label>Opsi {opt}</label>
                          <input
                            value={q.options[opt]}
                            onChange={(e) => updateExamOption(idx, opt, e.target.value)}
                            placeholder={`Jawaban ${opt}`}
                            required
                          />
                        </div>
                      ))}
                    </div>

                    <label>Kunci jawaban</label>
                    <select
                      value={q.answer_key}
                      onChange={(e) => updateExamQuestion(idx, { answer_key: e.target.value })}
                    >
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                      <option value="D">D</option>
                    </select>
                  </>
                )}

                <label>Poin</label>
                <input
                  type="number"
                  min={1}
                  value={q.points}
                  onChange={(e) => updateExamQuestion(idx, { points: Number(e.target.value) })}
                  required
                />
              </div>
            );
          })}

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              style={secondaryBtnStyle}
              onClick={() => setExamQuestions((prev) => [...prev, newExamQuestion()])}
            >
              + Tambah Soal
            </button>
            <button disabled={loading === 'exam'}>
              {loading === 'exam' ? 'Memproses...' : 'Buat & Notifikasi Siswa'}
            </button>
          </div>
        </form>
      </div>
      )}
    </div>
  );
}