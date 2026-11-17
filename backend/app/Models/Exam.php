<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Exam extends Model
{
    protected $fillable = ['title','room','start_at','end_at','duration_minutes','created_by','is_published'];
    protected $casts = ['start_at' => 'datetime', 'end_at' => 'datetime', 'is_published' => 'boolean'];

    public function sections() { return $this->hasMany(ExamSection::class); }
    public function questions(){ return $this->hasMany(ExamQuestion::class); }
    public function attempts() { return $this->hasMany(ExamAttempt::class); }
}
