# Direktori sekolah dan impor siswa

Semua URL di bawah memakai awalan `/api` dan autentikasi Sanctum (Bearer token).

## Direktori (admin atau guru)

`GET /api/directory?role=siswa&enrollment=all&search=&page=1`

- `role`: `siswa` (default) atau `guru`; akun admin tidak ditampilkan.
- `enrollment`: `all` (default), `participants` (`is_bimbel=true`), atau `nonparticipants` (`false`). Filter berlaku untuk role yang dipilih.
- `search`: opsional, maksimal 255 karakter; pencarian sebagian pada name, username, nis, class_room.
- `page`: integer positif. Pagination Laravel standar, 20 data per halaman, urutan name lalu id.
- Respons 200: objek paginator `{data: [...], current_page, per_page, total, last_page, ...}`.
- Setiap anggota data HANYA memiliki `id,name,username,nis,class_room,role,is_bimbel`. Flag adalah boolean; email, telepon, password, token dan metadata internal tidak ditampilkan.
- Tanpa autentikasi: 401; siswa: 403; parameter tidak valid: 422.

## Template dan impor (khusus admin)

`GET /api/import/students/template` mengunduh `template-siswa.csv` dengan header saja.

`POST /api/import/students`, multipart/form-data dengan field `file`.
Format: CSV UTF-8, XLSX, XLS; maksimal 5 MB (5120 KiB), 5000 baris setelah header. Baris kosong diabaikan tetapi tetap dihitung pada batas baris dan penomoran. Hanya worksheet pertama dibaca. Header wajib pada baris 1, dinormalisasi trim/lowercase. Judul duplikat ditolak. Kolom tambahan diabaikan; formula tidak dievaluasi.

| Kolom | Aturan |
| --- | --- |
| name | Header dan nilai wajib, maksimal 255 karakter |
| username | Header dan nilai wajib, unik, maksimal 255 karakter |
| nis | Header dan nilai wajib, identitas pencocokan satu-satunya, maksimal 255 karakter |
| password | Wajib hanya untuk siswa baru, 8–255 karakter; SELALU diabaikan untuk siswa yang sudah ada |
| class_room | Opsional, maksimal 255 karakter |
| email | Opsional, format email valid, unik, maksimal 255 karakter |
| phone | Opsional, maksimal 255 karakter |
| is_bimbel | Opsional: 1/0, yes/no, ya/tidak, true/false (tidak peka kapital) |

Simpan NIS/telepon sebagai teks di Excel agar nol awal tidak hilang. Nilai teks dipangkas spasinya. Kolom opsional kosong atau tidak tersedia mempertahankan nilai lama; siswa baru mendapat null untuk kolom opsional kosong dan `is_bimbel=true` jika tidak diisi. Name dan username diperbarui berdasarkan NIS; username/email bukan identitas pencocokan. NIS milik guru/admin tidak boleh ditimpa. NIS, username, dan email duplikat dalam file ditolak (username/email dibandingkan tanpa membedakan kapital dalam file). Konflik username/email dengan akun lain ditolak; pertukaran nilai unik antarbaris tidak didukung. Impor tidak mengubah role atau is_locked akun lama.

Seluruh file atomik: jika satu baris tidak valid, tidak ada data disimpan. Respons sukses 200:

```json
{"message":"Import siswa berhasil.","created":2,"updated":1}
```

`updated` menghitung siswa lama valid yang diproses, termasuk jika nilainya sama. Respons validasi 422 memakai bentuk Laravel:

```json
{"message":"...","errors":{"rows.4.password":["Baris 4: password minimal 8 karakter."]}}
```

Nomor baris dimulai dari 1 (header); baris kosong tidak menggeser nomor. Kesalahan tingkat file ada di `errors.file`. Pesan error tidak menyertakan nilai password atau exception pembaca/SQL. Tanpa autentikasi: 401; non-admin: 403.

## Migrasi dan pengujian

Migrasi additive `2026_11_17_000001_add_is_bimbel_to_users_table.php` memberi default true kepada akun lama dan akun baru. Flag ini hanya metadata kepesertaan; tidak mengubah otorisasi ujian/bimbel yang sudah ada. Migrasi ini sudah dijalankan pada MySQL lokal saat implementasi, tanpa reset atau pembaruan massal data. Untuk lingkungan lain, jalankan migrasi sebagai langkah deployment setelah backup.

`php artisan test` menggunakan SQLite `:memory:` sesuai phpunit.xml. Feature tests mencakup upload CSV/XLSX/XLS nyata, default akun lama, otorisasi, template, batas file/baris, rollback, konflik identitas, preservasi password dan kolom opsional, serta pagination/filter/field publik direktori.
