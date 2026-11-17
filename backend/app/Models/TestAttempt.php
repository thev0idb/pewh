<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TestAttempt extends Model
{
    protected $fillable = ['user_id','test_id','started_at','finished_at','score','status'];
    protected $casts = ['started_at' => 'datetime', 'finished_at' => 'datetime'];

    public function user()    { return $this->belongsTo(User::class); }
    public function test()    { return $this->belongsTo(Test::class); }
    public function answers() { return $this->hasMany(Answer::class); }
}
