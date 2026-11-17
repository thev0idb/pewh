<?php
namespace App\Http\Controllers;

use App\Models\{Test, Question, TestAttempt};
use App\Services\TestService;
use Illuminate\Http\Request;

class TestController extends Controller
{
    public function __construct(private TestService $service) {}

    // List test yang tersedia (siswa) — menampilkan waktu + hasil bila selesai
    public function index(Request $r)
    {
        return Test::where('is_published', true)
            ->with(['questions:id,test_id,body,type,options,review,points,order'])
            ->withCount('questions')
            ->get()
            ->map(fn ($t) => [
                'id' => $t->id, 'title' => $t->title, 'mode' => $t->mode,
                'day_type' => $t->day_type, 'duration_minutes' => $t->duration_minutes,
                'question_count' => $t->questions_count,
                'day_allowed' => $this->service->isDayAllowed($t),
                'attempt' => $r->user()->attempts()->where('test_id', $t->id)->latest()->first(['id','score','status']),
            ]);
    }

    public function start(Request $r, Test $test)
    {
        abort_unless($this->service->isDayAllowed($test), 403, 'Test ini hanya bisa dikerjakan pada hari ' . ($test->day_type === 'offline' ? 'Jumat (offline)' : 'Senin–Kamis (online)'));
        $attempt = $r->user()->attempts()->firstOrCreate(
            ['test_id' => $test->id, 'status' => 'in_progress'],
            ['started_at' => now()]
        );
        return ['attempt' => $attempt, 'questions' => $test->questions()->get()->makeHidden('answer_key')];
    }

    public function submit(Request $r, TestAttempt $attempt)
    {
        abort_unless($attempt->user_id === $r->user()->id, 403);
        $answers = $r->validate(['answers' => 'required|array'])['answers'];
        foreach ($answers as $qid => $val) {
            $attempt->answers()->updateOrCreate(
                ['question_id' => $qid],
                ['answer' => is_array($val) ? json_encode($val) : $val]
            );
        }
        $graded = $this->service->grade($attempt);
        // Sertakan review per soal (ringkasan jawaban tepat dari guru)
        return $graded->load('answers.question:id,body,answer_key,review');
    }

    // CRUD soal oleh guru
    public function storeTest(Request $r)
    {
        $data = $r->validate([
            'title' => 'required', 'mode' => 'required|in:essay,pilihan_ganda,campuran',
            'day_type' => 'required|in:online,offline', 'duration_minutes' => 'integer|min:1',
            'passing_score' => 'integer', 'questions' => 'array',
        ]);
        $test = $r->user()->tests()->create($data + ['is_published' => true]);
        foreach ($data['questions'] ?? [] as $i => $q) {
            $test->questions()->create($q + ['order' => $i]);
        }
        return $test->load('questions');
    }
}
