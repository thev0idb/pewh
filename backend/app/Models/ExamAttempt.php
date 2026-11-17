<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ExamAttempt extends Model
{
    protected $fillable = ['user_id','exam_id','started_at','finished_at','score','status'];
    protected $casts = ['started_at' => 'datetime', 'finished_at' => 'datetime'];
    public function user() { return $this->belongsTo(User::class); }
    public function exam(){ return $this->belongsTo(Exam::class); }
}
