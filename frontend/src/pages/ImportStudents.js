import { currentYear } from '../components/SchoolClass.js';
import { element } from '../view.js';
import { useRef, useState } from '../view.js';
import { Link } from '../navigation.js';
import MemberForm from '../components/MemberForm.js';
const MAX_FILE_SIZE = 5 * 1024 * 1024;
async function responseError(response) {
    const fallback = response.status === 401
        ? 'Sesi Anda berakhir. Silakan masuk kembali.'
        : response.status === 403
            ? 'Hanya operator yang dapat mengimpor siswa dan mengunduh template.'
            : `Permintaan gagal (HTTP ${response.status}). Silakan coba lagi.`;
    const data = await response.json().catch(() => null);
    const details = [];
    if (data?.errors && typeof data.errors === 'object') {
        for (const [field, messages] of Object.entries(data.errors)) {
            for (const message of Array.isArray(messages) ? messages : [messages]) {
                if (typeof message === 'string')
                    details.push(`${field}: ${message}`);
            }
        }
    }
    return {
        message: typeof data?.message === 'string' && data.message ? data.message : fallback,
        details,
    };
}
export default function ImportStudents() {
    const [startYear,setStartYear] = useState(currentYear);
    const fileInput = useRef(null);
    // A ref closes the gap before React renders the disabled controls.
    const busy = useRef(false);
    const [pending, setPending] = useState(null);
    const [error, setError] = useState(null);
    const [result, setResult] = useState(null);
    const [notice, setNotice] = useState('');
    const [manualRole, setManualRole] = useState('siswa');
    const [manualFormVersion, setManualFormVersion] = useState(0);
    const [manualNotice, setManualNotice] = useState('');
    const submit = async (event) => {
        event.preventDefault();
        if (busy.current)
            return;
        setError(null);
        setResult(null);
        setNotice('');
        const file = fileInput.current?.files?.[0];
        if (!file || !/\.(csv|xlsx|xls)$/i.test(file.name) || file.size > MAX_FILE_SIZE) {
            setError({
                message: !file ? 'Pilih file siswa terlebih dahulu.'
                    : !/\.(csv|xlsx|xls)$/i.test(file.name) ? 'Format file harus CSV, XLSX, atau XLS.'
                        : 'Ukuran file maksimal 5 MiB (5120 KiB).',
                details: [],
            });
            return;
        }
        busy.current = true;
        setPending('import');
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError({ message: 'Silakan masuk sebagai operator terlebih dahulu.', details: [] });
                return;
            }
            const form = new FormData();
            form.append('file', file);
            form.append('start_year', startYear);
            const response = await fetch('/api/import/students', {
                method: 'POST',
                headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
                // The browser must set Content-Type, including the multipart boundary.
                body: form,
            });
            if (!response.ok) {
                setError(await responseError(response));
                return;
            }
            const data = await response.json().catch(() => null);
            if (!Number.isInteger(data?.created) || data.created < 0 ||
                !Number.isInteger(data?.updated) || data.updated < 0) {
                setError({ message: 'Respons impor tidak valid. Periksa direktori sebelum mencoba kembali.', details: [] });
                return;
            }
            setResult({ created: data.created, updated: data.updated });
            if (fileInput.current)
                fileInput.current.value = '';
        }
        catch {
            setError({
                message: 'Impor tidak dapat dikonfirmasi karena gangguan jaringan. Periksa koneksi dan direktori sebelum mencoba kembali.',
                details: [],
            });
        }
        finally {
            busy.current = false;
            setPending(null);
        }
    };
    const downloadTemplate = async () => {
        if (busy.current)
            return;
        busy.current = true;
        setPending('template');
        setError(null);
        setNotice('');
        let url;
        let anchor;
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError({ message: 'Silakan masuk sebagai operator terlebih dahulu.', details: [] });
                return;
            }
            const response = await fetch('/api/import/students/template', {
                method: 'GET',
                headers: { Accept: 'text/csv, application/json', Authorization: `Bearer ${token}` },
            });
            if (!response.ok) {
                setError(await responseError(response));
                return;
            }
            url = URL.createObjectURL(await response.blob());
            anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = 'template-siswa.csv';
            document.body.appendChild(anchor);
            anchor.click();
            setNotice('Unduhan template-siswa.csv telah dimulai.');
        }
        catch {
            setError({ message: 'Template gagal diunduh. Periksa koneksi jaringan, lalu coba lagi.', details: [] });
        }
        finally {
            anchor?.remove();
            // Give the browser time to start the download before releasing the blob.
            if (url) {
                const downloadUrl = url;
                window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
            }
            busy.current = false;
            setPending(null);
        }
    };
    return (element("div", { style: { maxWidth: 860 } },
        element("h1", null, "Impor Data"),
        element("section", { "aria-labelledby": "manual-import-title" },
            element("h2", { id: "manual-import-title" }, "Tambah data secara manual"),
            element("p", null, "Operator dapat menambahkan data siswa atau guru satu per satu."),
            element("div", { className: "directory-tabs", "aria-label": "Jenis data manual" },
                element("button", { type: "button", "aria-pressed": manualRole === 'siswa', onClick: () => {
                        setManualRole('siswa');
                        setManualNotice('');
                    } }, "Siswa"),
                element("button", { type: "button", "aria-pressed": manualRole === 'guru', onClick: () => {
                        setManualRole('guru');
                        setManualNotice('');
                    } }, "Guru")),
            manualNotice && element("p", { role: "status" }, manualNotice),
            element(MemberForm, { key: `${manualRole}-${manualFormVersion}`, role: manualRole, onSaved: () => {
                    setManualNotice(`Data ${manualRole} berhasil ditambahkan.`);
                    setManualFormVersion(value => value + 1);
                } })),
        element("hr", null),
        element("h2", null, "Impor banyak data siswa"),
        element("p", null, "Fitur khusus operator. Siswa dicocokkan hanya berdasarkan NIS: NIS yang sudah ada diperbarui, NIS baru ditambahkan."),
        element("form", { onSubmit: submit, "aria-busy": pending !== null },
            element('label',null,'Tahun awal ajaran untuk kelas dalam file',element('input',{type:'number',min:2000,max:2200,required:true,value:startYear,onChange:e=>setStartYear(e.target.value)})),
            element('p',{className:'muted'},'Nama pada kolom class_room dicocokkan dengan tahun ajaran ini. Nama kelas baru akan ditambahkan ke daftar kelas.'),
            element("label", { htmlFor: "students-file" }, "File siswa"),
            element("input", { ref: fileInput, id: "students-file", name: "file", type: "file", accept: ".csv,.xlsx,.xls", required: true, disabled: pending !== null, "aria-describedby": "import-file-help", onChange: () => { setError(null); setResult(null); setNotice(''); } }),
            element("p", { id: "import-file-help" }, "CSV UTF-8, XLSX, atau XLS; maksimal 5 MiB (5120 KiB)."),
            element("button", { type: "submit", disabled: pending !== null }, pending === 'import' ? 'Mengimpor…' : 'Impor siswa'),
            ' ',
            element("button", { type: "button", onClick: downloadTemplate, disabled: pending !== null }, pending === 'template' ? 'Mengunduh…' : 'Unduh template CSV')),
        error && (element("div", { role: "alert" },
            element("p", null, error.message),
            error.details.length > 0 && element("ul", null, error.details.map((detail, index) => element("li", { key: index }, detail))))),
        result && (element("div", { role: "status" },
            element("p", null,
                "Impor berhasil. Siswa dibuat: ",
                result.created,
                ". Siswa diperbarui: ",
                result.updated,
                "."),
            element(Link, { to: "/direktori" }, "Lihat direktori siswa"))),
        notice && element("p", { role: "status" }, notice),
        element("section", { "aria-labelledby": "import-columns" },
            element("h2", { id: "import-columns" }, "Panduan kolom"),
            element("p", null, "Header wajib berada di baris pertama. Spasi tepi header dihapus dan huruf dinormalisasi menjadi kecil. Header duplikat ditolak; kolom tambahan diabaikan."),
            element("div", { style: { overflowX: 'auto' } },
                element("table", null,
                    element("thead", null,
                        element("tr", null,
                            element("th", { scope: "col" }, "Kolom"),
                            element("th", { scope: "col" }, "Aturan"))),
                    element("tbody", null,
                        element("tr", null,
                            element("td", null,
                                element("code", null, "name")),
                            element("td", null, "Header dan nilai wajib; maksimal 255 karakter.")),
                        element("tr", null,
                            element("td", null,
                                element("code", null, "username")),
                            element("td", null, "Header dan nilai wajib, unik; maksimal 255 karakter.")),
                        element("tr", null,
                            element("td", null,
                                element("code", null, "nis")),
                            element("td", null, "Header dan nilai wajib; maksimal 255 karakter. Satu-satunya identitas pencocokan siswa.")),
                        element("tr", null,
                            element("td", null,
                                element("code", null, "password")),
                            element("td", null, "Wajib untuk siswa baru, 8\u2013255 karakter. Selalu diabaikan untuk siswa lama dan tidak pernah mengubah password yang sudah ada.")),
                        element("tr", null,
                            element("td", null,
                                element("code", null, "class_room")),
                            element("td", null, "Opsional; maksimal 255 karakter.")),
                        element("tr", null,
                            element("td", null,
                                element("code", null, "email")),
                            element("td", null, "Opsional; format email valid, unik, maksimal 255 karakter.")),
                        element("tr", null,
                            element("td", null,
                                element("code", null, "phone")),
                            element("td", null, "Wajib untuk siswa baru (dipakai untuk link WhatsApp); nomor Indonesia seperti 081234567890. Opsional untuk siswa lama.")),
                        element("tr", null,
                            element("td", null,
                                element("code", null, "is_bimbel")),
                            element("td", null, "Opsional; menerima 1/0, yes/no, ya/tidak, true/false (tidak peka huruf besar/kecil)."))))),
            element("ul", null,
                element("li", null, "Kolom opsional yang kosong atau tidak tersedia mempertahankan nilai siswa lama. Untuk siswa baru, nilai opsional kosong menjadi null dan is_bimbel secara default true (peserta bimbel)."),
                element("li", null, "Simpan NIS dan telepon sebagai teks di Excel agar nol di awal tidak hilang. Spasi di tepi nilai teks dihapus."),
                element("li", null, "Maksimal 5000 baris setelah header. Baris kosong diabaikan saat impor, tetapi tetap dihitung dalam batas dan nomor baris. Hanya worksheet pertama yang dibaca; formula tidak dievaluasi."),
                element("li", null, "Impor bersifat atomik: jika satu baris tidak valid, seluruh file ditolak dan tidak ada data disimpan. Nomor baris pada pesan kesalahan mengikuti file asli, dengan header sebagai baris 1."),
                element("li", null, "NIS, username, dan email duplikat dalam file ditolak. Username/email dibandingkan tanpa membedakan kapital dalam file; konflik dengan akun lain dan pertukaran nilai unik antarbaris tidak didukung."),
                element("li", null, "NIS milik guru/operator tidak boleh ditimpa. Impor tidak mengubah role atau status kunci akun lama. Jumlah diperbarui mencakup siswa lama yang valid meskipun nilainya tidak berubah.")))));
}
