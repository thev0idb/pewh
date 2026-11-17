<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Test extends Model
{
    protected $fillable = ['title','description','mode','day_type','duration_minutes','passing_score','created_by','is_published','open_at','close_at'];
    // mode: essay | pilihan_ganda | campuran ; day_type: online(Senin-Kamis) | offline(Jumat tugas)
    protected $casts = ['is_published' => 'boolean', 'open_at' => 'datetime', 'close_at' => 'datetime'];

    public function questions() { return $this->hasMany(Question::class); }
    public function creator()   { return $this->belongsTo(User::class, 'created_by'); }
    public function attempts()  { return $this->hasMany(TestAttempt::class); }
}
