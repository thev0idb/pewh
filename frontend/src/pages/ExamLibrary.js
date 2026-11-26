import { element as h, useState } from '../view.js';
import { usePageData } from '../usePageData.js';
import Manage from './Manage.js';

const status = { not_started:'Belum mulai', in_progress:'Sedang mengerjakan', submitted:'Sudah mengumpulkan', expired:'Waktu habis' };
const headers = ['Nama','Kelas','Status','Nilai otomatis','Koreksi esai'];
const reportClass = row => row.class_room && row.start_year ? row.class_room+' ('+row.start_year+'/'+(Number(row.start_year)+1)+')' : row.class_room ?? 'Tanpa kelas';
const cells = row => [row.name,reportClass(row),status[row.status],row.score ?? '—',row.pending_essay ? 'Menunggu koreksi' : '—'];

function download(rows,id) {
    const quote = value => {
        let text = String(value);
        if (/^[\s]*[=+@-]/.test(text)) text = "'" + text;
        return '"' + text.replaceAll('"','""') + '"';
    };
    const csv = [headers,...rows.map(cells)].map(row => row.map(quote).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF',csv],{type:'text/csv;charset=utf-8'}));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'rekap-cbt-' + id + '.csv';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url),1000);
}

function Report({exam}) {
    const report = usePageData('/manage/exams/' + exam.id + '/report');
    const [room,setRoom] = useState('*');
    const [page,setPage] = useState(1);
    if (report.failed) return h('button',{onClick:report.retry},'Gagal memuat rekap. Coba lagi');
    if (!report.data) return h('p',{role:'status'},'Memuat rekap...');
    const rows = report.data.filter(row => room === '*' || reportClass(row) === room);
    const pages = Math.max(1,Math.ceil(rows.length/50));
    const current = Math.min(page,pages);
    return h('section',{className:'card'},h('h2',null,'Rekap '+exam.title),
        h('label',null,'Kelas', h('select',{value:room,onChange:e=>{setRoom(e.target.value);setPage(1);}},
            h('option',{value:'*'},'Semua kelas'), [...new Set(report.data.map(reportClass))].map(name=>h('option',{key:name,value:name},name || 'Tanpa kelas')))),
        h('p',{role:'status'},rows.length+' peserta ? '+Object.entries(status).map(([key,label])=>rows.filter(r=>r.status===key).length+' '+label.toLowerCase()).join(' ? ')),
        h('button',{onClick:()=>download(rows,exam.id)},'Unduh CSV'),h('button',{onClick:report.retry},'Perbarui rekap'),
        h('div',{style:{overflowX:'auto'}},h('table',null,h('thead',null,h('tr',null,headers.map(title=>h('th',{scope:'col'},title)))),
            h('tbody',null,rows.slice((current-1)*50,current*50).map(row=>h('tr',{key:row.id},cells(row).map(text=>h('td',null,text))))))),
        pages>1 && h('nav',{'aria-label':'Halaman rekap'},
            h('button',{disabled:current===1,onClick:()=>setPage(current-1)},'Sebelumnya'),
            ' Halaman '+current+' dari '+pages+' ',
            h('button',{disabled:current===pages,onClick:()=>setPage(current+1)},'Berikutnya')),
        !rows.length && h('p',null,'Belum ada siswa.'));
}

function Preview({exam}) {
    return h('section',{className:'card'},h('h2',null,'Pratinjau '+exam.title),
        exam.sections.map(section=>h('section',{key:section.id},h('h3',null,section.label+' · '+section.duration_minutes+' menit'),
            exam.questions.filter(q=>(q.section_id ?? exam.sections[0]?.id)===section.id).map((q,i)=>h('fieldset',{key:q.id},
                h('legend',null,(i+1)+'. '+q.body), q.type==='essay' ? h('textarea',{'aria-label':'Jawaban esai'}) :
                Object.entries(q.options ?? {}).map(([key,value])=>h('label',null,h('input',{type:'radio',name:'preview-'+q.id}),key+'. '+value)))))));
}

export default function ExamLibrary() {
    const list = usePageData('/manage/exams');
    const [selection,select] = useState(null);
    const [notice,setNotice] = useState('');
    if (selection) {
        const {mode,exam} = selection;
        return h('div',null,h('button',{onClick:()=>select(null)},'Kembali ke daftar ujian'),
            mode==='report' ? h(Report,{exam}) : mode==='preview' ? h(Preview,{exam}) :
            h(Manage,{section:'cbt',exam,onSaved:()=>{setNotice('Ujian berhasil disimpan.');select(null);list.retry();}}));
    }
    return h('main',null,h('h1',null,'Kelola Ujian CBT'),notice && h('p',{role:'status'},notice),
        h('button',{onClick:()=>select({mode:'create'})},'Buat ujian'),
        list.failed ? h('button',{onClick:list.retry},'Gagal memuat ujian. Coba lagi') :
        !list.data ? h('p',{role:'status'},'Memuat ujian...') : !list.data.length ? h('p',null,'Belum ada ujian.') :
        list.data.map(exam=>h('section',{className:'card',key:exam.id},h('h2',null,exam.title),
            h('p',null,exam.room+' · '+new Date(exam.start_at).toLocaleString('id-ID')),
            h('button',{onClick:()=>select({mode:'preview',exam})},'Pratinjau siswa'),
            !exam.attempts_exists && Date.now()<Date.parse(exam.start_at) && h('button',{onClick:()=>select({mode:'edit',exam})},'Edit ujian'),
            h('button',{onClick:()=>select({mode:'report',exam})},'Rekap hasil'))));
}
