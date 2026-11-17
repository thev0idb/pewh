<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Answer extends Model
{
    protected $fillable = ['attempt_id','question_id','answer','is_correct','score'];
    public function attempt()  { return $this->belongsTo(TestAttempt::class); }
    public function question() { return $this->belongsTo(Question::class); }
}
