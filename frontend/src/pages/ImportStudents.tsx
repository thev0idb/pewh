import { FormEvent, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
type Feedback = { message: string; details: string[] };
type ImportResult = { created: number; updated: number };

async function responseError(response: Response): Promise<Feedback> {
  const fallback = response.status === 401
    ? 'Sesi Anda berakhir. Silakan masuk kembali.'
    : response.status === 403
      ? 'Hanya admin yang dapat mengimpor siswa dan mengunduh template.'
      : `Permintaan gagal (HTTP ${response.status}). Silakan coba lagi.`;
  const data = await response.json().catch(() => null);
  const details: string[] = [];
  if (data?.errors && typeof data.errors === 'object') {
    for (const [field, messages] of Object.entries(data.errors)) {
      for (const message of Array.isArray(messages) ? messages : [messages]) {
        if (typeof message === 'string') details.push(`${field}: ${message}`);
      }
    }
  }
  return {
    message: typeof data?.message === 'string' && data.message ? data.message : fallback,
    details,
  };
}

export default function ImportStudents() {
  const fileInput = useRef<HTMLInputElement>(null);
  // A ref closes the gap before React renders the disabled controls.
  const busy = useRef(false);
  const [pending, setPending] = useState<'import' | 'template' | null>(null);
  const [error, setError] = useState<Feedback | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [notice, setNotice] = useState('');

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy.current) return;
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
        setError({ message: 'Silakan masuk sebagai admin terlebih dahulu.', details: [] });
        return;
      }
      const form = new FormData();
      form.append('file', file);
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
      if (fileInput.current) fileInput.current.value = '';
    } catch {
      setError({
        message: 'Impor tidak dapat dikonfirmasi karena gangguan jaringan. Periksa koneksi dan direktori sebelum mencoba kembali.',
        details: [],
      });
    } finally {
      busy.current = false;
      setPending(null);
    }
  };

  const downloadTemplate = async () => {
    if (busy.current) return;
    busy.current = true;
    setPending('template');
    setError(null);
    setNotice('');
    let url: string | undefined;
    let anchor: HTMLAnchorElement | undefined;
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError({ message: 'Silakan masuk sebagai admin terlebih dahulu.', details: [] });
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
    } catch {
      setError({ message: 'Template gagal diunduh. Periksa koneksi jaringan, lalu coba lagi.', details: [] });
    } finally {
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

  return (
    <div style={{ maxWidth: 860 }}>
      <h1>Impor Data Siswa</h1>
      <p>Fitur khusus admin. Siswa dicocokkan hanya berdasarkan NIS: NIS yang sudah ada diperbarui, NIS baru ditambahkan.</p>
      <form onSubmit={submit} aria-busy={pending !== null}>
        <label htmlFor="students-file">File siswa</label>
        <input
          ref={fileInput}
          id="students-file"
          name="file"
          type="file"
          accept=".csv,.xlsx,.xls"
          required
          disabled={pending !== null}
          aria-describedby="import-file-help"
          onChange={() => { setError(null); setResult(null); setNotice(''); }}
        />
        <p id="import-file-help">CSV UTF-8, XLSX, atau XLS; maksimal 5 MiB (5120 KiB).</p>
        <button type="submit" disabled={pending !== null}>
          {pending === 'import' ? 'Mengimpor…' : 'Impor siswa'}
        </button>{' '}
        <button type="button" onClick={downloadTemplate} disabled={pending !== null}>
          {pending === 'template' ? 'Mengunduh…' : 'Unduh template CSV'}
        </button>
      </form>
      {error && (
        <div role="alert">
          <p>{error.message}</p>
          {error.details.length > 0 && <ul>{error.details.map((detail, index) => <li key={index}>{detail}</li>)}</ul>}
        </div>
      )}
      {result && (
        <div role="status">
          <p>Impor berhasil. Siswa dibuat: {result.created}. Siswa diperbarui: {result.updated}.</p>
          <Link to="/direktori">Lihat direktori siswa</Link>
        </div>
      )}
      {notice && <p role="status">{notice}</p>}

      <section aria-labelledby="import-columns">
        <h2 id="import-columns">Panduan kolom</h2>
        <p>Header wajib berada di baris pertama. Spasi tepi header dihapus dan huruf dinormalisasi menjadi kecil. Header duplikat ditolak; kolom tambahan diabaikan.</p>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead><tr><th scope="col">Kolom</th><th scope="col">Aturan</th></tr></thead>
            <tbody>
              <tr><td><code>name</code></td><td>Header dan nilai wajib; maksimal 255 karakter.</td></tr>
              <tr><td><code>username</code></td><td>Header dan nilai wajib, unik; maksimal 255 karakter.</td></tr>
              <tr><td><code>nis</code></td><td>Header dan nilai wajib; maksimal 255 karakter. Satu-satunya identitas pencocokan siswa.</td></tr>
              <tr><td><code>password</code></td><td>Wajib untuk siswa baru, 8–255 karakter. Selalu diabaikan untuk siswa lama dan tidak pernah mengubah password yang sudah ada.</td></tr>
              <tr><td><code>class_room</code></td><td>Opsional; maksimal 255 karakter.</td></tr>
              <tr><td><code>email</code></td><td>Opsional; format email valid, unik, maksimal 255 karakter.</td></tr>
              <tr><td><code>phone</code></td><td>Opsional; maksimal 255 karakter.</td></tr>
              <tr><td><code>is_bimbel</code></td><td>Opsional; menerima 1/0, yes/no, ya/tidak, true/false (tidak peka huruf besar/kecil).</td></tr>
            </tbody>
          </table>
        </div>
        <ul>
          <li>Kolom opsional yang kosong atau tidak tersedia mempertahankan nilai siswa lama. Untuk siswa baru, nilai opsional kosong menjadi null dan is_bimbel secara default true (peserta bimbel).</li>
          <li>Simpan NIS dan telepon sebagai teks di Excel agar nol di awal tidak hilang. Spasi di tepi nilai teks dihapus.</li>
          <li>Maksimal 5000 baris setelah header. Baris kosong diabaikan saat impor, tetapi tetap dihitung dalam batas dan nomor baris. Hanya worksheet pertama yang dibaca; formula tidak dievaluasi.</li>
          <li>Impor bersifat atomik: jika satu baris tidak valid, seluruh file ditolak dan tidak ada data disimpan. Nomor baris pada pesan kesalahan mengikuti file asli, dengan header sebagai baris 1.</li>
          <li>NIS, username, dan email duplikat dalam file ditolak. Username/email dibandingkan tanpa membedakan kapital dalam file; konflik dengan akun lain dan pertukaran nilai unik antarbaris tidak didukung.</li>
          <li>NIS milik guru/admin tidak boleh ditimpa. Impor tidak mengubah role atau status kunci akun lama. Jumlah diperbarui mencakup siswa lama yang valid meskipun nilainya tidak berubah.</li>
        </ul>
      </section>
    </div>
  );
}
