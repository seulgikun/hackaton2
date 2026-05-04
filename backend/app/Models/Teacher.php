<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Teacher extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = ['user_id', 'name', 'expertise', 'available_times', 'availability_details', 'max_units'];

    protected $casts = [
        'expertise' => 'array',
        'available_times' => 'array',
        'availability_details' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class)->withTrashed();
    }

    public function assignments()
    {
        return $this->hasMany(Assignment::class);
    }
}
