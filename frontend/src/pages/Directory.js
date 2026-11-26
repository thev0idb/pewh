import { element, group, useState } from '../view.js';
import { ApiError, post } from '../api.js';
import { usePageData } from '../usePageData.js';
import { useAuth } from '../context/AuthContext.js';
import MemberForm from '../components/MemberForm.js';
import WhatsAppLink from '../components/WhatsApp.js';
import { classLabel, currentYear } from '../components/SchoolClass.js';

// Direktori siswa & guru. Data diambil sebagai JSON dari /api/directory.
const COLUMNS = {
    siswa: [['username', 'Username'], ['nis', 'NIS'], ['class_room', 'Kelas'], ['phone', 'WhatsApp']],
    guru: [['email', 'Email'], ['username', 'Username'], ['phone', 'WhatsApp']],
};

export default function Directory() {
    const { user } = useAuth();
    const admin = user?.role === 'operator'; // boleh mengubah data & menambah kelas
    const [filters, setFilters] = useState({ role: 'siswa', page: 1 });
    const [editing, setEditing] = useState(null);
    const [notice, setNotice] = useState('');
    const role = filters.role;
    const query = new URLSearchParams(Object.entries(filters).filter(([, v]) => v !== '' && v != null));
    const members = usePageData('/directory?' + query);
    const rooms = usePageData(role === 'siswa' ? '/school-classes' : null);

    const change = (next) => { setFilters(prev => ({ ...prev, page: 1, ...next })); setEditing(null); setNotice(''); };
    const switchRole = (next) => { setFilters({ role: next, page: 1 }); setEditing(null); setNotice(''); };
    const page = members.data;

    return element('div', { className: 'directory-page' },
        element('h1', null, 'Direktori Sekolah'),
        element('p', { className: 'muted' }, admin ? 'Daftar siswa dan guru. Operator dapat mengubah data anggota serta menambah kelas.' : 'Daftar siswa dan guru.'),
        admin && element(AddClass, { onSaved: (name) => { rooms.retry(); setNotice(`Kelas ${name} berhasil ditambahkan.`); } }),
        element('div', { className: 'directory-tabs', 'aria-label': 'Jenis direktori' },
            [['siswa', 'Siswa'], ['guru', 'Guru']].map(([key, label]) =>
                element('button', { key, type: 'button', 'aria-pressed': role === key, onClick: () => switchRole(key) }, label))),
        element('form', { className: 'card', onSubmit: e => { e.preventDefault(); change({ search: new FormData(e.currentTarget).get('search').trim() }); } },
            role === 'siswa' && element(group, null,
                element('label', null, 'Kelas dan tahun ajaran',
                    element('select', { value: filters.school_class_id ?? '', onChange: e => change({ school_class_id: e.target.value }) },
                        element('option', { value: '' }, 'Semua kelas'),
                        rooms.data?.map(c => element('option', { key: c.id, value: c.id }, `${classLabel(c)} · ${c.students_count ?? 0} siswa`)))),
                element('label', null, 'Kepesertaan bimbel',
                    element('select', { value: filters.enrollment ?? 'all', onChange: e => change({ enrollment: e.target.value }) },
                        element('option', { value: 'all' }, 'Semua siswa'),
                        element('option', { value: 'participants' }, 'Peserta bimbel'),
                        element('option', { value: 'nonparticipants' }, 'Bukan peserta bimbel')))),
            element('label', { htmlFor: 'directory-search' }, 'Cari ' + role),
            element('div', { className: 'directory-search' },
                element('input', { key: role, id: 'directory-search', name: 'search', maxLength: 255, defaultValue: filters.search ?? '',
                    placeholder: role === 'siswa' ? 'Nama, username, NIS, kelas, email, atau no. HP' : 'Nama, email, username, atau no. HP' }),
                element('button', null, 'Cari'))),
        notice && element('p', { role: 'status' }, notice),
        editing && element(MemberForm, { key: editing.id, role, member: editing, onCancel: () => setEditing(null),
            onSaved: () => { setEditing(null); setNotice('Data anggota berhasil disimpan.'); members.retry(); } }),
        members.failed && element('p', { role: 'alert' }, 'Direktori gagal dimuat. ', element('button', { type: 'button', onClick: members.retry }, 'Coba lagi')),
        !members.failed && !page && element('p', { role: 'status' }, 'Memuat direktori…'),
        page && element('section', { 'aria-label': 'Daftar ' + role },
            element('p', { className: 'muted' }, `${page.total} ${role} ditemukan`),
            page.data.length === 0
                ? element('p', { className: 'card' }, `Tidak ada ${role} yang sesuai dengan pencarian atau filter ini.`)
                : element(MemberTable, { role, admin, members: page.data, onEdit: m => { setEditing(m); setNotice(''); } }),
            element('nav', { className: 'directory-pagination', 'aria-label': 'Halaman direktori' },
                element('button', { type: 'button', disabled: page.current_page <= 1, onClick: () => setFilters(f => ({ ...f, page: page.current_page - 1 })) }, 'Sebelumnya'),
                element('span', null, `Halaman ${page.current_page} dari ${page.last_page}`),
                element('button', { type: 'button', disabled: page.current_page >= page.last_page, onClick: () => setFilters(f => ({ ...f, page: page.current_page + 1 })) }, 'Berikutnya'))));
}

