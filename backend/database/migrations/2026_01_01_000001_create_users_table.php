<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('users', function (Blueprint $t) {
            $t->id();
            $t->string('name');
            $t->string('username')->unique();
            $t->string('email')->nullable()->unique();
            $t->string('phone')->nullable();
            $t->string('password');
            $t->enum('role', ['admin','guru','siswa'])->default('siswa');
            $t->string('nis')->nullable()->unique();      // hanya isi oleh sekolah (tidak bisa diubah siswa)
            $t->string('class_room')->nullable();        // hanya isi oleh sekolah
            $t->boolean('is_locked')->default(false);
            $t->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists('users'); }
};
