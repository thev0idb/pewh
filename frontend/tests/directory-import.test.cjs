const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { execFile } = require('node:child_process');
const run = require('node:util').promisify(execFile);

const frontend = path.join(__dirname, '..');
let server, origin, dist;
before(async () => {
    // Uji hasil build produksi (React perlu di-bundle oleh Vite).
    dist = fs.mkdtempSync(path.join(os.tmpdir(),'portal-dist-'));
    await run(process.execPath, [path.join(frontend,'node_modules','vite','bin','vite.js'),'build','--outDir',dist,'--emptyOutDir'], {cwd:frontend});
    server = http.createServer((req, res) => {
        const url = new URL(req.url, 'http://localhost');
        if (url.pathname.startsWith('/assets/')) {
            const filename = path.resolve(dist, '.' + url.pathname);
            if (!filename.startsWith(path.join(dist, 'assets') + path.sep) || !fs.existsSync(filename)) {
                res.writeHead(404).end();
                return;
            }
            res.setHeader('Content-Type', filename.endsWith('.css') ? 'text/css' : 'text/javascript');
            res.end(fs.readFileSync(filename));
            return;
        }
        const role = url.searchParams.get('role');
        const fixture = `<script>
            localStorage.setItem('token','test');
            const exam = {id:7,title:'Latihan IPA',room:'R1',start_at:'2099-01-01T10:00:00Z',end_at:'2099-01-01T11:00:00Z',
                sections:[{id:1,label:'Bagian PG',type:'pg',duration_minutes:1}],questions:[{id:9,section_id:1,type:'pg',body:'Pilih warna',points:1,options:{A:'Merah',B:'Putih'},answer_key:'A'}]};
            if (location.pathname === '/kelola/cbt') setTimeout(()=>{
                [...document.querySelectorAll('button')].find(button=>button.textContent===decodeURIComponent(location.hash.slice(1)))?.click();
            },500);
            window.fetch = async (url,opts) =>
                url.startsWith('/api/directory?') && location.hash==='#result'
                    ? Response.json({data:[{id:3,name:'Siswa Direktori',username:'sd',nis:'N-9',class_room:'X IPA 1',is_bimbel:true}],total:1,current_page:1,last_page:1}) :
                url === '/api/teachers' ? Response.json([{id:2,name:'Pak Budi',phone:'081234567890'}]) :
                url === '/api/manage/tests' ? Response.json([{id:4,title:'Test Campuran IPA',mode:'campuran',question_count:3,submitted_count:2,average_score:80,pending_count:1}]) :
                url === '/api/school-classes' ? Response.json([{id:1,name:'X IPA 1',start_year:2026,students_count:34}]) :
                url === '/api/manage/exams' ? Response.json([exam]) :
                url === '/api/manage/exams/7/report' ? Response.json([{id:1,name:'Siswa Uji',class_room:'X',status:'submitted',score:100}]) :
                url === '/api/exams/7/start' ? (() => {
                    const now = Math.floor(Date.now()/1000);
                    setTimeout(()=>document.querySelector('input[type="radio"]')?.click(),300);
                    return Response.json({attempt:{id:5,answers:{}},questions:exam.questions,server_time:now,
                        windows:[{id:1,label:'Bagian PG',start:now,end:now+60}]});
                })() :
                url === '/api/exam-attempts/5/draft' && JSON.parse(opts.body).answers[9]==='A' ? Response.json({saved_at:new Date()}) : url === '/api/me'
                ? Response.json({name:'Pengguna Uji',role:${JSON.stringify(role)}})
                : new Promise(() => {});
        </script>`;
        res.setHeader('Content-Type','text/html; charset=utf-8');
        res.end(fs.readFileSync(path.join(dist,'index.html'),'utf8').replace('<head>','<head>'+fixture));
    });
    await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
    origin = 'http://127.0.0.1:' + server.address().port;
});
after(() => { server.close(); fs.rmSync(dist,{recursive:true,force:true}); });

async function render(route,role,action='') {
    const browser = process.env.CHROME_BIN || [
        'C:/Program Files/Google/Chrome/Application/chrome.exe',
        'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
        '/usr/bin/chromium','/usr/bin/google-chrome',
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    ].find(file => fs.existsSync(file));
    assert.ok(browser,'Set CHROME_BIN to a Chromium browser to run browser tests.');
    const profile = fs.mkdtempSync(path.join(os.tmpdir(),'portal-browser-'));
    try {
        const { stdout } = await run(browser, ['--headless','--disable-gpu','--disable-background-networking',
            '--no-first-run','--user-data-dir='+profile,'--dump-dom','--virtual-time-budget=2000',
            origin+route+'?role='+role+'#'+encodeURIComponent(action)], {timeout:30000});
        return stdout.split('<div id="root">')[1].split('<template')[0];
    } finally {
        fs.rmSync(profile,{recursive:true,force:true,maxRetries:5,retryDelay:100});
    }
}

