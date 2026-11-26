import { element } from '../view.js';
import { useEffect, useState } from '../view.js';
import { NavLink, useLocation } from '../navigation.js';
import { useAuth } from '../context/AuthContext.js';
// Navigasi seluruh halaman ada di sidebar; profil ada di bagian bawah
export default function Sidebar() {
    const { user, logout } = useAuth();
    const { pathname } = useLocation();
    const role = user?.role ?? 'siswa';
    const isManagePath = pathname.startsWith('/kelola');
    const [manageExpanded, setManageExpanded] = useState(isManagePath);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    useEffect(() => {
        if (isManagePath)
            setManageExpanded(true);
    }, [isManagePath]);
    const menus = {
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
        ],
        operator: [
            ['/', 'Dashboard'],
            ['/kelola', 'Kelola Soal & Ujian'],
            ['/direktori', 'Direktori Sekolah'],
            ['/akun-guru', 'Kelola Akun Guru'],
            ['/import', 'Import Data'],
        ],
    };
    return (element("aside", { className: `sidebar${mobileMenuOpen ? " mobile-open" : ""}` },
        element("div", { className: "sidebar-heading" },
            element("h2", null, "MAN 2 Kota Tangerang"),
            element("button", { type: "button", className: "mobile-menu-toggle", "aria-expanded": mobileMenuOpen, "aria-controls": "sidebar-navigation", onClick: () => setMobileMenuOpen(open => !open) }, mobileMenuOpen ? 'Tutup ×' : '☰ Menu')),
        element("nav", { id: "sidebar-navigation", onClick: event => {
                if (event.target instanceof Element && event.target.closest('a')) {
                    setMobileMenuOpen(false);
                }
            } },
            (menus[role] ?? menus.siswa).map(([to, label]) => (to === '/kelola' ? (element("div", { key: to },
                element("button", { type: "button", className: `sidebar-group-toggle${isManagePath ? ' active' : ''}`, "aria-expanded": manageExpanded, "aria-controls": "manage-subnav", onClick: () => setManageExpanded((expanded) => !expanded) },
                    element("span", null, label),
                    element("span", { "aria-hidden": "true" }, manageExpanded ? '−' : '+')),
                manageExpanded && (element("div", { className: "sidebar-subnav", id: "manage-subnav" },
                    element(NavLink, { to: "/kelola/test" }, "Buat Test Bimbel"),
                    element(NavLink, { to: "/kelola/hasil" }, "Hasil Siswa"),
                    element(NavLink, { to: "/kelola/koreksi" }, "Koreksi Esai"),
                    element(NavLink, { to: "/kelola/cbt" }, "Kelola Ujian CBT"))))) : (element(NavLink, { key: to, to: to, end: to === '/' }, label)))),
            element(NavLink, { to: "/login", onClick: logout }, "Keluar")),
        element(NavLink, { to: "/profil", className: "profile-link", onClick: () => setMobileMenuOpen(false) },
            element("div", { style: { fontWeight: 600, fontSize: 14 } }, user?.name),
            element("div", { className: "muted" }, role))));
}
