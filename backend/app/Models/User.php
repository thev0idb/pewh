<?php
namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class User extends Authenticatable
{
    use HasApiTokens, Notifiable, HasFactory;

    protected $fillable = ['name','username','email','phone','password','role','nis','class_room','is_locked','is_bimbel'];
    protected $attributes = ['is_bimbel' => true];
    protected $hidden = ['password'];
    protected $casts = ['password' => 'hashed', 'is_locked' => 'boolean', 'is_bimbel' => 'boolean'];

    public function attempts()   { return $this->hasMany(TestAttempt::class); }
    public function examAttempts(){ return $this->hasMany(ExamAttempt::class); }
    public function messages()     { return $this->hasMany(Message::class, 'from_id'); }
    public function isSiswa(): bool { return $this->role === 'siswa'; }
    public function isGuru(): bool  { return $this->role === 'guru'; }
    public function isAdmin(): bool { return $this->role === 'admin'; }
}
