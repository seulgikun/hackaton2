<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Assignment;

try {
    Assignment::truncate();
    echo "\nSuccess: Database cleaned! You can now click 'Generate Load Plan' in ATLAS.\n";
} catch (\Exception $e) {
    echo "\nError: " . $e->getMessage() . "\n";
}
