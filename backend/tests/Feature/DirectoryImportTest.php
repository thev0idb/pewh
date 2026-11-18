<?php
namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Tests\TestCase;

class DirectoryImportTest extends TestCase
{
    use RefreshDatabase;

    private function user(string $role = 'admin', array $data = []): User
    {
        static $number = 0;
        return User::create($data + ['name' => 'User '.++$number, 'username' => 'user'.$number, 'password' => 'old-password', 'role' => $role]);
    }
    private function csv(string $body): UploadedFile
    {
        return UploadedFile::fake()->createWithContent('students.csv', $body);
    }
    private function upload(string $body)
    {
        return $this->postJson('/api/import/students', ['file' => $this->csv($body)]);
    }
    public function test_authorization_and_template(): void
    {
        $this->getJson('/api/directory')->assertUnauthorized();
        $this->postJson('/api/import/students')->assertUnauthorized();
        $this->getJson('/api/import/students/template')->assertUnauthorized();
        Sanctum::actingAs($this->user('siswa'));
        $this->getJson('/api/directory')->assertForbidden();
        $this->postJson('/api/import/students')->assertForbidden();
        $this->getJson('/api/import/students/template')->assertForbidden();
        Sanctum::actingAs($this->user('guru'));
        $this->getJson('/api/directory')->assertOk();
        $this->postJson('/api/import/students')->assertForbidden();
        $this->getJson('/api/import/students/template')->assertForbidden();
        Sanctum::actingAs($this->user());
        $response = $this->get('/api/import/students/template')->assertOk();
        $this->assertStringContainsString('name,username,nis,password,class_room,email,phone,is_bimbel', $response->streamedContent());
    }
    public function test_csv_creates_and_updates_without_changing_password_or_blank_optional_fields(): void
    {
        Sanctum::actingAs($this->user());
        $old = $this->user('siswa', ['nis' => '001', 'email' => 'old@example.test', 'phone' => '123', 'class_room' => 'X', 'is_bimbel' => false]);
        $hash = $old->password;
        $this->upload("name,username,nis,password,email,phone,class_room,is_bimbel\nUpdated,changed,001,ignored,,,,\n,,,,,,,\nNew,new,002,new-password,,,,\nOther,other,003,another-password,,,,ya\n")
            ->assertOk()->assertJson(['created' => 2, 'updated' => 1]);
        $old->refresh();
        $this->assertSame($hash, $old->password);
        $this->assertSame('old@example.test', $old->email);
        $this->assertSame('123', $old->phone);
        $this->assertSame('X', $old->class_room);
        $this->assertFalse($old->is_bimbel);
        $new = User::where('nis', '002')->firstOrFail();
        $this->assertTrue($new->is_bimbel);
        $this->assertTrue(Hash::check('new-password', $new->password));
    }
    public function test_real_xlsx_upload(): void
    {
        Sanctum::actingAs($this->user());
        $sheet = new Spreadsheet;
        $sheet->getActiveSheet()->fromArray([['name','username','nis','password','is_bimbel'], ['Excel','excel','100','password123','tidak']]);
        $path = tempnam(sys_get_temp_dir(), 'xlsx');
        try {
            (new Xlsx($sheet))->save($path);
            $file = new UploadedFile($path, 'students.xlsx', null, null, true);
            $this->postJson('/api/import/students', ['file' => $file])->assertOk()->assertJson(['created' => 1, 'updated' => 0]);
            $this->assertFalse(User::where('nis', '100')->firstOrFail()->is_bimbel);
        } finally { @unlink($path); $sheet->disconnectWorksheets(); }
    }
    public function test_real_xls_upload_and_legacy_migration_default(): void
    {
        $admin = $this->user();
        Sanctum::actingAs($admin);
        $migration = require database_path('migrations/2026_11_17_000001_add_is_bimbel_to_users_table.php');
        $migration->down();
        $migration->up();
        $this->assertTrue($admin->fresh()->is_bimbel);
        $sheet = new Spreadsheet;
        $sheet->getActiveSheet()->fromArray([['name','username','nis','password','is_bimbel'], ['Legacy Excel','legacyexcel','200','password123','0']]);
        $path = tempnam(sys_get_temp_dir(), 'xls');
        try {
            (new \PhpOffice\PhpSpreadsheet\Writer\Xls($sheet))->save($path);
            $this->postJson('/api/import/students', ['file' => new UploadedFile($path, 'students.xls', null, null, true)])
                ->assertOk()->assertJson(['created' => 1, 'updated' => 0]);
            $this->assertFalse(User::where('nis', '200')->firstOrFail()->is_bimbel);
        } finally { @unlink($path); $sheet->disconnectWorksheets(); }
    }

