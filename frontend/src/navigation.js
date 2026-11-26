import { createElement as element, useSyncExternalStore } from 'react';

const listeners = new Set();
const notify = () => listeners.forEach(listener => listener());
window.addEventListener('popstate', notify);
const subscribe = listener => { listeners.add(listener); return () => listeners.delete(listener); };

/** Re-render komponen setiap URL berubah. */
export function usePathname() {
    return useSyncExternalStore(subscribe, () => location.pathname);
}
export const useLocation = () => ({ pathname: usePathname(), search: location.search, hash: location.hash });
export const useParams = () => ({ id: usePathname().split('/').filter(Boolean).at(-1) });

export function navigate(path, replace = false) {
    if (replace) history.replaceState(null, '', path);
    else history.pushState(null, '', path);
    notify();
}
export const useNavigate = () => navigate;

export function Link({to, children, onClick, ...attrs}) {
    return element('a', {...attrs, href:to, onClick(event) {
        onClick?.(event);
        if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        navigate(to);
    }}, children);
}
export function NavLink({to, end, children, className = '', ...attrs}) {
    const pathname = usePathname();
    const active = pathname === to || (!end && pathname.startsWith(to + '/'));
    return element(Link, {...attrs,to,className:className + (active ? ' active' : ''),'aria-current':active ? 'page' : undefined}, children);
}
