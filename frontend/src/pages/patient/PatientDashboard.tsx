import { useCallback, useEffect, useState } from 'react';
import { getUser, authFetch } from '../../auth';
import { useRefetchOnFocus } from '../../hooks/useRefetchOnFocus';
import { useVitals } from '../../hooks/useVitals';
import { computeRisk, RiskLevel } from '../../utils/vitalsUtils';

interface Appointment {
    id: number; patient_name: string; doctor_name: string; date: string; status: string;
}
interface ConsultationNote {
    id: number; patient_name: string; raw_note: string;
    follow_up_days: number | null; created_at: string;
}

const riskGradient: Record<RiskLevel, string> = {
    normal: 'from-green-400 to-green-600',
    warning: 'from-amber-400 to-amber-600',
    critical: 'from-red-500 to-red-700',
};
const riskLabel: Record<RiskLevel, string> = {
    normal: '✅ Normal',
    warning: '⚠️ Warning',
    critical: '🚨 Critical',
};

function GaugeCard({ label, value, unit, risk, icon }: { label: string; value: number; unit: string; risk: RiskLevel; icon: string }) {
    return (
        <div className={`rounded-xl p-4 text-white bg-gradient-to-br ${riskGradient[risk]} ${risk === 'critical' ? 'animate-pulse' : ''}`}>
            <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium opacity-80">{label}</p>
                <span className="text-2xl">{icon}</span>
            </div>
            <p className="text-4xl font-bold tabular-nums">{value}<span className="text-lg font-normal opacity-75 ml-1">{unit}</span></p>
            <p className="text-xs mt-1 opacity-80">{riskLabel[risk]}</p>
        </div>
    );
}

