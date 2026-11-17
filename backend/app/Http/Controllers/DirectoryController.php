<?php
namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;

class DirectoryController extends Controller
{
    public function index(Request $request)
    {
        $data = $request->validate([
            'role' => ['sometimes', 'in:siswa,guru'],
            'enrollment' => ['sometimes', 'in:all,participants,nonparticipants'],
            'search' => ['nullable', 'string', 'max:255'],
            'page' => ['sometimes', 'integer', 'min:1'],
        ]);
        $query = User::query()->select(['id', 'name', 'username', 'nis', 'class_room', 'role', 'is_bimbel'])
            ->where('role', $data['role'] ?? 'siswa');
        $enrollment = $data['enrollment'] ?? 'all';
        if ($enrollment !== 'all') $query->where('is_bimbel', $enrollment === 'participants');
        if (($search = trim($data['search'] ?? '')) !== '') {
            $query->where(function ($query) use ($search) {
                foreach (['name', 'username', 'nis', 'class_room'] as $field) $query->orWhere($field, 'like', '%'.$search.'%');
            });
        }
        return $query->orderBy('name')->orderBy('id')->paginate(20)->withQueryString();
    }
}
