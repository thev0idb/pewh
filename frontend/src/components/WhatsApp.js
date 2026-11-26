import { element } from '../view.js';

// Ubah No. HP Indonesia (08xx / 628xx / +628xx) menjadi link wa.me
export function waLink(phone) {
    let digits = String(phone ?? '').replace(/\D/g, '');
    if (digits.startsWith('0')) digits = '62' + digits.slice(1);
    return digits.length >= 10 ? 'https://wa.me/' + digits : null;
}

// Link WhatsApp; bila nomor belum ada tampil keterangan "Belum ada No. HP"
export default function WhatsAppLink({ phone, name, label }) {
    const href = waLink(phone);
    if (!href) return element('span', { className: 'muted' }, 'Belum ada No. HP');
    return element('a', { className: 'wa-link', href, target: '_blank', rel: 'noopener noreferrer',
        'aria-label': 'Chat WhatsApp' + (name ? ' dengan ' + name : '') }, label ?? phone);
}
