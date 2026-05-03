<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$t = App\Models\Teacher::find(8);
echo "Before:\n";
var_dump($t->expertise);

$t->update(['expertise' => ['Mathematics', 'Science']]);

$t = App\Models\Teacher::find(8);
echo "After:\n";
var_dump($t->expertise);
