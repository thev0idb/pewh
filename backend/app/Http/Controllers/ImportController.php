<?php
namespace App\Http\Controllers;

use App\Services\SiswaImport;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Maatwebsite\Excel\Facades\Excel;

class ImportController extends Controller
{
    public function students(Request $request)
    {
        $request->validate(['file' => ['required', 'file', 'mimes:xlsx,xls,csv,txt', 'extensions:xlsx,xls,csv', 'max:5120']], [
            'file.required' => 'Pilih file untuk diimpor.',
            'file.mimes' => 'File harus berformat XLSX, XLS, atau CSV.',
            'file.extensions' => 'Ekstensi file harus XLSX, XLS, atau CSV.',
            'file.max' => 'Ukuran file maksimal 5 MB.',
        ]);
        $import = new SiswaImport;
        try {
            Excel::import($import, $request->file('file'));
        } catch (ValidationException $exception) {
            throw $exception;
        } catch (\Throwable $exception) {
            // Never expose reader/SQL exception text: it may contain submitted passwords.
            throw ValidationException::withMessages(['file' => ['File tidak dapat diimpor. Periksa format, data unik, dan isi file lalu coba lagi. Tidak ada perubahan yang disimpan.']]);
        }
        return response()->json(['message' => 'Import siswa berhasil.', 'created' => $import->created, 'updated' => $import->updated]);
    }

    public function template()
    {
        return response()->streamDownload(function () {
            $stream = fopen('php://output', 'w');
            fputcsv($stream, ['name', 'username', 'nis', 'password', 'class_room', 'email', 'phone', 'is_bimbel'], ',', '"', '');
            fclose($stream);
        }, 'template-siswa.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
    }
}
