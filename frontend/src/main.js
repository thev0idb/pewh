import { element, mount, useEffect } from './view.js';
import { navigate, usePathname } from './navigation.js';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import Sidebar from './components/Sidebar.js';
import AuthForm from './pages/AuthForm.js';
import Dashboard from './pages/Dashboard.js';
import Tests from './pages/Tests.js';
import TestRunner from './pages/TestRunner.js';
import Results from './pages/Results.js';
import Exams from './pages/Exams.js';
import ExamRunner from './pages/ExamRunner.js';
import Profile from './pages/Profile.js';
import Contact from './pages/Contact.js';
import ImportStudents from './pages/ImportStudents.js';
import ExamLibrary from './pages/ExamLibrary.js';
import Manage from './pages/Manage.js';
import Directory from './pages/Directory.js';
import EssayReviews from './pages/EssayReviews.js';
import TeacherAccounts from './pages/TeacherAccounts.js';
import TestResults from './pages/TestResults.js';

const staff = ['guru','operator'];
const managers = ['operator'];
const routes = {
    '/': [Dashboard], '/bimbel': [Tests], '/hasil': [Results], '/cbt': [Exams],
    '/profil': [Profile], '/kontak': [Contact, ['siswa']], '/direktori': [Directory, staff],
    '/import': [ImportStudents, managers], '/kelola': [null, staff],
    '/kelola/test': [Manage, staff], '/kelola/cbt': [ExamLibrary, staff],
    '/kelola/koreksi': [EssayReviews, staff],
    '/kelola/hasil': [TestResults, staff],
    '/akun-guru': [TeacherAccounts, managers],
};

function Redirect({to}) {
    useEffect(() => navigate(to, true), [to]);
    return null;
}

function Portal() {
    const path = usePathname().replace(/\/+$/, '') || '/';
    const {user, loading} = useAuth();
    if (path === '/login' || path === '/register') return element(AuthForm,{key:path,registration:path === '/register'});
    if (loading) return element('p',{role:'status'},'Memeriksa sesi...');
    if (!user) return element(Redirect,{to:'/login'});
    const runner = /^\/(test|cbt)\/[^/]+$/.exec(path);
    const route = runner ? [runner[1] === 'cbt' ? ExamRunner : TestRunner,['siswa']] : routes[path];
    if (!route) return element(Redirect,{to:'/'});
    const [page,roles] = route;
    let content;
    if (roles && !roles.includes(user.role)) {
        content = element('div',null,element('h1',null,'Akses ditolak'),element('p',{className:'muted'},'Akun Anda tidak memiliki izin untuk membuka halaman ini.'));
    } else if (!page) return element(Redirect,{to:'/kelola/test'});
    else content = element(page,{key:path,section:path.split('/').at(-1)});
    if (runner?.[1] === 'cbt') return content;
    return element('div',{className:'layout'},element(Sidebar),element('main',{className:'content'},content));
}
mount(document.getElementById('root'),element(AuthProvider,null,element(Portal)));
