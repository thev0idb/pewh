<?php
namespace App\Jobs;

use App\Models\CbtNotification;
use App\Services\NotificationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\Mail;

class SendCbtNotification implements ShouldQueue
{
    use Queueable;

    public function __construct(private int $logId) {}

    public function handle(NotificationService $service): void
    {
        $log = CbtNotification::with(['user', 'exam'])->findOrFail($this->logId);
        $u = $log->user; $e = $log->exam;

        $text = "Halo {$u->name}, Anda dijadwalkan mengikuti CBT: {$e->title}.\n"
              . "Ruang: {$e->room}\nWaktu: {$e->start_at->format('d M Y H:i')} - {$e->end_at->format('H:i')}.\n"
              . "Login CBT menggunakan username & password akun bimbel Anda.";

        $ok = $log->channel === 'email'
            ? $this->sendEmail($u, $text)
            : ($u->phone ? $service->sendWhatsapp($u->phone, $text) : false);

        $log->update(['status' => $ok ? 'sent' : 'failed', 'sent_at' => now()]);
    }

    private function sendEmail($user, string $text): bool
    {
        if (!$user->email) return false;
        try {
            Mail::raw($text, function ($m) use ($user) {
                $m->to($user->email)->subject('Pemberitahuan Pelaksanaan CBT');
            });
            return true;
        } catch (\Throwable) { return false; }
    }
}
