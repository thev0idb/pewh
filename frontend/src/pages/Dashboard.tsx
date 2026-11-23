import { usePageData } from '../usePageData';
import { useAuth } from '../context/AuthContext';

type Exam = { id: number; title: string; room: string; start_at: string; end_at: string };

export default function Dashboard() {
  const { user } = useAuth();
  const { data: exams, failed, retry } = usePageData<Exam[]>(user?.role === 'siswa' ? '/exams' : null);

  return (
    <div>
      <h1>Halo, {user?.name}</h1>
      <p className="muted">
        Bimbel offline: Jumat · Bimbel online (test): Senin–Kamis
        {user?.role !== 'siswa' ? ' · Anda masuk sebagai ' + user?.role : ''}
      </p>
      {user?.role === 'siswa' && !exams && (failed
        ? <p role="alert">Jadwal CBT gagal dimuat. <button onClick={retry}>Coba lagi</button></p>
        : <p role="status">Memuat jadwal CBT…</p>)}
      {user?.role === 'siswa' && exams?.length === 0 && <p>Belum ada jadwal CBT.</p>}
      {user?.role === 'siswa' && exams && exams.length > 0 && (
        <div className="card">
          <h2>Pemberitahuan CBT</h2>
          {exams.map((e) => (
            <p key={e.id}>
              <span className="badge">{e.room}</span> <strong>{e.title}</strong> —{' '}
              {new Date(e.start_at).toLocaleString('id-ID')} s.d.{' '}
              {new Date(e.end_at).toLocaleString('id-ID')}. Login CBT memakai username & password akun bimbel Anda.
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
