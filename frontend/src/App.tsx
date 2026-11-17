import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Tests from './pages/Tests';
import TestRunner from './pages/TestRunner';
import Results from './pages/Results';
import Exams from './pages/Exams';
import ExamRunner from './pages/ExamRunner';
import Profile from './pages/Profile';
import Contact from './pages/Contact';
import ImportStudents from './pages/ImportStudents';
import Manage from './pages/Manage';
import Directory from './pages/Directory';

function Protected({ children, roles }: { children: JSX.Element; roles?: string[] }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    return (
      <div>
        <h1>Akses ditolak</h1>
        <p className="muted">Akun Anda tidak memiliki izin untuk membuka halaman ini.</p>
      </div>
    );
  }
  return children;
}

function Layout({ children }: { children: JSX.Element }) {
  const { pathname } = useLocation();
  if (pathname === '/login' || pathname === '/register' || pathname.startsWith('/cbt/')) return children;
  return (
    <div className="layout">
      <Sidebar />
      <main className="content">{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<Protected><Dashboard /></Protected>} />
        <Route path="/bimbel" element={<Protected><Tests /></Protected>} />
        <Route path="/test/:id" element={<Protected roles={['siswa']}><TestRunner /></Protected>} />
        <Route path="/hasil" element={<Protected><Results /></Protected>} />
        <Route path="/cbt" element={<Protected><Exams /></Protected>} />
        <Route path="/cbt/:id" element={<Protected roles={['siswa']}><ExamRunner /></Protected>} />
        <Route path="/profil" element={<Protected><Profile /></Protected>} />
        <Route path="/kontak" element={<Protected><Contact /></Protected>} />
        <Route path="/direktori" element={<Protected roles={['admin', 'guru']}><Directory /></Protected>} />
        <Route path="/import" element={<Protected roles={['admin']}><ImportStudents /></Protected>} />
        <Route path="/kelola" element={<Protected roles={['guru', 'admin']}><Navigate to="/kelola/test" replace /></Protected>} />
        <Route path="/kelola/test" element={<Protected roles={['guru', 'admin']}><Manage section="test" /></Protected>} />
        <Route path="/kelola/cbt" element={<Protected roles={['guru', 'admin']}><Manage section="cbt" /></Protected>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Layout>
  );
}
