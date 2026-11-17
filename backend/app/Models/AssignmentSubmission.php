<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AssignmentSubmission extends Model
{
    protected $fillable = ['assignment_id','user_id','content','submitted_at','grade'];
    protected $casts = ['submitted_at' => 'datetime'];
}
