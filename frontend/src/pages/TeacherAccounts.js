import { element } from '../view.js';
import { useState } from '../view.js';
import { ApiError, api, post, put } from '../api.js';
import { usePageData } from '../usePageData.js';
import WhatsAppLink from '../components/WhatsApp.js';
// Operator membuat & mengelola akun guru; guru baru langsung muncul di daftar guru siswa
export default function TeacherAccounts() {
    const teachers = usePageData('/teacher-accounts');
    const [editing, setEditing] = useState(null); // null = tutup, 'new' = tambah, objek = ubah
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [msg, setMsg] = useState('');
    const [search, setSearch] = useState('');
    async function submit(event) {
        event.preventDefault();
        if (busy) return;
        const form = event.currentTarget;
        const data = Object.fromEntries(new FormData(form));
        data.is_locked = form.elements.is_locked.checked;
        if (editing !== 'new' && !data.password) delete data.password;
        setBusy(true); setError('');
        try {
            if (editing === 'new') {
                const saved = await post('/teacher-accounts', data);
                teachers.setData(list => [...(list ?? []), saved].sort((a, b) => a.name.localeCompare(b.name)));
                setMsg(`Akun guru "${saved.name}" berhasil dibuat.`);
            } else {
                const saved = await put('/teacher-accounts/' + editing.id, data);
                teachers.setData(list => list.map(t => t.id === saved.id ? saved : t));
                setMsg(`Akun guru "${saved.name}" berhasil diperbarui.`);
            }
            setEditing(null);
        } catch (err) {
            setError(err instanceof ApiError ? Object.values(err.errors).flat().join(' ') || err.message : 'Gagal menghubungi server.');
        } finally { setBusy(false); }
    }
    async function remove(t) {
        if (busy || !confirm(`Hapus akun guru "${t.name}"?`)) return;
        setBusy(true); setMsg('');
        try {
            const res = await api('/teacher-accounts/' + t.id, { method: 'DELETE' });
            teachers.setData(list => res.deleted ? list.filter(x => x.id !== t.id) : list.map(x => x.id === t.id ? res.teacher : x));
            if (editing?.id === t.id) setEditing(null);
            setMsg(res.message);
        } catch (err) {
            setMsg(err instanceof Error ? err.message : 'Gagal menghapus akun.');
        } finally { setBusy(false); }
    }
    const member = editing && editing !== 'new' ? editing : null;
    const q = search.trim().toLowerCase();
    const list = teachers.data?.filter(t => !q || [t.name, t.username, t.email].some(v => v?.toLowerCase().includes(q)));
    return element("div", null,
        element("h1", null, "Kelola Akun Guru"),
        element("p", { className: "muted" }, "Guru yang dibuat di sini langsung bisa login dan tampil di daftar guru pada halaman siswa."),
        msg && element("p", { role: "status" }, msg),
        !editing && element("button", { type: "button", onClick: () => { setEditing('new'); setMsg(''); setError(''); } }, "+ Tambah Guru"),
        editing && element("form", { key: member?.id ?? 'new', className: "card member-form", onSubmit: submit },
            element("h2", null, member ? 'Ubah akun guru' : 'Tambah akun guru'),
            element("label", null, "Nama", element("input", { name: "name", defaultValue: member?.name, required: true, maxLength: 255 })),
            element("label", null, "Username", element("input", { name: "username", defaultValue: member?.username, required: true, maxLength: 255 })),
            element("label", null, "Email", element("input", { name: "email", type: "email", defaultValue: member?.email ?? '', required: true, maxLength: 255 })),
            element("label", null, "No. HP (WhatsApp)", element("input", { name: "phone", type: "tel", defaultValue: member?.phone ?? '', required: true, maxLength: 20, placeholder: "081234567890", title: "Nomor Indonesia, contoh 081234567890" })),
            element("label", null, member ? 'Password baru (opsional)' : 'Password',
                element("input", { name: "password", type: "password", autoComplete: "new-password", minLength: 8, maxLength: 255, required: !member })),
            element("label", null, element("input", { type: "checkbox", name: "is_locked", defaultChecked: member?.is_locked }), " Kunci akun (tidak bisa login & disembunyikan dari siswa)"),
            error && element("p", { role: "alert" }, error),
            element("div", { className: "member-actions" },
                element("button", { disabled: busy, type: "submit" }, busy ? 'Menyimpan…' : 'Simpan'),
                element("button", { disabled: busy, type: "button", onClick: () => setEditing(null) }, "Batal"))),
        element("h2", null, "Daftar Guru"),
        element("input", { type: "search", placeholder: "Cari nama, username, atau email", value: search, onChange: e => setSearch(e.target.value), "aria-label": "Cari guru" }),
        teachers.failed && element("p", { role: "alert" }, "Daftar guru gagal dimuat. ", element("button", { type: "button", onClick: teachers.retry }, "Coba lagi")),
        !teachers.failed && !teachers.data && element("p", { role: "status" }, "Memuat daftar guru…"),
        list?.length === 0 && element("p", { className: "card" }, "Belum ada guru."),
        list?.map(t => element("div", { className: "card", key: t.id },
            element("strong", null, t.name), t.is_locked && element("span", { className: "muted" }, " · terkunci"),
            element("p", { className: "muted" }, `${t.username} · ${t.email ?? '-'} · `, element(WhatsAppLink, { phone: t.phone, name: t.name })),
            element("div", { className: "member-actions" },
                element("button", { type: "button", disabled: busy, onClick: () => { setEditing(t); setMsg(''); setError(''); } }, "Ubah"),
                element("button", { type: "button", disabled: busy, onClick: () => remove(t) }, "Hapus")))));
}