export default function PatientDashboard() {
    const user = getUser()!;
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [notes, setNotes] = useState<ConsultationNote[]>([]);
    const [tab, setTab] = useState<'vitals' | 'profile' | 'appointments' | 'records'>('vitals');

    // ── Live vitals (own only) ────────────────────────────────────────────────
    const { vitals, error: vitalsError, loading: vitalsLoading } = useVitals('mine');
    const v = vitals[0]; // single patient's vitals
    const risk = v ? computeRisk(v.heart_rate, v.spo2, v.glucose) : 'normal';

    const fetchData = useCallback(() => {
        Promise.all([
            authFetch('/api/appointments').then(r => r.json()),
            authFetch('/api/consultations').then(r => r.json()),
        ]).then(([a, n]) => { setAppointments(a); setNotes(n); });
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);
    useRefetchOnFocus(fetchData);

    const upcoming = appointments.filter(a => a.status === 'scheduled');
    const completed = appointments.filter(a => a.status === 'completed');

    const tabs = [
        { key: 'vitals', label: `❤️ My Vitals${risk === 'critical' ? ' 🚨' : ''}` },
        { key: 'profile', label: '👤 My Profile' },
        { key: 'appointments', label: `📅 Appointments (${appointments.length})` },
        { key: 'records', label: '📋 Records' },
    ] as const;

    const statusStyle: Record<string, string> = {
        scheduled: 'bg-blue-100 text-blue-700',
        completed: 'bg-green-100 text-green-700',
    };

    return (
        <div className="p-8">
            {/* Critical alert */}
            {risk === 'critical' && (
                <div className="mb-6 bg-red-600 text-white rounded-xl px-5 py-4 animate-pulse flex items-center gap-3">
                    <span className="text-3xl">🚨</span>
                    <div>
                        <p className="font-bold">Critical Vitals Detected</p>
                        <p className="text-sm opacity-90">Please contact nursing staff immediately or call emergency services.</p>
                    </div>
                </div>
            )}

            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-800">Patient Portal</h1>
                <p className="text-slate-500 mt-1">Welcome back, {user.name}</p>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                {[
                    { label: 'Upcoming Appointments', value: upcoming.length, icon: '📅', color: 'bg-blue-500' },
                    { label: 'Completed Visits', value: completed.length, icon: '✅', color: 'bg-green-500' },
                    { label: 'Clinic Records', value: notes.length, icon: '📋', color: 'bg-purple-500' },
                ].map(c => (
                    <div key={c.label} className="card flex items-center gap-4">
                        <div className={`${c.color} w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0`}>{c.icon}</div>
                        <div>
                            <p className="text-2xl font-bold text-slate-800">{c.value}</p>
                            <p className="text-xs text-slate-500">{c.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Tab Nav */}
            <div className="flex gap-2 mb-6 bg-white border border-slate-200 rounded-xl p-1 w-fit">
                {tabs.map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.key ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ── MY VITALS ────────────────────────────────────────────────── */}
            {tab === 'vitals' && (
                <div className="space-y-4 max-w-2xl">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-slate-500 uppercase">Live Vitals</h2>
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" /> Updating every 3s
                        </span>
                    </div>

                    {vitalsLoading && <div className="card text-center py-10 text-slate-400">Loading vitals…</div>}

                    {vitalsError && (
                        <div className="card border-amber-200 bg-amber-50 text-amber-700 py-8 text-center">
                            <p className="text-2xl mb-2">🏥</p>
                            <p className="font-medium">No vitals on file yet</p>
                            <p className="text-sm mt-1">Visit the clinic for your vitals to be recorded by a staff member.</p>
                        </div>
                    )}

                    {v && (
                        <>
                            <div className="grid grid-cols-3 gap-4">
                                <GaugeCard label="Heart Rate" value={v.heart_rate} unit="bpm"
                                    risk={risk === 'critical' ? computeRisk(v.heart_rate, 98, 100) : (v.heart_rate > 100 || v.heart_rate < 60 ? 'warning' : 'normal')}
                                    icon="❤️" />
                                <GaugeCard label="SpO₂" value={v.spo2} unit="%"
                                    risk={v.spo2 <= 90 ? 'critical' : v.spo2 <= 95 ? 'warning' : 'normal'}
                                    icon="🫁" />
                                <GaugeCard label="Glucose" value={v.glucose} unit="mg/dL"
                                    risk={v.glucose > 200 || v.glucose < 55 ? 'critical' : (v.glucose > 140 || v.glucose < 70 ? 'warning' : 'normal')}
                                    icon="🩸" />
                            </div>

                            <div className={`rounded-xl p-4 border-2 text-center ${risk === 'critical' ? 'border-red-400 bg-red-50' : risk === 'warning' ? 'border-amber-300 bg-amber-50' : 'border-green-300 bg-green-50'}`}>
                                <p className="text-lg font-bold">Overall Status: {riskLabel[risk]}</p>
                                <p className="text-xs text-slate-500 mt-1">Last updated: {new Date(v.timestamp).toLocaleTimeString()}</p>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* ── PROFILE ──────────────────────────────────────────────────── */}
            {tab === 'profile' && (
                <div className="card max-w-md">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-2xl font-bold">
                            {user.name[0].toUpperCase()}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">{user.name}</h2>
                            <span className="text-xs font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full capitalize">{user.role}</span>
                        </div>
                    </div>
                    <div className="space-y-3">
                        {[{ label: 'Email', value: user.email }, { label: 'Role', value: 'Patient' }, { label: 'Account ID', value: `#${user.id}` }].map(f => (
                            <div key={f.label} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                                <span className="text-sm font-medium text-slate-500">{f.label}</span>
                                <span className="text-sm text-slate-800">{f.value}</span>
                            </div>
                        ))}
                    </div>
                    <div className="mt-6 bg-blue-50 rounded-lg p-4">
                        <p className="text-sm text-blue-700 font-medium">📍 Visit the clinic to register your health records</p>
                        <p className="text-xs text-blue-600 mt-1">A staff member will add your medical details after your first in-person visit.</p>
                    </div>
                </div>
            )}

            {/* ── APPOINTMENTS ─────────────────────────────────────────────── */}
            {tab === 'appointments' && (
                <div className="space-y-4">
                    {upcoming.length > 0 && (<>
                        <h2 className="text-sm font-semibold text-slate-500 uppercase">Upcoming</h2>
                        {upcoming.map(a => (
                            <div key={a.id} className="card flex items-center justify-between border-l-4 border-blue-400">
                                <div>
                                    <p className="font-medium text-slate-800">{a.patient_name}</p>
                                    <p className="text-sm text-slate-500">with {a.doctor_name}</p>
                                    <p className="text-xs text-slate-400 mt-0.5">{new Date(a.date).toLocaleString()}</p>
                                </div>
                                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${statusStyle[a.status]}`}>{a.status}</span>
                            </div>
                        ))}
                    </>)}
                    {completed.length > 0 && (<>
                        <h2 className="text-sm font-semibold text-slate-500 uppercase mt-4">Completed Visits</h2>
                        {completed.map(a => (
                            <div key={a.id} className="card flex items-center justify-between opacity-75">
                                <div>
                                    <p className="font-medium text-slate-800">{a.patient_name}</p>
                                    <p className="text-sm text-slate-500">with {a.doctor_name}</p>
                                    <p className="text-xs text-slate-400 mt-0.5">{new Date(a.date).toLocaleString()}</p>
                                </div>
                                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${statusStyle[a.status]}`}>{a.status}</span>
                            </div>
                        ))}
                    </>)}
                    {appointments.length === 0 && <div className="card text-center py-10 text-slate-400">No appointments scheduled yet.</div>}
                </div>
            )}

            {/* ── RECORDS ──────────────────────────────────────────────────── */}
            {tab === 'records' && (
                <div className="space-y-4">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                        <p className="text-sm text-amber-700">📋 These are general clinic records. Your doctor manages the details.</p>
                    </div>
                    {notes.length === 0 && <div className="card text-center py-10 text-slate-400">No consultation records available yet.</div>}
                    {notes.map(n => (
                        <div key={n.id} className="card">
                            <div className="flex items-start justify-between mb-2">
                                <p className="font-medium text-slate-800">{n.patient_name}</p>
                                {n.follow_up_days && <span className="text-xs text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">📆 Follow-up: {n.follow_up_days} days</span>}
                            </div>
                            <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">{n.raw_note}</p>
                            <p className="text-xs text-slate-400 mt-2">{new Date(n.created_at).toLocaleString()}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
