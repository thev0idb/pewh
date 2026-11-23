import { FormEvent, useEffect, useState } from 'react';
import { api } from '../api';
import MemberForm, { Member } from '../components/MemberForm';
import { useAuth } from '../context/AuthContext';

type Page = { data: Member[]; current_page: number; last_page: number; total: number };
type Role = 'siswa' | 'guru';
type Enrollment = 'all' | 'participants' | 'nonparticipants';

export default function Directory() {
  const { user } = useAuth();
  const [role, setRole] = useState<Role>('siswa');
  const [enrollment, setEnrollment] = useState<Enrollment>('all');
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setResult(null);
    const query = new URLSearchParams({ role, enrollment: role === 'siswa' ? enrollment : 'all', search, page: String(page) });
    api(`/directory?${query}`, { signal: controller.signal })
      .then((data: Page) => { if (!controller.signal.aborted) setResult(data); })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) setError(err instanceof TypeError
          ? 'Tidak dapat terhubung ke server. Periksa koneksi Anda.'
          : err instanceof Error ? err.message : 'Direktori gagal dimuat.');
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [role, enrollment, search, page, retry]);

  function changeRole(next: Role) {
    if (next === role) return;
    setRole(next);
    setEditingMember(null);
    setPage(1);
    setLoading(true);
  }

  function memberSaved() {
    setEditingMember(null);
    setLoading(true);
    setRetry(value => value + 1);
  }
  function submitSearch(event: FormEvent) {
    event.preventDefault();
    setPage(1);
    setSearch(draft.trim());
  }

  return (
    <div className="directory-page">
      <h1>Direktori Sekolah</h1>
      <p className="muted">Daftar siswa dan guru. Admin dapat mengubah data anggota.</p>
      <div className="directory-tabs" aria-label="Jenis direktori">
        <button type="button" aria-pressed={role === 'siswa'} onClick={() => changeRole('siswa')}>Siswa</button>
        <button type="button" aria-pressed={role === 'guru'} onClick={() => changeRole('guru')}>Guru</button>
      </div>
      <form onSubmit={submitSearch} className="card">
        {role === 'siswa' && <>
          <label htmlFor="directory-enrollment">Kepesertaan bimbel</label>
          <select id="directory-enrollment" value={enrollment} onChange={e => {
            setEnrollment(e.target.value as Enrollment); setPage(1); setLoading(true);
          }}>
            <option value="all">Semua siswa</option>
            <option value="participants">Peserta bimbel</option>
            <option value="nonparticipants">Bukan peserta bimbel</option>
          </select>
        </>}
        <label htmlFor="directory-search">Cari {role}</label>
        <div className="directory-search">
          <input id="directory-search" value={draft} maxLength={255} onChange={e => setDraft(e.target.value)}
            placeholder={role === 'siswa' ? 'Nama, username, NIS, kelas, email, atau no. HP' : 'Nama, email, username, atau no. HP'} />
          <button type="submit">Cari</button>
        </div>
      </form>
      {user?.role === 'admin' && editingMember && (
        <MemberForm
          key={editingMember.id}
          role={role}
          member={editingMember}
          onSaved={memberSaved}
          onCancel={() => setEditingMember(null)}
        />
      )}
      <section aria-label={`Daftar ${role}`} aria-busy={loading}>
        {loading && <p role="status">Memuat direktori…</p>}
        {!loading && error && <div role="alert" className="card">
          <p>{error}</p><button type="button" onClick={() => setRetry(value => value + 1)}>Coba lagi</button>
        </div>}
        {!loading && !error && result && <>
          <p role="status" className="muted">{result.total} {role} ditemukan</p>
          {result.data.length === 0 ? <p className="card">Tidak ada {role} yang sesuai dengan pencarian atau filter ini.</p> :
            <div className="directory-table-wrap">
              <table role="table">
                <caption className="muted">Daftar {role === 'siswa' ? 'siswa' : 'guru'}</caption>
                <thead className="directory-table-header" role="rowgroup"><tr role="row">
                  <th scope="col">Nama</th>
                  {role === 'guru' && <th scope="col">Email</th>}
                  <th scope="col">Username</th>
                  {role === 'guru' ? <th scope="col">No. HP</th> : <>
                    <th scope="col">NIS</th><th scope="col">Kelas</th><th scope="col">Kepesertaan</th>
                  </>}
                  {user?.role === 'admin' && <th scope="col">Aksi</th>}
                </tr></thead>
                <tbody role="rowgroup">{result.data.map(member => <tr key={member.id} role="row">
                  <td className="directory-member-name" role="cell">{member.name}</td>
                  {role === 'guru' && <td role="cell"><span className="directory-field-label" aria-hidden="true">Email</span><span>{member.email ?? '—'}</span></td>}
                  <td role="cell"><span className="directory-field-label" aria-hidden="true">Username</span><span>{member.username}</span></td>
                  {role === 'guru' ? <td role="cell"><span className="directory-field-label" aria-hidden="true">No. HP</span><span>{member.phone ?? '—'}</span></td> : <>
                    <td role="cell"><span className="directory-field-label" aria-hidden="true">NIS</span><span>{member.nis ?? '—'}</span></td>
                    <td role="cell"><span className="directory-field-label" aria-hidden="true">Kelas</span><span>{member.class_room ?? '—'}</span></td>
                    <td role="cell"><span className="directory-field-label" aria-hidden="true">Kepesertaan</span><span><span className={`badge ${member.is_bimbel ? 'directory-participant' : 'directory-nonparticipant'}`}>{member.is_bimbel ? 'Peserta bimbel' : 'Bukan peserta bimbel'}</span></span></td>
                  </>}
                  {user?.role === 'admin' && <td className="directory-member-action" role="cell"><button type="button" aria-label={`Ubah data ${member.name}`} onClick={() => setEditingMember(member)}>Ubah</button></td>}
                </tr>)}</tbody>
              </table>
            </div>}
          <nav className="directory-pagination" aria-label="Halaman direktori">
            <button type="button" disabled={result.current_page <= 1} onClick={() => { setLoading(true); setPage(result.current_page - 1); }}>Sebelumnya</button>
            <span>Halaman {result.current_page} dari {result.last_page}</span>
            <button type="button" disabled={result.current_page >= result.last_page} onClick={() => { setLoading(true); setPage(result.current_page + 1); }}>Berikutnya</button>
          </nav>
        </>}
      </section>
    </div>
  );
}
