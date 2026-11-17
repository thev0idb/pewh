<?php
namespace App\Services;

use App\Models\{User, Exam, CbtNotification};
use App\Jobs\SendCbtNotification;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class NotificationService
{
    // Kirim notifikasi jadwal + ruang CBT via email & whatsapp ke semua siswa
    public function notifyExam(Exam $exam): void
    {
        User::where('role', 'siswa')->chunk(100, function ($students) use ($exam) {
            foreach ($students as $student) {
                foreach (['email', 'whatsapp'] as $channel) {
                    $log = CbtNotification::create([
                        'user_id' => $student->id, 'exam_id' => $exam->id,
                        'channel' => $channel, 'status' => 'pending',
                    ]);
                    SendCbtNotification::dispatch($log->id);
                }
            }
        });
    }

    // Kirim WhatsApp gratis via Fonnte (https://fonnte.com).
    // Syarat: daftar akun Fonnte, scan QR di dashboard, salin token ke FONNTE_TOKEN di .env
    public function sendWhatsapp(string $to, string $message): bool
    {
        $token = env('FONNTE_TOKEN');
        if (!$token || !$to) return false;

        try {
            $response = Http::withHeaders(['Authorization' => $token])
                ->asForm()
                ->post('https://api.fonnte.com/send', [
                    'target'   => $to,       // format 08xxxxxxxxxx
                    'message'  => $message,
                ]);
            // Fonnte mengembalikan {"status":true} bila sukses
            return $response->successful() && ($response->json('status') === true);
        } catch (\Throwable $e) {
            Log::warning('WA gagal: ' . $e->getMessage());
            return false;
        }
    }
}
