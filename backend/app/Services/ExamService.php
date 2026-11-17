<?php
namespace App\Services;

use App\Models\{Exam, ExamAttempt, User, CbtNotification};
use Carbon\Carbon;

class ExamService
{
    // Validasi jendela waktu & token; memaksa satu attempt aktif
    public function begin(User $user, Exam $exam): ExamAttempt
    {
        abort_unless($exam->is_published, 403, 'Ujian belum dibuka.');
        $now = now();
        abort_unless($now->between($exam->start_at, $exam->end_at), 403, 'Ujian di luar jadwal.');

        $active = $user->examAttempts()->where('exam_id', $exam->id)->where('status', 'in_progress')->first();
        if ($active) return $active;

        return ExamAttempt::create([
            'user_id' => $user->id,
            'exam_id' => $exam->id,
            'started_at' => $now,
            'status' => 'in_progress',
        ]);
    }

    public function remainingSeconds(ExamAttempt $attempt, Exam $exam): int
    {
        $deadline = $attempt->started_at->copy()->addMinutes($exam->duration_minutes);
        return max(0, $deadline->diffInSeconds(Carbon::now(), false) * -1);
    }

    public function submit(ExamAttempt $attempt, array $answers): void
    {
        $exam = $attempt->exam;
        $keys = $exam->questions()->where('type', 'pg')->pluck('answer_key', 'id');
        $score = 0; $max = 0;
        foreach ($exam->questions as $q) {
            $max += $q->points;
            $a = $answers[$q->id] ?? null;
            if ($q->type === 'pg' && $a && strtoupper(trim($a)) === strtoupper($keys[$q->id] ?? '')) {
                $score += $q->points;
            }
            // essay dinilai guru kemudian
        }
        $attempt->update([
            'answers' => $answers,
            'score' => $max > 0 ? round($score / $max * 100) : 0,
            'finished_at' => now(),
            'status' => 'submitted',
        ]);
    }
}
