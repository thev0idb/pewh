<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ExamQuestion extends Model
{
    protected $fillable = ['exam_id','section_id','body','type','options','answer_key','points','order'];
    protected $casts = ['options' => 'array'];
    public function exam() { return $this->belongsTo(Exam::class); }
}
