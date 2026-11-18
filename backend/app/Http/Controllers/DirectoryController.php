<?php
namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class DirectoryController extends Controller
{
    private const STUDENT_FIELDS = ['id', 'name', 'username', 'email', 'phone', 'nis', 'class_room', 'role', 'is_bimbel'];
    private const TEACHER_FIELDS = ['id', 'name', 'email', 'username', 'phone', 'role'];

    private function fieldsForRole(string $role): array
    {
        return $role === 'guru' ? self::TEACHER_FIELDS : self::STUDENT_FIELDS;
    }

    public function store(Request $request)
    {
        $data = $this->validatedData($request);
        $user = User::create($data);

        return response()->json($user->only($this->fieldsForRole($user->role)), 201);
    }

    public function update(Request $request, User $user)
    {
        abort_unless(in_array($user->role, ['siswa', 'guru'], true), 403, 'Hanya siswa dan guru yang dapat diubah.');
        $data = $this->validatedData($request, $user);
        if (empty($data['password'])) {
            unset($data['password']);
        }
        $user->update($data);

        return response()->json($user->only($this->fieldsForRole($user->role)));
    }

    private function validatedData(Request $request, ?User $user = null): array
    {
        $role = $user?->role ?? $request->input('role');
        $unique = fn (string $field) => Rule::unique('users', $field)->ignore($user);

        return $request->validate([
            'role' => $user ? ['missing'] : ['required', Rule::in(['siswa', 'guru'])],
            'name' => ['required', 'string', 'max:255'],
            'username' => ['required', 'string', 'max:255', $unique('username')],
            'email' => [$role === 'guru' ? 'required' : 'nullable', 'email', 'max:255', $unique('email')],
            'phone' => ['nullable', 'string', 'max:255'],
            'password' => [$user ? 'nullable' : 'required', 'string', 'min:8', 'max:255'],
            'nis' => $role === 'siswa' ? ['required', 'string', 'max:255', $unique('nis')] : ['missing'],
            'class_room' => $role === 'siswa' ? ['nullable', 'string', 'max:255'] : ['missing'],
            'is_bimbel' => $role === 'siswa' ? ['sometimes', 'boolean'] : ['missing'],
        ]);
    }

    public function index(Request $request)
    {
        $data = $request->validate([
            'role' => ['sometimes', 'in:siswa,guru'],
            'enrollment' => ['sometimes', 'in:all,participants,nonparticipants'],
            'search' => ['nullable', 'string', 'max:255'],
            'page' => ['sometimes', 'integer', 'min:1'],
        ]);
        $role = $data['role'] ?? 'siswa';
        $fields = $this->fieldsForRole($role);
        $query = User::query()->select($fields)->where('role', $role);
        $enrollment = $data['enrollment'] ?? 'all';
        if ($role === 'siswa' && $enrollment !== 'all') $query->where('is_bimbel', $enrollment === 'participants');
        if (($search = trim($data['search'] ?? '')) !== '') {
            $searchFields = $role === 'siswa'
                ? ['name', 'username', 'email', 'phone', 'nis', 'class_room']
                : ['name', 'email', 'username', 'phone'];
            $query->where(function ($query) use ($search, $searchFields) {
                foreach ($searchFields as $field) $query->orWhere($field, 'like', '%'.$search.'%');
            });
        }
        return $query->orderBy('name')->orderBy('id')->paginate(20)->withQueryString();
    }
}
