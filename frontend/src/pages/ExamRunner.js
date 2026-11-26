import { post, put } from '../api.js';
import { element as h, useState, useRef, useEffect } from '../view.js';
import { useNavigate, useParams } from '../navigation.js';
import { useExamLock } from '../components/ExamLock.js';

function openSession(data, notify) {
    const {attempt, questions, windows} = data;
    const offset = data.server_time * 1000 - Date.now();
    const now = () => (Date.now() + offset) / 1000;
    const active = () => windows.find(w => w.start <= now() && now() < w.end);
    const storage = 'bimbel:cbt:' + attempt.id;
    const endpoint = '/exam-attempts/' + attempt.id;
    let pending = {};
    try { pending = JSON.parse(sessionStorage.getItem(storage)) ?? {}; } catch {}
    const answers = {...attempt.answers,...pending};
    let timer, running, stopped = false, finishing = false;
    const persist = () => {
        try {
            if (Object.keys(pending).length) sessionStorage.setItem(storage,JSON.stringify(pending));
            else sessionStorage.removeItem(storage);
        } catch {}
    };
    function currentChanges() {
        const section = active();
        return Object.fromEntries(questions.filter(q=>section && (q.section_id ?? windows[0].id) === section.id && Object.hasOwn(pending,q.id))
            .map(q=>[q.id,pending[q.id]]));
    }
    function schedule(delay) {
        if (!stopped && !finishing && !timer && !running) timer = setTimeout(flush,delay);
    }
    async function flush() {
        timer = null;
        const changes = currentChanges();
        if (!Object.keys(changes).length || stopped || finishing) return;
        let retry = 0;
        running = put(endpoint+'/draft',{answers:changes});
        try {
            const result = await running;
            for (const [id,value] of Object.entries(changes)) if (pending[id] === value) delete pending[id];
            persist();
            if (!stopped) notify(Object.keys(pending).length ? 'Ada jawaban yang belum tersimpan.' :
                'Tersimpan pukul '+new Date(result.saved_at).toLocaleTimeString('id-ID'));
        } catch {
            retry = 2000;
            if (!stopped) notify('Jawaban belum tersimpan di server. Mencoba kembali...');
        } finally {
            running = null;
            if (Object.keys(currentChanges()).length) schedule(retry);
        }
    }
    schedule(0);
    return {questions,windows,answers,active,now,
        change(id,value) {
            answers[id] = pending[id] = value;
            persist();
            notify('Menyimpan jawaban...');
            schedule(150);
        },
        async finish() {
            finishing = true;
            clearTimeout(timer);
            timer = null;
            try {
                await running?.catch(()=>{});
                await post(endpoint+'/submit',{answers:currentChanges()});
                pending = {};
                persist();
            } catch (error) {
                finishing = false;
                schedule(0);
                throw error;
            }
        },
        close() { stopped = true; clearTimeout(timer); }
    };
}

export default function ExamRunner() {
    const {id} = useParams();
    const nav = useNavigate();
    const [session,setSession] = useState(null);
    const [message,setMessage] = useState('');
    const [error,setError] = useState('');
    const [selected,select] = useState(null);
    const [violations,setViolations] = useState(0);
    const [sending,setSending] = useState(false);
    const [,refresh] = useState(0);
    const submitted = useRef(false);
    useExamLock(()=>setViolations(v=>v+1));
    useEffect(()=>{
        let closed = false, opened;
        post('/exams/'+id+'/start').then(data=>{
            if (closed) return;
            opened = openSession(data,setMessage);
            setSession(opened);
        }).catch(e=>{if (!closed) setError(e.message);});
        const tick = () => refresh(v=>v+1);
        const timer = setInterval(tick,500);
        document.addEventListener('visibilitychange',tick);
        return ()=>{closed=true; opened?.close(); clearInterval(timer); document.removeEventListener('visibilitychange',tick);};
    },[id]);
    const section = session?.active();
    async function submit() {
        if (submitted.current) return;
        submitted.current = true;
        setSending(true);
        setError('');
        try { await session.finish(); nav('/cbt'); }
        catch (e) { submitted.current=false; setSending(false); setError('Gagal mengirim jawaban. '+e.message); }
    }
    useEffect(()=>{if (session && !section) void submit();},[session,section?.id]);
    if (!session) return h('main',{className:'content'},h('p',{role:'status'},error || 'Memuat ujian...'),error && h('button',{onClick:()=>nav('/cbt')},'Kembali'));
    const questions = session.questions.filter(q=>section && (q.section_id ?? session.windows[0].id)===section.id);
    const idx = Math.max(0,questions.findIndex(q=>q.id===selected));
    const question = questions[idx];
    const remaining = section ? Math.ceil(section.end-session.now()) : 0;
    const clock = Math.floor(remaining/60)+':'+String(remaining%60).padStart(2,'0');
    const last = section === session.windows.at(-1);
    return h('main',{className:'content',style:{maxWidth:860,margin:'0 auto'}},
        h('h1',null,section?.label ?? 'Waktu ujian selesai'),
        section && h('p',null,'Sisa waktu bagian ',h('strong',{className:'timer'},clock)),
        violations>0 && h('p',null,'Pelanggaran: '+violations),
        h('p',{role:'status'},sending ? 'Mengirim jawaban...' : message),
        error && h('p',{role:'alert'},error,' ',h('button',{onClick:submit},'Kirim ulang')),
        h('div',{className:'question-nav'},questions.map((q,i)=>h('button',{key:q.id,className:session.answers[q.id]?'answered':'','aria-current':idx===i?'step':null,onClick:()=>select(q.id)},i+1))),
        question && h('section',{className:'card'},h('h2',{id:'question'},(idx+1)+'. '+question.body),
            question.type==='essay' ? h('textarea',{'aria-labelledby':'question',rows:6,disabled:sending,value:session.answers[question.id] ?? '',
                onChange:e=>session.change(question.id,e.target.value)}) :
            Object.entries(question.options ?? {}).map(([key,label])=>h('label',{className:'answer-option',key},
                h('input',{type:'radio',name:'q'+question.id,checked:session.answers[question.id]===key,disabled:sending,onChange:()=>session.change(question.id,key)}),key+'. '+label))),
        idx>0 && h('button',{onClick:()=>select(questions[idx-1].id)},'Sebelumnya'),
        idx+1<questions.length && h('button',{onClick:()=>select(questions[idx+1].id)},'Berikutnya'),
        last && h('button',{disabled:sending,onClick:submit},'Akhiri ujian'),
        section && !last && h('p',{className:'muted'},'Bagian berikutnya terbuka otomatis saat waktu bagian ini berakhir.'));
}
