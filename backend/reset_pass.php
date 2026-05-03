<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use Illuminate\Support\Facades\Hash;

$user = User::where('email', 'admin@atlas.com')->first();
if ($user) {
    $user->password = Hash::make('chairman123');
    $user->save();
    echo "Password updated successfully for admin@atlas.com\n";
} else {
    echo "User not found\n";
}
