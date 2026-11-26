const BASE = '/api';
export class ApiError extends Error {
    status;
    errors;
    constructor(message, status, errors) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.errors = errors;
    }
}
function validationErrors(value) {
    if (!value || typeof value !== 'object')
        return {};
    return Object.fromEntries(Object.entries(value).map(([field, messages]) => [
        field,
        (Array.isArray(messages) ? messages : [messages]).filter((message) => typeof message === 'string'),
    ]));
}
export async function api(path, options = {}) {
    const token = localStorage.getItem('token');
    const res = await fetch(BASE + path, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options.headers || {}),
        },
    });
    if (res.status === 401) {
        localStorage.removeItem('token');
        if (!location.pathname.startsWith('/login'))
            location.href = '/login';
    }
    if (!res.ok) {
        const data = await res.json().catch(() => null);
        const message = typeof data?.message === 'string' && data.message ? data.message : res.statusText;
        throw new ApiError(message, res.status, validationErrors(data?.errors));
    }
    return res.status === 204 ? null : res.json();
}
export const post = (p, body) => api(p, { method: 'POST', body: JSON.stringify(body ?? {}) });
export const put = (p, body) => api(p, { method: 'PUT', body: JSON.stringify(body ?? {}) });
