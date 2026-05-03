<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Subject extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = ['name', 'section', 'units', 'required_expertise', 'time_slot', 'days', 'start_time', 'end_time'];

    public function assignments()
    {
        return $this->hasMany(Assignment::class);
    }
}