test('operator and guru see directory loading state and member list', async () => {
    for (const role of ['operator','guru']) {
        const html = await render('/direktori',role);
        assert.match(html,/href="\/direktori"/);
        assert.match(html,/Memuat direktori/);
        const loaded = await render('/direktori',role,'result');
        assert.match(loaded,/<h1>Direktori Sekolah<\/h1>/);
        assert.match(loaded,/Siswa Direktori/);
        assert.match(loaded,/1 siswa ditemukan/);
        assert.equal(/Ubah data Siswa Direktori/.test(loaded), role === 'operator');
    }
});
test('students cannot open directory or see its navigation', async () => {
    const html = await render('/direktori','siswa');
    assert.match(html,/Akses ditolak/);
    assert.doesNotMatch(html,/href="\/direktori"|directory-search/);
});
test('guru cannot access import form', async () => {
    const html = await render('/import','guru');
    assert.match(html,/Akses ditolak/);
    assert.doesNotMatch(html,/type="file"/);
});
test('operator sees import guidance and template action', async () => {
    const html = await render('/import','operator');
    for (const column of ['name','username','nis','password','class_room','email','phone','is_bimbel'])
        assert.ok(html.includes('<code>'+column+'</code>'));
    for (const text of ['accept=".csv,.xlsx,.xls"','Unduh template CSV','5120 KiB','8–255',
        'tidak pernah mengubah password','5000','worksheet pertama','atomik','nol di awal',
        'true/false','mempertahankan nilai siswa lama']) assert.ok(html.includes(text), text);
});

test('teacher can preview, open edit form and view class report',async()=>{
    const create = await render('/kelola/cbt','guru','Buat ujian');
    for(const text of ['Kelas peserta','X IPA 1','34 siswa']) assert.ok(create.includes(text),text);
    const preview = await render('/kelola/cbt','guru','Pratinjau siswa');
    assert.match(preview,/Pratinjau Latihan IPA/);
    assert.match(preview,/Pilih warna/);
    const edit = await render('/kelola/cbt','guru','Edit ujian');
    assert.match(edit,/Edit Ujian CBT/);
    assert.match(edit,/Simpan perubahan/);
    const report = await render('/kelola/cbt','guru','Rekap hasil');
    for(const text of ['Siswa Uji','Sudah mengumpulkan','Unduh CSV','100']) assert.ok(report.includes(text),text);
});
test('student answer receives server autosave confirmation',async()=>{
    const html = await render('/cbt/7','siswa');
    for(const text of ['Bagian PG','Sisa waktu bagian','Tersimpan pukul']) assert.ok(html.includes(text),text);
});

test('login and register forms render', async () => {
    const login = await render('/login','siswa');
    assert.match(login,/<h1>Masuk<\/h1>/);
    assert.match(login,/id="auth-password"/);
    const register = await render('/register','siswa');
    assert.match(register,/Daftar Bimbel/);
    assert.match(register,/id="auth-password_confirmation"/);
});
test('every portal page renders without crashing', async () => {
    const pages = { siswa:['/','/bimbel','/hasil','/cbt','/profil','/kontak'], guru:['/kelola/test','/kelola/koreksi','/kelola/cbt'] };
    for (const [role, routes] of Object.entries(pages)) for (const route of routes) {
        const html = await render(route, role);
        assert.match(html, /class="layout"/, role + ' ' + route);
        assert.match(html, /class="content"/, role + ' ' + route);
    }
});

test('operator manages school data, students are blocked', async () => {
    const html = await render('/akun-guru','operator');
    assert.match(html,/Kelola Akun Guru/);
    assert.match(html,/Tambah Guru/);
    assert.match(html,/href="\/direktori"/);
    assert.match(html,/href="\/import"/);
    assert.match(await render('/akun-guru','siswa'),/Akses ditolak/);
    assert.match(await render('/import','operator'),/Unduh template CSV/);
});

test('student sees teachers with WhatsApp links and no chat menu for staff', async () => {
    const html = await render('/kontak','siswa');
    assert.match(html,/Pak Budi/);
    assert.match(html,/href="https:\/\/wa\.me\/6281234567890"/);
    assert.doesNotMatch(await render('/','guru'),/href="\/kontak"/);
});

test('teacher sees student results menu and test summary', async () => {
    const html = await render('/kelola/hasil','guru');
    assert.match(html,/href="\/kelola\/hasil"/);
    for (const text of ['Hasil Siswa','Test Campuran IPA','Campuran','Esai belum dikoreksi']) assert.ok(html.includes(text), text);
    assert.match(await render('/kelola/hasil','siswa'),/Akses ditolak/);
});
