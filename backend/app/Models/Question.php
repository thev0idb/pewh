<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Question extends Model
{
    protected $fillable = ['test_id','body','type','options','answer_key','review','points','order'];
    // type: essay | pg ; options: json ['A'=>..,'B'=>..] ; review: ringkasan jawaban tepat yg diisi guru
    protected $casts = ['options' => 'array'];

    public function test() { return $this->belongsTo(Test::class); }
}
