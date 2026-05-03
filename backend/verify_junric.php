<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use Illuminate\Support\Facades\Hash;

$user = User::where('email', 'junric@gmail.com')->first();
if ($user) {
    echo "Junric User Status:\n";
    echo " - Email: " . $user->email . "\n";
    echo " - Role: " . $user->role . "\n";
    $passMatch = Hash::check('password123', $user->password);
    echo " - Password 'password123' matches: " . ($passMatch ? 'YES' : 'NO') . "\n";
    
    $teacher = $user->teacher;
    if ($teacher) {
        echo " - Teacher Profile found: " . $teacher->name . "\n";
    } else {
        echo " - Teacher Profile NOT found (will be created on first login)\n";
    }
} else {
    echo "Junric User NOT found in database.\n";
}
