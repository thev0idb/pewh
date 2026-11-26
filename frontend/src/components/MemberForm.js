import { usePageData } from '../usePageData.js';
import { classLabel } from './SchoolClass.js';
import { element, group } from '../view.js';
import { useState } from '../view.js';
import { ApiError, post, put } from '../api.js';
export default function MemberForm({ role, member, onSaved, onCancel }) {
    const rooms = usePageData(role==='siswa' ? '/school-classes' : null);
    const [room,setRoom] = useState(member?.school_class_id ?? '');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    async function submit(event) {
        event.preventDefault();
        if (busy)
            return;
        const form = new FormData(event.currentTarget);
        const data = Object.fromEntries(form);
        if (!member)
            data.role = role;
        if (member && !data.password)
            delete data.password;
        if (role === 'siswa')
            data.is_bimbel = form.has('is_bimbel');
        setBusy(true);
        setError('');
        try {
            if (member)
                await put('/directory/' + member.id, data);
            else
                await post('/directory', data);
            onSaved();
        }
        catch (err) {
            setError(err instanceof ApiError ? Object.values(err.errors).flat().join(' ') || err.message : 'Gagal menghubungi server.');
        }
        finally {
            setBusy(false);
        }
    }
    return element("form", { className: "card member-form", onSubmit: submit },
        element("h2", null,
            member ? 'Ubah' : 'Tambah',
            " ",
            role),
        element("label", null,
            "Nama",
            element("input", { name: "name", defaultValue: member?.name, required: true, maxLength: 255 })),
        element("label", null,
            "Username",
            element("input", { name: "username", defaultValue: member?.username, required: true, maxLength: 255 })),
        element("label", null,
            "Email",
            element("input", { name: "email", type: "email", defaultValue: member?.email ?? '', required: role === 'guru', maxLength: 255 })),
        element("label", null,
            "No. HP (WhatsApp)",
            element("input", { name: "phone", type: "tel", defaultValue: member?.phone ?? '', required: true, maxLength: 20, placeholder: "081234567890", title: "Nomor Indonesia, contoh 081234567890" })),
        role === 'siswa' && element(group, null,
            element("label", null,
                "NIS",
                element("input", { name: "nis", defaultValue: member?.nis ?? '', required: true, maxLength: 255 })),
            element("label", null,
                "Kelas",
                element('select',{name:'school_class_id',value:room,disabled:!rooms.data,onChange:e=>setRoom(e.target.value)},
                    element('option',{value:''},'Belum ditempatkan'),rooms.data?.map(c=>element('option',{key:c.id,value:c.id},classLabel(c)))),
                rooms.failed && element('button',{type:'button',onClick:rooms.retry},'Muat ulang kelas')),
            element("label", null,
                element("input", { type: "checkbox", name: "is_bimbel", defaultChecked: member?.is_bimbel }),
                " Peserta bimbel")),
        element("label", null,
            member ? 'Password baru (opsional)' : 'Password',
            element("input", { name: "password", type: "password", autoComplete: "new-password", minLength: 8, maxLength: 255, required: !member })),
        error && element("p", { role: "alert" }, error),
        element("div", { className: "member-actions" },
            element("button", { disabled: busy, type: "submit" }, busy ? 'Menyimpan…' : 'Simpan'),
            onCancel && element("button", { disabled: busy, type: "button", onClick: onCancel }, "Batal")));
}
