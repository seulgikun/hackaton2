<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Teacher;

$t = Teacher::where('name', 'junric')->first();
if ($t) {
    $t->expertise = ['History', 'Mathematics', 'Philosophy'];
    $t->available_times = ['Monday AM', 'Friday PM', 'Wednesday PM'];
    $t->save();
    echo "Junric fixed successfully\n";
} else {
    echo "Junric not found\n";
}
