<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $users = [
            [
                'name' => 'Admin Demo',
                'username' => 'admin',
                'email' => 'admin@pweh.test',
                'password' => 'Admin@12345',
                'role' => 'admin',
            ],
            [
                'name' => 'Guru Demo',
                'username' => 'guru',
                'email' => 'guru@pweh.test',
                'password' => 'Guru@12345',
                'role' => 'guru',
            ],
            [
                'name' => 'Siswa Demo',
                'username' => 'siswa',
                'email' => 'siswa@pweh.test',
                'password' => 'Siswa@12345',
                'role' => 'siswa',
                'nis' => 'S-0001',
                'class_room' => 'X-A',
            ],
        ];

        foreach ($users as $user) {
            User::updateOrCreate(
                ['username' => $user['username']],
                $user
            );
        }
    }
}
