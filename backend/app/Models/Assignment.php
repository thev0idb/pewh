<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

// Tugas tambahan offline (Jumat)
class Assignment extends Model
{
    protected $fillable = ['title','description','created_by','due_at'];
    protected $casts = ['due_at' => 'datetime'];
    public function submissions() { return $this->hasMany(AssignmentSubmission::class); }
}