    public function test_validation_is_atomic_has_line_numbers_and_never_echoes_passwords(): void
    {
        Sanctum::actingAs($this->user());
        $old = $this->user('siswa', ['nis' => 'old']);
        $name = $old->name;
        $response = $this->upload("name,username,nis,password,is_bimbel\nChanged,changed,old,,true\nGood,good,good,password123,true\nBad,bad,bad,SECRET,maybe\n");
        $response->assertUnprocessable()->assertJsonValidationErrors(['rows.4.password', 'rows.4.is_bimbel']);
        $this->assertStringNotContainsString('SECRET', $response->getContent());
        $this->assertStringContainsString('Baris 4', $response->getContent());
        $this->assertSame($name, $old->fresh()->name);
        $this->assertDatabaseMissing('users', ['nis' => 'good']);
    }
    public function test_duplicates_and_privileged_nis_are_rejected(): void
    {
        Sanctum::actingAs($this->user());
        $teacher = $this->user('guru', ['nis' => 'teacher', 'email' => 'taken@example.test']);
        $this->upload("name,username,nis,password,email\nOne,same,one,password123,x@example.test\nTwo,same,two,password123,x@example.test\nThree,third,teacher,password123,taken@example.test\nFour,{$teacher->username},four,password123,taken@example.test\n")
            ->assertUnprocessable()->assertJsonValidationErrors(['rows.3.username','rows.3.email','rows.4.nis','rows.5.username','rows.5.email']);
        $this->assertDatabaseMissing('users', ['nis' => 'one']);
        $this->assertSame('guru', $teacher->fresh()->role);
        $this->upload("name,username,nis,password\nOne,one,dup,password123\nTwo,two,dup,password123")
            ->assertUnprocessable()->assertJsonValidationErrors('rows.3.nis');
    }
    public function test_headers_empty_files_and_limits(): void
    {
        Sanctum::actingAs($this->user());
        $this->upload("name,username\nA,a")->assertUnprocessable()->assertJsonValidationErrors('file');
        $this->upload("name,username,nis\n,,")->assertUnprocessable()->assertJsonValidationErrors('file');
        $this->upload("name,username,nis,password\n".str_repeat("A,a,a,password123\n", 5001))->assertUnprocessable()->assertJsonValidationErrors('file');
        $this->postJson('/api/import/students', ['file' => UploadedFile::fake()->create('large.csv', 5121, 'text/csv')])->assertUnprocessable()->assertJsonValidationErrors('file');
        $this->upload("name,username,nis\nA,a,001")->assertUnprocessable()->assertJsonValidationErrors('rows.2.password');
    }
    public function test_directory_pagination_filters_and_public_fields_only(): void
    {
        Sanctum::actingAs($this->user('guru'));
        for ($i = 0; $i < 23; $i++) $this->user('siswa', ['name' => 'Student '.$i, 'nis' => 'N'.$i, 'class_room' => 'X', 'is_bimbel' => $i !== 0]);
        $result = $this->getJson('/api/directory')->assertOk()->assertJsonPath('total', 23)->assertJsonPath('per_page', 20)->assertJsonCount(20, 'data');
        $keys = array_keys($result->json('data.0')); sort($keys);
        $expected = ['id','name','username','email','phone','nis','class_room','role','is_bimbel']; sort($expected);
        $this->assertSame($expected, $keys);
        $this->getJson('/api/directory?page=2')->assertJsonCount(3, 'data');
        $this->getJson('/api/directory?enrollment=participants')->assertJsonPath('total', 22);
        $this->getJson('/api/directory?enrollment=nonparticipants&search=N0')->assertJsonPath('total', 1)->assertJsonPath('data.0.is_bimbel', false);
        $this->getJson('/api/directory?role=guru')->assertJsonPath('total', 1);
        $this->getJson('/api/directory?role=admin&enrollment=invalid&page=0')->assertUnprocessable();
        $this->assertTrue($this->user('siswa')->refresh()->is_bimbel);
    }

    public function test_only_admin_can_create_or_update_directory_members(): void
    {
        $admin = $this->user('admin');
        $teacher = $this->user('guru');
        $student = $this->user('siswa', ['nis' => 'N-1']);
        $oldPassword = $student->password;

        Sanctum::actingAs($teacher);
        $this->postJson('/api/directory', [
            'role' => 'siswa', 'name' => 'New Student', 'username' => 'newstudent',
            'nis' => 'N-2', 'password' => 'password123',
        ])->assertForbidden();
        $this->putJson('/api/directory/'.$student->id, [
            'name' => 'Updated Student', 'username' => $student->username, 'nis' => 'N-1',
        ])->assertForbidden();

        Sanctum::actingAs($admin);
        $this->putJson('/api/directory/'.$student->id, [
            'name' => 'Updated Student', 'username' => $student->username, 'nis' => 'N-1',
        ])->assertOk()->assertJsonPath('name', 'Updated Student');
        $this->assertSame($oldPassword, $student->fresh()->password);

        $created = $this->postJson('/api/directory', [
            'role' => 'guru', 'name' => 'New Teacher', 'email' => 'teacher@example.test',
            'username' => 'newteacher', 'password' => 'password123', 'phone' => '08123456789',
        ])->assertCreated()->assertJsonMissingPath('password')
            ->assertJsonMissingPath('nis')->assertJsonMissingPath('class_room')
            ->assertJsonMissingPath('is_bimbel');
        $this->assertSame(
            ['id', 'name', 'email', 'username', 'phone', 'role'],
            array_keys($created->json()),
        );
        $newTeacher = User::where('username', 'newteacher')->firstOrFail();
        $teacherPassword = $newTeacher->password;
        $this->assertTrue(Hash::check('password123', $teacherPassword));
        $this->putJson('/api/directory/'.$newTeacher->id, [
            'name' => 'Updated Teacher', 'email' => 'teacher@example.test',
            'username' => 'newteacher', 'phone' => '08987654321',
        ])->assertOk()->assertJsonPath('name', 'Updated Teacher')->assertJsonPath('phone', '08987654321');
        $this->assertSame($teacherPassword, $newTeacher->fresh()->password);
    }

    public function test_teacher_directory_returns_only_teacher_directory_fields(): void
    {
        $this->user('guru', ['name' => 'Teacher', 'username' => 'teacher', 'email' => 'teacher@example.test', 'phone' => '08123']);
        Sanctum::actingAs($this->user());

        $result = $this->getJson('/api/directory?role=guru')->assertOk();
        $keys = array_keys($result->json('data.0'));
        sort($keys);
        $expected = ['id', 'name', 'email', 'username', 'phone', 'role'];
        sort($expected);
        $this->assertSame($expected, $keys);
    }
}
