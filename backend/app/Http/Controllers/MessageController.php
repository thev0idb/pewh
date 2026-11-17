<?php
namespace App\Http\Controllers;

use App\Models\{Message, User};
use Illuminate\Http\Request;

class MessageController extends Controller
{
    // Siswa kirim pesan ke guru; guru melihat & membalas pesan masuk
    public function teachers() { return User::where('role', 'guru')->get(['id','name','email','phone']); }

    public function index(Request $r)
    {
        return Message::with('from:id,name', 'to:id,name')
            ->where(fn ($q) => $q->where('from_id', $r->user()->id)->orWhere('to_id', $r->user()->id))
            ->orderByDesc('created_at')->paginate(20);
    }

    public function store(Request $r)
    {
        $data = $r->validate([
            'to_id' => 'required|exists:users,id',
            'subject' => 'required|string|max:150',
            'body' => 'required|string',
        ]);
        return Message::create($data + ['from_id' => $r->user()->id]);
    }
}
