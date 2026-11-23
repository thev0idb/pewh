import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Navigasi seluruh halaman ada di sidebar; profil ada di bagian bawah
export default function Sidebar() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const role = user?.role ?? 'siswa';
  const isManagePath = pathname.startsWith('/kelola');
  const [manageExpanded, setManageExpanded] = useState(isManagePath);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (isManagePath) setManageExpanded(true);
  }, [isManagePath]);

  const menus: Record<string, [string, string][]> = {
    siswa: [
      ['/', 'Dashboard'],
      ['/bimbel', 'Bimbel & Test'],
      ['/hasil', 'Hasil Bimbel'],
      ['/cbt', 'Pelaksanaan CBT'],
      ['/kontak', 'Hubungi Guru'],
    ],
    guru: [
      ['/', 'Dashboard'],
      ['/kelola', 'Kelola Soal & Ujian'],
      ['/direktori', 'Direktori Sekolah'],
      ['/kontak', 'Pesan Siswa'],
    ],
    admin: [
      ['/', 'Dashboard'],
      ['/kelola', 'Kelola Soal & Ujian'],
      ['/direktori', 'Direktori Sekolah'],
      ['/import', 'Import Data'],
      ['/kontak', 'Pesan'],
    ],
  };

  return (
    <aside className={`sidebar${mobileMenuOpen ? " mobile-open" : ""}`}>
      <div className="sidebar-heading">
        <h2>MAN 2 Kota Tangerang</h2>
        <button type="button" className="mobile-menu-toggle"
          aria-expanded={mobileMenuOpen} aria-controls="sidebar-navigation"
          onClick={() => setMobileMenuOpen(open => !open)}>
          {mobileMenuOpen ? 'Tutup ×' : '☰ Menu'}
        </button>
      </div>
      <nav id="sidebar-navigation" onClick={event => {
        if (event.target instanceof Element && event.target.closest('a')) {
          setMobileMenuOpen(false);
        }
      }}>
        {menus[role].map(([to, label]) => (
          to === '/kelola' ? (
            <div key={to}>
              <button
                type="button"
                className={`sidebar-group-toggle${isManagePath ? ' active' : ''}`}
                aria-expanded={manageExpanded}
                aria-controls="manage-subnav"
                onClick={() => setManageExpanded((expanded) => !expanded)}
              >
                <span>{label}</span>
                <span aria-hidden="true">{manageExpanded ? '−' : '+'}</span>
              </button>
              {manageExpanded && (
                <div className="sidebar-subnav" id="manage-subnav">
                  <NavLink to="/kelola/test">Buat Test Bimbel</NavLink>
                  <NavLink to="/kelola/cbt">Buat Ujian CBT</NavLink>
                </div>
              )}
            </div>
          ) : (
            <NavLink key={to} to={to} end={to === '/'}>{label}</NavLink>
          )
        ))}
        <NavLink to="/login" onClick={logout}>Keluar</NavLink>
      </nav>
      <NavLink to="/profil" className="profile-link">
        <div style={{ fontWeight: 600, fontSize: 14 }}>{user?.name}</div>
        <div className="muted">{role}</div>
      </NavLink>
    </aside>
  );
}
