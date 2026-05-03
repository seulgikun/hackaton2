<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use Illuminate\Support\Facades\Hash;

$user = User::where('email', 'admin@atlas.com')->first();

if ($user) {
    echo "User found: " . $user->email . "\n";
    echo "Role: " . $user->role . "\n";
    $passMatch = Hash::check('chairman123', $user->password);
    echo "Password 'chairman123' matches: " . ($passMatch ? 'YES' : 'NO') . "\n";
} else {
    echo "User 'admin@atlas.com' NOT found in database.\n";
    
    // List all users to see what's there
    $allUsers = User::all();
    echo "Total users in DB: " . $allUsers->count() . "\n";
    foreach ($allUsers as $u) {
        echo " - " . $u->email . " (" . $u->role . ")\n";
    }
}
