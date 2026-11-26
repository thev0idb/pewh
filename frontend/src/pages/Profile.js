import { element } from '../view.js';
import { useState } from '../view.js';
import { put } from '../api.js';
import { useAuth } from '../context/AuthContext.js';
// Siswa bisa ubah username, password, email, no hp — NIS & kelas hanya dari data sekolah
export default function Profile() {
    const { user, refresh } = useAuth();
    const [msg, setMsg] = useState('');
    const submit = async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const data = Object.fromEntries(new FormData(form).entries());
        if (!data.password && !data.password_confirmation) {
            delete data.password;
            delete data.password_confirmation;
        }
        if (data.password && data.password !== data.password_confirmation)
            return setMsg('Konfirmasi password tidak sama');
        try {
            await put('/profile', data);
            await refresh();
            setMsg('Profil berhasil diperbarui');
            for (const name of ['password', 'password_confirmation']) {
                const field = form.elements.namedItem(name);
                if (field instanceof HTMLInputElement)
                    field.value = '';
            }
        }
        catch (err) {
            setMsg(err.message);
        }
    };
    if (!user)
        return null;
    return (element("div", { style: { maxWidth: 480 } },
        element("h1", null, "Profil"),
        msg && element("p", { className: "muted" }, msg),
        element("form", { onSubmit: submit },
            element("label", { htmlFor: "Profile-name" }, "Nama"),
            element("input", { id: "Profile-name", name: "name", defaultValue: user.name }),
            element("label", { htmlFor: "Profile-username" }, "Username"),
            element("input", { id: "Profile-username", name: "username", defaultValue: user.username }),
            element("label", { htmlFor: "Profile-email" }, "Email"),
            element("input", { id: "Profile-email", name: "email", type: "email", defaultValue: user.email ?? '' }),
            element("label", { htmlFor: "Profile-phone" }, "No. HP WhatsApp"),
            element("input", { id: "Profile-phone", name: "phone", type: "tel", required: true, maxLength: 20, defaultValue: user.phone ?? '', placeholder: "081234567890", title: "Nomor Indonesia, contoh 081234567890" }),
            element("label", { htmlFor: "Profile-password" }, "Password baru (kosongkan bila tidak diubah)"),
            element("input", { id: "Profile-password", name: "password", type: "password" }),
            element("label", { htmlFor: "Profile-password_confirmation" }, "Konfirmasi password"),
            element("input", { id: "Profile-password_confirmation", name: "password_confirmation", type: "password" }),
            element("button", null, "Simpan Perubahan")),
        element("div", { className: "card", style: { marginTop: 16 } },
            element("p", { className: "muted", style: { margin: 0 } },
                "Data sekolah (tidak dapat diubah di sini):",
                element("br", null),
                "NIS: ",
                user.nis ?? '-',
                " \u00B7 Kelas: ",
                user.class_room ?? '-'))));
}
