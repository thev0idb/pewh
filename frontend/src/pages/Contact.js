import { element, useState } from '../view.js';
import { usePageData } from '../usePageData.js';
import WhatsAppLink from '../components/WhatsApp.js';

// Siswa menghubungi guru langsung lewat WhatsApp masing-masing
export default function Contact() {
    const teachers = usePageData('/teachers');
    const [search, setSearch] = useState('');
    const q = search.trim().toLowerCase();
    const list = teachers.data?.filter(t => !q || t.name.toLowerCase().includes(q));
    return element('div', { style: { maxWidth: 720 } },
        element('h1', null, 'Hubungi Guru'),
        element('p', { className: 'muted' }, 'Tekan tombol WhatsApp untuk langsung chat dengan guru.'),
        element('input', { type: 'search', placeholder: 'Cari nama guru', value: search, onChange: e => setSearch(e.target.value), 'aria-label': 'Cari guru' }),
        teachers.failed && element('p', { role: 'alert' }, 'Daftar guru gagal dimuat. ', element('button', { type: 'button', onClick: teachers.retry }, 'Coba lagi')),
        !teachers.failed && !teachers.data && element('p', { role: 'status' }, 'Memuat daftar guru…'),
        list?.length === 0 && element('p', { className: 'card' }, q ? 'Guru tidak ditemukan.' : 'Belum ada guru.'),
        list?.map(t => element('div', { key: t.id, className: 'card contact-card' },
            element('strong', null, t.name),
            element(WhatsAppLink, { phone: t.phone, name: t.name, label: 'Chat WhatsApp' }))));
}
