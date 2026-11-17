<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithLimit;
use Maatwebsite\Excel\Concerns\WithMultipleSheets;

class SiswaImport implements ToCollection, WithLimit, WithMultipleSheets
{
    public int $created = 0;
    public int $updated = 0;

    public function sheets(): array { return [0 => $this]; }
    public function limit(): int { return 5002; }

    public function collection(Collection $rows): void
    {
        if ($rows->count() > 5001) {
            throw ValidationException::withMessages(['file' => ['Maksimal 5000 baris data (di luar judul kolom).']]);
        }
        $headings = collect($rows->first() ?? [])->map(fn ($value) => strtolower(trim(ltrim((string) $value, "\xEF\xBB\xBF"))))->all();
        $missing = array_diff(['name', 'username', 'nis'], $headings);
        if ($missing || count(array_filter($headings)) !== count(array_unique(array_filter($headings)))) {
            throw ValidationException::withMessages(['file' => ['Baris 1: judul kolom name, username, nis wajib tersedia dan judul kolom tidak boleh duplikat.']]);
        }

        DB::transaction(function () use ($rows, $headings) {
            $errors = []; $pending = []; $seen = ['nis' => [], 'username' => [], 'email' => []];
            foreach ($rows->slice(1) as $index => $values) {
                $line = $index + 1;
                if (collect($values)->every(fn ($value) => $value === null || trim((string) $value) === '')) continue;
                $data = [];
                foreach ($headings as $column => $heading) {
                    if ($heading !== '') $data[$heading] = trim((string) ($values[$column] ?? ''));
                }
                $user = ($data['nis'] ?? '') !== '' ? User::where('nis', $data['nis'])->lockForUpdate()->first() : null;
                if ($user && $user->role !== 'siswa') $errors["rows.$line.nis"][] = "Baris $line: NIS milik guru/admin tidak boleh ditimpa.";
                foreach (['nis', 'username', 'email'] as $field) {
                    if (($data[$field] ?? '') === '') continue;
                    $key = mb_strtolower($data[$field]);
                    if (isset($seen[$field][$key])) $errors["rows.$line.$field"][] = "Baris $line: $field duplikat dengan baris {$seen[$field][$key]}.";
                    $seen[$field][$key] = $line;
                }
                $rules = [
                    'name' => ['required', 'string', 'max:255'],
                    'username' => ['required', 'string', 'max:255', Rule::unique('users', 'username')->ignore($user?->id)],
                    'nis' => ['required', 'string', 'max:255'],
                    'email' => ['nullable', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user?->id)],
                    'phone' => ['nullable', 'string', 'max:255'],
                    'class_room' => ['nullable', 'string', 'max:255'],
                ];
                if (!$user) $rules['password'] = ['required', 'string', 'min:8', 'max:255'];
                $validator = Validator::make($data, $rules, [
                    'required' => ':attribute wajib diisi.', 'max' => ':attribute maksimal :max karakter.',
                    'min' => ':attribute minimal :min karakter.', 'unique' => ':attribute sudah digunakan.',
                    'email' => 'Format email tidak valid.', 'string' => ':attribute harus berupa teks.',
                ]);
                foreach ($validator->errors()->messages() as $field => $messages) {
                    foreach ($messages as $message) $errors["rows.$line.$field"][] = "Baris $line: $message";
                }
                $attributes = array_intersect_key($data, array_flip(['name', 'username', 'nis']));
                foreach (['class_room', 'email', 'phone'] as $field) {
                    if (($data[$field] ?? '') !== '') $attributes[$field] = $data[$field];
                }
                if (($data['is_bimbel'] ?? '') !== '') {
                    $flag = strtolower($data['is_bimbel']);
                    if (!in_array($flag, ['1', '0', 'yes', 'no', 'ya', 'tidak', 'true', 'false'], true)) {
                        $errors["rows.$line.is_bimbel"][] = "Baris $line: is_bimbel harus 1/0, yes/no, ya/tidak, atau true/false.";
                    } else $attributes['is_bimbel'] = in_array($flag, ['1', 'yes', 'ya', 'true'], true);
                }
                if (!$user) $attributes += ['password' => $data['password'] ?? '', 'role' => 'siswa', 'is_bimbel' => true];
                $pending[] = [$user, $attributes];
            }
            if (!$pending) $errors['file'][] = 'File tidak berisi data siswa.';
            if ($errors) throw ValidationException::withMessages($errors);
            foreach ($pending as [$user, $attributes]) {
                if ($user) { $user->update($attributes); $this->updated++; }
                else { User::create($attributes); $this->created++; }
            }
        });
    }
}
