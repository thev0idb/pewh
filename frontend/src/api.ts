const BASE = '/api';

export class ApiError extends Error {
  status: number;
  errors: Record<string, string[]>;

  constructor(message: string, status: number, errors: Record<string, string[]>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

function validationErrors(value: unknown): Record<string, string[]> {
  if (!value || typeof value !== 'object') return {};
  return Object.fromEntries(
    Object.entries(value).map(([field, messages]) => [
      field,
      (Array.isArray(messages) ? messages : [messages]).filter((message): message is string => typeof message === 'string'),
    ]),
  );
}

export async function api(path: string, options: RequestInit = {}) {
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
    if (!location.pathname.startsWith('/login')) location.href = '/login';
  }
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const message = typeof data?.message === 'string' && data.message ? data.message : res.statusText;
    throw new ApiError(message, res.status, validationErrors(data?.errors));
  }
  return res.status === 204 ? null : res.json();
}

export const post = (p: string, body?: any) => api(p, { method: 'POST', body: JSON.stringify(body ?? {}) });
export const put = (p: string, body?: any) => api(p, { method: 'PUT', body: JSON.stringify(body ?? {}) });
