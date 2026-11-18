<?php
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\{AuthController, TestController, ExamController, MessageController, ImportController};

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::put('/profile', [AuthController::class, 'updateProfile']);
    Route::post('/logout', [AuthController::class, 'logout']);

    // Siswa — bimbel & test
    Route::get('/tests', [TestController::class, 'index']);
    Route::post('/tests/{test}/start', [TestController::class, 'start']);
    Route::post('/attempts/{attempt}/submit', [TestController::class, 'submit']);

    // Siswa — CBT
    Route::get('/exams', [ExamController::class, 'index']);
    Route::post('/exams/{exam}/start', [ExamController::class, 'start']);
    Route::post('/exam-attempts/{attempt}/submit', [ExamController::class, 'submit']);

    // Semua role — pesan ke guru
    Route::get('/teachers', [MessageController::class, 'teachers']);
    Route::get('/messages', [MessageController::class, 'index']);
    Route::post('/messages', [MessageController::class, 'store']);

    Route::get('/directory', [\App\Http\Controllers\DirectoryController::class, 'index'])->middleware('role:guru,admin');
    Route::post('/directory', [\App\Http\Controllers\DirectoryController::class, 'store'])->middleware('role:admin');
    Route::put('/directory/{user}', [\App\Http\Controllers\DirectoryController::class, 'update'])->middleware('role:admin');
    Route::get('/import/students/template', [ImportController::class, 'template'])->middleware('role:admin');

    // Guru/Admin — kelola konten
    Route::post('/tests', [TestController::class, 'storeTest'])->middleware('role:guru,admin');
    Route::post('/exams', [ExamController::class, 'store'])->middleware('role:guru,admin');
    Route::post('/import/students', [ImportController::class, 'students'])->middleware('role:admin');
});

// Registrasi middleware alias di bootstrap/app.php:
// ->withMiddleware(function ($middleware) { $middleware->alias(['role' => \App\Http\Middleware\RoleMiddleware::class]); })
