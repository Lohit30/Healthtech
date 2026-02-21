// Simple auth state stored in localStorage
export interface AuthUser {
    id: number;
    name: string;
    email: string;
    role: 'admin' | 'doctor' | 'patient';
}

export function getToken(): string | null {
    return localStorage.getItem('token');
}

export function getUser(): AuthUser | null {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    try { return JSON.parse(raw) as AuthUser; } catch { return null; }
}

export function saveAuth(token: string, user: AuthUser) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
}

export function clearAuth() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
}

// Fetch wrapper that adds Authorization header automatically
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const token = getToken();
    return fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options.headers || {}),
        },
    });
}
