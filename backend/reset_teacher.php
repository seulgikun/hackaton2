<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use Illuminate\Support\Facades\Hash;

$user = User::where('email', 'junric@gmail.com')->first();
if ($user) {
    $user->password = Hash::make('password123');
    $user->role = 'TEACHER';
    $user->save();
    echo "Teacher 'Junric' password reset to: password123\n";
} else {
    echo "Teacher 'Junric' not found.\n";
}
