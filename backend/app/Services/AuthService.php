<?php
namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Hash;

class AuthService
{
    public function register(array $data): User
    {
        return User::create([
            'name' => $data['name'],
            'username' => $data['username'],
            'email' => $data['email'] ?? null,
            'phone' => $data['phone'] ?? null,
            'password' => $data['password'], // auto-hashed via casts
            'role' => 'siswa',
        ]);
    }

    public function updateProfile(User $user, array $data): User
    {
        // Siswa hanya boleh ubah field ini; nis/class_room hanya bisa diubah admin/guru via import
        $allowed = array_intersect_key($data, array_flip(['name','username','email','phone','password']));
        if (isset($allowed['password'])) $allowed['password'] = Hash::make($allowed['password']);
        $user->update($allowed);
        return $user;
    }
}
