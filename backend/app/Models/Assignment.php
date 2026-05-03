<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

use Illuminate\Database\Eloquent\SoftDeletes;

class Assignment extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'teacher_id', 
        'subject_id', 
        'status', 
        'assignment_reason', 
        'score', 
        'score_breakdown'
    ];

    protected $casts = [
        'score_breakdown' => 'array',
    ];

    public function teacher()
    {
        return $this->belongsTo(Teacher::class)->withTrashed();
    }

    public function subject()
    {
        return $this->belongsTo(Subject::class)->withTrashed();
    }
}
