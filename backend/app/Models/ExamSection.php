<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

// Durasi per bagian: mis. essay 30 menit, pilihan ganda 15 menit
class ExamSection extends Model
{
    protected $fillable = ['exam_id','label','type','duration_minutes','order'];
    public function exam() { return $this->belongsTo(Exam::class); }
}
