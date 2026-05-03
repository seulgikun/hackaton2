<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return ['message' => 'ATLAS API is running'];
});
