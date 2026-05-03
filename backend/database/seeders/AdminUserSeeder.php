<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        User::updateOrCreate(
            ['email' => 'admin@atlas.com'],
            [
                'name' => 'Program Chairman',
                'password' => Hash::make('chairman123'),
                'role' => 'ADMIN',
            ]
        );
    }
}
