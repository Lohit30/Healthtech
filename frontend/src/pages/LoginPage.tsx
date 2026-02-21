import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { saveAuth, AuthUser } from '../auth';

export default function LoginPage() {
    const [form, setForm] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Login failed');
            saveAuth(data.token, data.user as AuthUser);
            navigate('/');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Login error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-800 to-blue-900 flex items-center justify-center p-4">
            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    <span className="text-5xl">🏥</span>
                    <h1 className="text-2xl font-bold text-white mt-3">RuralCare</h1>
                    <p className="text-slate-400 text-sm mt-1">Healthcare Management System</p>
                </div>

                <div className="bg-white rounded-2xl shadow-2xl p-8">
                    <h2 className="text-lg font-bold text-slate-800 mb-6">Sign In</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="form-label">Email</label>
                            <input
                                type="email"
                                className="form-input"
                                placeholder="you@example.com"
                                value={form.email}
                                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                                required
                            />
                        </div>
                        <div>
                            <label className="form-label">Password</label>
                            <input
                                type="password"
                                className="form-input"
                                placeholder="••••••••"
                                value={form.password}
                                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                                required
                            />
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                                {error}
                            </div>
                        )}

                        <button type="submit" disabled={loading} className="btn-primary w-full">
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>

                    <p className="text-center text-sm text-slate-500 mt-4">
                        New patient?{' '}
                        <Link to="/register" className="text-blue-600 hover:underline font-medium">
                            Register here
                        </Link>
                    </p>

                    <div className="mt-5 pt-4 border-t border-slate-100">
                        <p className="text-xs text-slate-400 font-medium mb-2">Demo credentials:</p>
                        <p className="text-xs text-slate-500">🔑 Admin: <span className="font-mono">admin@ruralcare.com / Admin@1234</span></p>
                    </div>
                </div>
            </div>
        </div>
    );
}
