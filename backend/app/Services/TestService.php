<?php
namespace App\Services;

use App\Models\{Test, TestAttempt, Answer, User};

class TestService
{
    public function grade(TestAttempt $attempt): TestAttempt
    {
        $total = 0; $max = 0;
        foreach ($attempt->test->questions as $q) {
            $max += $q->points;
            $ans = $attempt->answers()->where('question_id', $q->id)->first();
            if ($q->type === 'pg' && $ans) {
                $correct = strtoupper(trim($ans->answer ?? '')) === strtoupper($q->answer_key ?? '');
                $ans->update(['is_correct' => $correct, 'score' => $correct ? $q->points : 0]);
                if ($correct) $total += $q->points;
            }
        }
        $attempt->update([
            'score' => $max > 0 ? round($total / $max * 100) : 0,
            'finished_at' => now(),
            'status' => 'submitted',
        ]);
        return $attempt->refresh();
    }

    // Validasi hari pelaksanaan: online=Senin-Kamis, offline=Jumat
    public function isDayAllowed(Test $test): bool
    {
        $day = (int) now()->format('N'); // 1=Senin ... 7=Minggu
        return $test->day_type === 'offline' ? $day === 5 : ($day >= 1 && $day <= 4);
    }
}
