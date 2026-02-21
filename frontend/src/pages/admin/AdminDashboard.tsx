import { useCallback, useEffect, useState } from 'react';
import { authFetch } from '../../auth';
import { useVitals } from '../../hooks/useVitals';
import { computeRisk } from '../../utils/vitalsUtils';
import VitalsCard from '../../components/VitalsCard';

interface User { id: number; name: string; email: string; role: string; created_at: string; }
interface Patient { id: number; risk_level: 'low' | 'medium' | 'high'; }
interface Doctor { id: number; name: string; specialization: string; }

const initialForm = { name: '', email: '', password: '', specialization: '' };

export default function AdminDashboard() {
    const [users, setUsers] = useState<User[]>([]);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [form, setForm] = useState(initialForm);
    const [msg, setMsg] = useState('');
    const [error, setError] = useState('');
    const [tab, setTab] = useState<'overview' | 'monitor' | 'doctors' | 'create'>('overview');

    // ── Live vitals ──────────────────────────────────────────────────────────
    const { vitals, alerts } = useVitals('all');
    const criticalCount = vitals.filter(v => computeRisk(v.heart_rate, v.spo2, v.glucose) === 'critical').length;

    const fetchAll = useCallback(async () => {
        const [u, p, d] = await Promise.all([
            authFetch('/api/admin/users').then(r => r.json()),
            authFetch('/api/patients').then(r => r.json()),
            authFetch('/api/doctors').then(r => r.json()),
        ]);
        setUsers(u); setPatients(p); setDoctors(d);
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault(); setMsg(''); setError('');
        const res = await authFetch('/api/admin/create-doctor', { method: 'POST', body: JSON.stringify(form) });
        const data = await res.json();
        if (!res.ok) { setError(data.error); return; }
        setMsg(`✅ Dr. ${form.name} created successfully!`);
        setForm(initialForm); fetchAll();
    };

    const adminCount = users.filter(u => u.role === 'admin').length;
    const doctorCount = users.filter(u => u.role === 'doctor').length;
    const patientCount = users.filter(u => u.role === 'patient').length;
    const highRisk = patients.filter(p => p.risk_level === 'high').length;

    const tabs = [
        { key: 'overview', label: '📊 Overview' },
        { key: 'monitor', label: `❤️ Live Monitor${criticalCount > 0 ? ` 🚨${criticalCount}` : ''}` },
        { key: 'doctors', label: '👨‍⚕️ Doctors' },
        { key: 'create', label: '➕ Add Doctor' },
    ] as const;

    return (
        <div className="p-8">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-800">Admin Dashboard</h1>
                <p className="text-slate-500 mt-1">Manage the entire clinic system</p>
            </div>

            {/* Critical banner — always visible */}
            {criticalCount > 0 && (
                <div className="mb-4 bg-red-600 text-white rounded-xl px-5 py-3 flex items-center gap-3 animate-pulse cursor-pointer"
                    onClick={() => setTab('monitor')}>
                    <span className="text-2xl">🚨</span>
                    <div>
                        <p className="font-bold text-sm">{criticalCount} Patient{criticalCount > 1 ? 's' : ''} in Critical Condition</p>
                        <p className="text-xs opacity-90">{alerts.filter(a => a.level === 'critical').map(a => a.patient_name).join(', ')} — Click to view monitor</p>
                    </div>
                </div>
            )}

            {/* Tab Nav */}
            <div className="flex gap-2 mb-6 bg-white border border-slate-200 rounded-xl p-1 w-fit flex-wrap">
                {tabs.map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.key ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ── OVERVIEW ─────────────────────────────────────────────────── */}
            {tab === 'overview' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                        {[
                            { label: 'Total Users', value: users.length, icon: '👤', color: 'bg-blue-500' },
                            { label: 'Doctors', value: doctorCount, icon: '👨‍⚕️', color: 'bg-teal-500' },
                            { label: 'Patients', value: patientCount, icon: '🧑', color: 'bg-purple-500' },
                            { label: 'High Risk Records', value: highRisk, icon: '🚨', color: 'bg-red-500' },
                            { label: '⚡ Critical Now', value: criticalCount, icon: '⚡', color: criticalCount > 0 ? 'bg-red-600' : 'bg-slate-400' },
                        ].map(c => (
                            <div key={c.label} className={`card flex items-center gap-4 ${c.label === '⚡ Critical Now' && criticalCount > 0 ? 'ring-2 ring-red-400' : ''}`}>
                                <div className={`${c.color} w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0`}>{c.icon}</div>
                                <div>
                                    <p className="text-3xl font-bold text-slate-800">{c.value}</p>
                                    <p className="text-xs text-slate-500">{c.label}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Compact live vitals snapshot */}
                    <div className="card">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-base font-semibold text-slate-700">Patient Vitals Snapshot</h2>
                            <span className="text-xs text-slate-400 flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" /> Live
                            </span>
                        </div>
                        <div className="space-y-2">
                            {vitals.length === 0 && <p className="text-slate-400 text-sm text-center py-6">No vitals data yet</p>}
                            {vitals.map(v => <VitalsCard key={v.patient_id} v={v} compact />)}
                        </div>
                    </div>

                    <div className="card">
                        <h2 className="text-base font-semibold text-slate-700 mb-4">All System Users</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>{['Name', 'Email', 'Role', 'Joined'].map(h => (
                                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>
                                    ))}</tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {users.map(u => (
                                        <tr key={u.id} className="hover:bg-slate-50">
                                            <td className="px-4 py-3 font-medium text-slate-800">{u.name}</td>
                                            <td className="px-4 py-3 text-slate-500">{u.email}</td>
                                            <td className="px-4 py-3">
                                                <span className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize ${u.role === 'admin' ? 'bg-red-100 text-red-700' : u.role === 'doctor' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>{u.role}</span>
                                            </td>
                                            <td className="px-4 py-3 text-slate-400 text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ── LIVE MONITOR ─────────────────────────────────────────────── */}
            {tab === 'monitor' && (
                <div className="space-y-4">
                    {alerts.filter(a => a.level === 'critical').length > 0 && (
                        <div className="bg-red-600 text-white rounded-xl px-5 py-3 flex items-start gap-3 animate-pulse">
                            <span className="text-2xl">🚨</span>
                            <div>
                                <p className="font-bold text-sm">Critical Alerts</p>
                                {alerts.filter(a => a.level === 'critical').map((a, i) => (
                                    <p key={i} className="text-xs opacity-90">{a.patient_name}: {a.message}</p>
                                ))}
                            </div>
                        </div>
                    )}
                    {alerts.filter(a => a.level === 'warning').length > 0 && (
                        <div className="bg-amber-50 border border-amber-300 text-amber-800 rounded-xl px-5 py-3">
                            <p className="font-semibold text-sm mb-1">⚠️ Warnings</p>
                            <div className="flex flex-wrap gap-2">
                                {alerts.filter(a => a.level === 'warning').map((a, i) => (
                                    <span key={i} className="text-xs bg-amber-100 px-2 py-0.5 rounded-full">{a.patient_name}: {a.message}</span>
                                ))}
                            </div>
                        </div>
                    )}
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-slate-500 uppercase">All Patient Vitals — {vitals.length} monitored</h2>
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" /> Updating every 3s
                        </span>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        {vitals.length === 0 && <div className="card text-center py-10 text-slate-400 col-span-2">No patient vitals on file</div>}
                        {vitals.map(v => <VitalsCard key={v.patient_id} v={v} />)}
                    </div>
                </div>
            )}

            {/* ── DOCTORS ──────────────────────────────────────────────────── */}
            {tab === 'doctors' && (
                <div className="card">
                    <h2 className="text-base font-semibold text-slate-700 mb-4">Registered Doctors ({doctors.length})</h2>
                    {doctors.length === 0 && <p className="text-slate-400 text-sm">No doctors yet.</p>}
                    <div className="divide-y divide-slate-100">
                        {doctors.map(d => (
                            <div key={d.id} className="py-3 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-lg">👨‍⚕️</div>
                                <div>
                                    <p className="font-medium text-slate-800">{d.name}</p>
                                    <p className="text-sm text-slate-500">{d.specialization}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── CREATE DOCTOR ─────────────────────────────────────────────── */}
            {tab === 'create' && (
                <div className="card max-w-md">
                    <h2 className="text-base font-semibold text-slate-700 mb-4">Create Doctor Account</h2>
                    <form onSubmit={handleCreate} className="space-y-4">
                        {[
                            { name: 'name', label: 'Full Name', placeholder: 'Dr. Priya Sharma' },
                            { name: 'email', label: 'Email', placeholder: 'doctor@clinic.com' },
                            { name: 'password', label: 'Password', placeholder: '••••••••' },
                            { name: 'specialization', label: 'Specialization', placeholder: 'General Medicine' },
                        ].map(f => (
                            <div key={f.name}>
                                <label className="form-label">{f.label}</label>
                                <input type={f.name === 'password' ? 'password' : 'text'} className="form-input"
                                    placeholder={f.placeholder} value={(form as Record<string, string>)[f.name]}
                                    onChange={e => setForm(p => ({ ...p, [f.name]: e.target.value }))} required />
                            </div>
                        ))}
                        {error && <div className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</div>}
                        {msg && <div className="text-green-700 text-sm bg-green-50 rounded-lg px-3 py-2">{msg}</div>}
                        <button type="submit" className="btn-primary w-full">Create Doctor</button>
                    </form>
                </div>
            )}
        </div>
    );
}
