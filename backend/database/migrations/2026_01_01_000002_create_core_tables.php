<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('tests', function (Blueprint $t) {
            $t->id();
            $t->string('title');
            $t->text('description')->nullable();
            $t->enum('mode', ['essay','pilihan_ganda','campuran']);
            $t->enum('day_type', ['online','offline'])->default('online'); // online=Senin-Kamis, offline=Jumat
            $t->unsignedInteger('duration_minutes')->default(30);
            $t->unsignedInteger('passing_score')->default(70);
            $t->foreignId('created_by')->constrained('users');
            $t->boolean('is_published')->default(false);
            $t->timestamp('open_at')->nullable();
            $t->timestamp('close_at')->nullable();
            $t->timestamps();
        });

        Schema::create('questions', function (Blueprint $t) {
            $t->id();
            $t->foreignId('test_id')->constrained()->cascadeOnDelete();
            $t->text('body');
            $t->enum('type', ['essay','pg']);
            $t->json('options')->nullable();   // {"A":"..","B":".."}
            $t->string('answer_key')->nullable(); // untuk pg
            $t->text('review')->nullable();       // ringkasan jawaban tepat, diisi guru
            $t->unsignedInteger('points')->default(1);
            $t->unsignedInteger('order')->default(0);
            $t->timestamps();
        });

        Schema::create('test_attempts', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->constrained();
            $t->foreignId('test_id')->constrained();
            $t->timestamp('started_at');
            $t->timestamp('finished_at')->nullable();
            $t->integer('score')->nullable();
            $t->enum('status', ['in_progress','submitted','expired'])->default('in_progress');
            $t->timestamps();
        });

        Schema::create('answers', function (Blueprint $t) {
            $t->id();
            $t->foreignId('attempt_id')->constrained('test_attempts')->cascadeOnDelete();
            $t->foreignId('question_id')->constrained();
            $t->text('answer')->nullable();
            $t->boolean('is_correct')->nullable();
            $t->integer('score')->nullable();
            $t->timestamps();
        });

        Schema::create('exams', function (Blueprint $t) {
            $t->id();
            $t->string('title');
            $t->string('room');                 // ruang CBT
            $t->timestamp('start_at');
            $t->timestamp('end_at');
            $t->unsignedInteger('duration_minutes')->default(90); // total waktu
            $t->foreignId('created_by')->constrained('users');
            $t->boolean('is_published')->default(false);
            $t->timestamps();
        });

        Schema::create('exam_sections', function (Blueprint $t) {
            $t->id();
            $t->foreignId('exam_id')->constrained()->cascadeOnDelete();
            $t->string('label');                // mis. "Essay", "Pilihan Ganda"
            $t->enum('type', ['essay','pg']);
            $t->unsignedInteger('duration_minutes'); // guru atur per bagian
            $t->unsignedInteger('order')->default(0);
            $t->timestamps();
        });

        Schema::create('exam_questions', function (Blueprint $t) {
            $t->id();
            $t->foreignId('exam_id')->constrained()->cascadeOnDelete();
            $t->foreignId('section_id')->nullable()->constrained('exam_sections');
            $t->text('body');
            $t->enum('type', ['essay','pg']);
            $t->json('options')->nullable();
            $t->string('answer_key')->nullable();
            $t->unsignedInteger('points')->default(1);
            $t->unsignedInteger('order')->default(0);
            $t->timestamps();
        });

        Schema::create('exam_attempts', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->constrained();
            $t->foreignId('exam_id')->constrained();
            $t->timestamp('started_at');
            $t->timestamp('finished_at')->nullable();
            $t->json('answers')->nullable();
            $t->integer('score')->nullable();
            $t->enum('status', ['in_progress','submitted','expired'])->default('in_progress');
            $t->timestamps();
        });

        Schema::create('assignments', function (Blueprint $t) {
            $t->id();
            $t->string('title');
            $t->text('description');
            $t->foreignId('created_by')->constrained('users');
            $t->timestamp('due_at');
            $t->timestamps();
        });

        Schema::create('assignment_submissions', function (Blueprint $t) {
            $t->id();
            $t->foreignId('assignment_id')->constrained()->cascadeOnDelete();
            $t->foreignId('user_id')->constrained();
            $t->text('content');
            $t->timestamp('submitted_at');
            $t->integer('grade')->nullable();
            $t->timestamps();
        });

        Schema::create('messages', function (Blueprint $t) {
            $t->id();
            $t->foreignId('from_id')->constrained('users');
            $t->foreignId('to_id')->constrained('users');
            $t->string('subject');
            $t->text('body');
            $t->timestamp('read_at')->nullable();
            $t->timestamps();
        });

        Schema::create('cbt_notifications', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->constrained();
            $t->foreignId('exam_id')->constrained();
            $t->enum('channel', ['email','whatsapp']);
            $t->enum('status', ['pending','sent','failed'])->default('pending');
            $t->timestamp('sent_at')->nullable();
            $t->timestamps();
        });
    }
    public function down(): void {
        foreach (['cbt_notifications','messages','assignment_submissions','assignments',
                  'exam_attempts','exam_questions','exam_sections','exams',
                  'answers','test_attempts','questions','tests'] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