function MemberTable({ role, admin, members, onEdit }) {
    const columns = COLUMNS[role];
    return element('div', { className: 'directory-table-wrap' },
        element('table', null,
            element('caption', { className: 'muted' }, 'Daftar ' + role),
            element('thead', { className: 'directory-table-header' },
                element('tr', null,
                    element('th', { scope: 'col' }, 'Nama'),
                    columns.map(([field, label]) => element('th', { key: field, scope: 'col' }, label)),
                    role === 'siswa' && element('th', { scope: 'col' }, 'Kepesertaan'),
                    admin && element('th', { scope: 'col' }, 'Aksi'))),
            element('tbody', null, members.map(m => element('tr', { key: m.id },
                element('td', { className: 'directory-member-name' }, m.name),
                columns.map(([field, label]) => element('td', { key: field },
                    element('span', { className: 'directory-field-label', 'aria-hidden': true }, label + ' '),
                    field === 'phone' ? element(WhatsAppLink, { phone: m.phone, name: m.name }) : element('span', null, m[field] || '—'))),
                role === 'siswa' && element('td', null,
                    element('span', { className: 'directory-field-label', 'aria-hidden': true }, 'Kepesertaan '),
                    element('span', { className: 'badge ' + (m.is_bimbel ? 'directory-participant' : 'directory-nonparticipant') },
                        m.is_bimbel ? 'Peserta bimbel' : 'Bukan peserta bimbel')),
                admin && element('td', { className: 'directory-member-action' },
                    element('button', { type: 'button', 'aria-label': 'Ubah data ' + m.name, onClick: () => onEdit(m) }, 'Ubah')))))));
}

function AddClass({ onSaved }) {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    async function submit(event) {
        event.preventDefault();
        if (busy) return;
        const form = event.currentTarget;
        const data = Object.fromEntries(new FormData(form));
        setBusy(true); setError('');
        try {
            await post('/school-classes', data);
            form.reset();
            onSaved(data.name);
        } catch (err) {
            setError(err instanceof ApiError ? Object.values(err.errors).flat().join(' ') || err.message : 'Gagal menghubungi server.');
        } finally { setBusy(false); }
    }
    return element('details', { className: 'card' },
        element('summary', null, 'Tambah kelas'),
        element('form', { onSubmit: submit },
            element('label', null, 'Nama kelas', element('input', { name: 'name', maxLength: 255, placeholder: 'X IPA 1', required: true })),
            element('label', null, 'Tahun awal ajaran', element('input', { type: 'number', name: 'start_year', min: 2000, max: 2200, defaultValue: currentYear(), required: true })),
            element('button', { disabled: busy }, busy ? 'Menyimpan…' : 'Simpan kelas'),
            error && element('p', { role: 'alert' }, error)));
}
