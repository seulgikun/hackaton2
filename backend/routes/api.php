<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\TeacherController;
use App\Http\Controllers\SubjectController;
use App\Http\Controllers\AssignmentController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ActivityLogController;
use App\Http\Controllers\NotificationController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Route::post('/register', [AuthController::class, 'register']); // Disabled for security - Admin handles account creation
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login');

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', [AuthController::class, 'profile']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::post('/user/update-credentials', [AuthController::class, 'updateCredentials']);
    
    // Teacher-Only (Profile updates)
    Route::post('/teachers/profile-update', [TeacherController::class, 'updateProfile']);

    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);
    Route::post('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);

    // Admin-Only Routes
    Route::middleware('admin')->group(function () {
        Route::get('/teachers', [TeacherController::class, 'index']);
        Route::post('/teachers', [TeacherController::class, 'store']);
        Route::put('/teachers/{teacher}', [TeacherController::class, 'update']);
        Route::delete('/teachers/{teacher}', [TeacherController::class, 'destroy']);
        Route::post('/teachers/import', [TeacherController::class, 'importCsv']);

        Route::get('/subjects', [SubjectController::class, 'index']);
        Route::post('/subjects', [SubjectController::class, 'store']);
        Route::put('/subjects/{subject}', [SubjectController::class, 'update']);
        Route::delete('/subjects/{subject}', [SubjectController::class, 'destroy']);
        Route::post('/subjects/import', [SubjectController::class, 'importCsv']);

        Route::get('/generate-assignment', [AssignmentController::class, 'index']);
        Route::post('/generate-assignment', [AssignmentController::class, 'generate']);
        Route::post('/assignment/override', [AssignmentController::class, 'override']);
        Route::post('/assignment/rationale', [AssignmentController::class, 'updateRationale']);
        Route::post('/assignment/clear', [AssignmentController::class, 'clear']);
        Route::get('/assignment/archived', [AssignmentController::class, 'archived']);
        Route::post('/assignment/restore', [AssignmentController::class, 'restore']);
        Route::delete('/assignment/archive', [AssignmentController::class, 'deleteArchive']);

        Route::get('/activity-logs', [ActivityLogController::class, 'index']);
    });
});
