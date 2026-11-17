import { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

type Exam = { id: number; title: string; room: string; start_at: string; end_at: string };

export default function Dashboard() {
  const { user } = useAuth();
  const [exams, setExams] = useState<Exam[]>([]);
  useEffect(() => { api('/exams').then(setExams); }, []);

  return (
    <div>
      <h1>Halo, {user?.name}</h1>
      <p className="muted">
        Bimbel offline: Jumat · Bimbel online (test): Senin–Kamis
        {user?.role !== 'siswa' ? ' · Anda masuk sebagai ' + user?.role : ''}
      </p>
      {user?.role === 'siswa' && exams.length > 0 && (
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
