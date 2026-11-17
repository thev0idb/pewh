<?php
namespace App\Http\Controllers;

use App\Models\User;
use App\Services\AuthService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function __construct(private AuthService $service) {}

    public function register(Request $r)
    {
        $data = $r->validate([
            'name' => 'required|string|max:100',
            'username' => 'required|unique:users,username',
            'email' => 'nullable|email|unique:users,email',
            'phone' => 'nullable|string',
            'password' => 'required|min:6|confirmed',
        ]);
        $user = $this->service->register($data);
        return response()->json(['user' => $user, 'token' => $user->createToken('web')->plainTextToken], 201);
    }

    public function login(Request $r)
    {
        $r->validate(['username' => 'required', 'password' => 'required']);
        $user = User::where('username', $r->username)->orWhere('email', $r->username)->first();
        abort_unless($user && Hash::check($r->password, $user->password), 401, 'Username atau password salah.');
        abort_if($user->is_locked, 403, 'Akun dikunci.');
        return response()->json(['user' => $user, 'token' => $user->createToken('web')->plainTextToken]);
    }

    public function me(Request $r) { return $r->user(); }

    public function updateProfile(Request $r)
    {
        $data = $r->validate([
            'name' => 'sometimes|string|max:100',
            'username' => 'sometimes|unique:users,username,' . $r->user()->id,
            'email' => 'nullable|email|unique:users,email,' . $r->user()->id,
            'phone' => 'nullable|string',
            'password' => 'nullable|min:6|confirmed',
        ]);
        return $this->service->updateProfile($r->user(), $data);
    }

    public function logout(Request $r) { $r->user()->currentAccessToken()->delete(); return response()->noContent(); }
}
