import { createElement as h, useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { ApiError } from '../api.js';

const loginFields = [
    { name:'username', label:'Username', required:true, autoFocus:true },
    { name:'password', label:'Password', type:'password', required:true },
];
const registerFields = [
    { name:'name', label:'Nama lengkap', required:true },
    { name:'username', label:'Username', required:true },
    { name:'email', label:'Email', type:'email' },
    { name:'phone', label:'No. HP WhatsApp (contoh 081234567890)', type:'tel', autoComplete:'tel', required:true },
    { name:'password', label:'Password', type:'password', required:true },
    { name:'password_confirmation', label:'Konfirmasi password', type:'password', required:true },
];

export default function AuthForm({ registration }) {
    const { login, register } = useAuth();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);

    async function submit(event) {
        event.preventDefault();
        if (busy) return;
        const values = Object.fromEntries(new FormData(event.currentTarget));
        setError(null);
        setBusy(true);
        try {
            if (registration) {
                if (values.password !== values.password_confirmation) throw new Error('Konfirmasi password tidak sama');
                await register(values);
            } else await login(values.username, values.password);
            location.assign('/');
        } catch (e) {
            setError({
                message: e instanceof TypeError ? 'Periksa koneksi dan coba lagi.' : e.message,
                fields: e instanceof ApiError ? e.errors : {},
            });
        } finally {
            setBusy(false);
        }
    }

    const fields = registration ? registerFields : loginFields;
    return h('div', { className:'man-auth' },
        h('header', { className:'man-header' }, h('strong', null, 'Madrasah Aliyah Negeri 2 Kota Tangerang')),
        h('div', { className:'man-strip' }, 'Portal Bimbel & CBT'),
        h('main', { className:'man-card' },
            h('h1', null, registration ? 'Daftar Bimbel' : 'Masuk'),
            h('p', { className:'muted' }, registration
                ? 'Siswa lain dapat mendaftar di sini untuk mengikuti bimbel.'
                : 'Gunakan username & password akun bimbel Anda.'),
            error && h('div', { role:'alert' }, error.message,
                Object.entries(error.fields).map(([field, messages]) =>
                    h('p', { key:field }, h('a', { href:'#auth-' + field }, field), ' — ' + messages.join(' ')))),
            h('form', { onSubmit:submit },
                fields.map(({ name, label, ...input }) => [
                    h('label', { key:name + '-label', htmlFor:'auth-' + name }, label),
                    h('input', { key:name, id:'auth-' + name, name, ...input }),
                ]),
                h('button', { disabled:busy }, busy ? (registration ? 'Mendaftarkan…' : 'Memproses…') : (registration ? 'Daftar' : 'Masuk'))),
            registration
                ? h('p', { className:'muted' }, 'Sudah punya akun? ', h('a', { href:'/login' }, 'Masuk'))
                : h('p', { className:'muted' }, 'Belum punya akun? ', h('a', { href:'/register' }, 'Daftar bimbel'))));
}
