<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CbtNotification extends Model
{
    protected $fillable = ['user_id','exam_id','channel','status','sent_at'];
    protected $casts = ['sent_at' => 'datetime'];
}
