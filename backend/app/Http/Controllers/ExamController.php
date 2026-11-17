<?php
namespace App\Http\Controllers;

use App\Models\{Exam, ExamAttempt, ExamQuestion};
use App\Services\{ExamService, NotificationService};
use Illuminate\Http\Request;

class ExamController extends Controller
{
    public function __construct(private ExamService $service, private NotificationService $notify) {}

    // Siswa: list jadwal CBT + ruang (setelah hasil bimbel keluar)
    public function index(Request $r)
    {
        return Exam::where('is_published', true)
            ->with('sections')
            ->get()
            ->map(fn ($e) => [
                'id' => $e->id, 'title' => $e->title, 'room' => $e->room,
                'start_at' => $e->start_at, 'end_at' => $e->end_at,
                'duration_minutes' => $e->duration_minutes, 'sections' => $e->sections,
                'attempt' => $r->user()->examAttempts()->where('exam_id', $e->id)->latest()->first(['id','status','score']),
            ]);
    }

    public function start(Request $r, Exam $exam)
    {
        $attempt = $this->service->begin($r->user(), $exam);
        return [
            'attempt' => $attempt,
            'remaining_seconds' => $this->service->remainingSeconds($attempt, $exam),
            'sections' => $exam->sections,
            'questions' => $exam->questions()->orderBy('order')->get()->makeHidden('answer_key'),
        ];
    }

    public function submit(Request $r, ExamAttempt $attempt)
    {
        abort_unless($attempt->user_id === $r->user()->id, 403);
        $this->service->submit($attempt, $r->input('answers', []));
        return $attempt->refresh();
    }

    // Guru/Admin: buat ujian + soal + section + durasi per section, lalu publish & notifikasi
    public function store(Request $r)
    {
        $data = $r->validate([
            'title' => 'required', 'room' => 'required',
            'start_at' => 'required|date', 'end_at' => 'required|date|after:start_at',
            'duration_minutes' => 'integer|min:1',
            'sections' => 'required|array|min:1',   // [{label,type,duration_minutes}]
            'sections.*.label' => 'required', 'sections.*.type' => 'required|in:essay,pg',
            'sections.*.duration_minutes' => 'required|integer|min:1',
            'questions' => 'required|array|min:1',
        ]);
        $exam = Exam::create(collect($data)->only(['title','room','start_at','end_at','duration_minutes'])->all()
            + ['created_by' => $r->user()->id, 'is_published' => true]);
        foreach ($data['sections'] as $i => $s) {
            $exam->sections()->create($s + ['order' => $i]);
        }
        foreach ($data['questions'] as $i => $q) {
            $exam->questions()->create($q + ['order' => $i, 'section_id' => $exam->sections[$q['section_index'] ?? 0]->id ?? null]);
        }
        $this->notify->notifyExam($exam);
        return $exam->load(['sections', 'questions']);
    }
}
