import { useCallback, useEffect, useState } from 'react';
import { authFetch } from '../../auth';
import { useRefetchOnFocus } from '../../hooks/useRefetchOnFocus';
import { useVitals } from '../../hooks/useVitals';
import { computeRisk } from '../../utils/vitalsUtils';
import VitalsCard from '../../components/VitalsCard';

interface Patient {
    id: number; name: string; age: number | null; gender: string | null; village: string | null;
    symptoms: string | null; vitals: string | null; risk_level: 'low' | 'medium' | 'high'; created_at: string;
}
interface ConsultationNote {
    id: number; patient_id: number; patient_name: string;
    raw_note: string; structured_summary: string | null; follow_up_days: number | null; created_at: string;
}
interface Slot {
    id: number; doctor_id: number; date: string; start_time: string; end_time: string; is_booked: number;
}
interface Medicine {
    id: string; name: string; category: string; strength: string; stock_quantity: number;
}

const riskBadge = {
    high: 'bg-red-100 text-red-700 border border-red-200',
    medium: 'bg-amber-100 text-amber-700 border border-amber-200',
    low: 'bg-green-100 text-green-700 border border-green-200',
};

export default function DoctorDashboard() {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [notes, setNotes] = useState<ConsultationNote[]>([]);
    const [slots, setSlots] = useState<Slot[]>([]);
    const [medicines, setMedicines] = useState<Medicine[]>([]);
    const [tab, setTab] = useState<'monitor' | 'patients' | 'highrisk' | 'notes' | 'slots'>('monitor');

    // Modals & Forms state
    const [rxModalPatient, setRxModalPatient] = useState<Patient | null>(null);
    const [rxForm, setRxForm] = useState({ medicine_id: '' });
    const [rxMsg, setRxMsg] = useState('');
    const [rxError, setRxError] = useState('');

    const [noteForm, setNoteForm] = useState({ patient_id: '', raw_note: '', structured_summary: '', follow_up_days: '' });
    const [noteMsg, setNoteMsg] = useState('');
    const [noteError, setNoteError] = useState('');

    const [slotForm, setSlotForm] = useState({ doctor_id: '', date: '', start_time: '', end_time: '' });
    const [slotMsg, setSlotMsg] = useState('');
    const [slotError, setSlotError] = useState('');

    const [doctors, setDoctors] = useState<{ id: number; name: string }[]>([]);

    // ── Live vitals (polls every 3 s) ─────────────────────────────────────────
    const { vitals, alerts } = useVitals('all');
    const criticalCount = vitals.filter(v => {
        return computeRisk(v.heart_rate, v.spo2, v.glucose) === 'critical';
    }).length;

    const fetchAll = async () => {
        try {
            const [p, n, s, m] = await Promise.all([
                authFetch('/api/patients').then(r => r.json()),
                authFetch('/api/consultations').then(r => r.json()),
                authFetch('/api/availability').then(r => r.json()),
                authFetch('/api/medicines').then(r => r.json())
            ]);
            setPatients(p);
            setNotes(n);
            setSlots(s);
            setMedicines(m);
        } catch (e) {
            console.error("Dashboard fetch error:", e);
        }
    };

    useEffect(() => {
        fetchAll();
        const interval = setInterval(fetchAll, 5000); // Poll every 5 seconds
        return () => clearInterval(interval);
    }, [fetchAll]);

    useRefetchOnFocus(fetchAll);

    const highRisk = patients.filter(p => p.risk_level === 'high');

    const handleNote = async (e: React.FormEvent) => {
        e.preventDefault(); setNoteMsg(''); setNoteError('');
        const res = await authFetch('/api/consultations', {
            method: 'POST',
            body: JSON.stringify({
                patient_id: Number(noteForm.patient_id), raw_note: noteForm.raw_note,
                structured_summary: noteForm.structured_summary || null,
                follow_up_days: noteForm.follow_up_days ? Number(noteForm.follow_up_days) : null,
            }),
        });
        const data = await res.json();
        if (!res.ok) { setNoteError(data.error); return; }
        setNoteMsg('✅ Note saved');
        setNoteForm({ patient_id: '', raw_note: '', structured_summary: '', follow_up_days: '' });
        fetchAll();
    };

    const handleSlot = async (e: React.FormEvent) => {
        e.preventDefault(); setSlotMsg(''); setSlotError('');
        const res = await authFetch('/api/availability', {
            method: 'POST',
            body: JSON.stringify({ doctor_id: Number(slotForm.doctor_id), date: slotForm.date, start_time: slotForm.start_time, end_time: slotForm.end_time }),
        });
        const data = await res.json();
        if (!res.ok) { setSlotError(data.error); return; }
        setSlotMsg('✅ Slot created');
        setSlotForm(f => ({ ...f, date: '', start_time: '', end_time: '' }));
        fetchAll();
    };

    const deleteSlot = async (id: number) => {
        if (!confirm('Delete this slot?')) return;
        const res = await authFetch(`/api/availability/${id}`, { method: 'DELETE' });
        if (!res.ok) { const d = await res.json(); alert(d.error); return; }
        fetchAll();
    };

    const handleDownloadReport = async (patientId: number, patientName: string) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/reports/${patientId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to generate report');

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${patientName.replace(/\\s+/g, '_')}_Clinical_Report.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Error downloading report:", err);
            alert("Failed to download the patient report.");
        }
    };

    const handlePrescription = async (e: React.FormEvent) => {
        e.preventDefault(); setRxMsg(''); setRxError('');
        if (!rxModalPatient) return;
        const res = await authFetch('/api/prescriptions', {
            method: 'POST',
            body: JSON.stringify({
                patient_id: rxModalPatient.id,
                medicine_id: rxForm.medicine_id
            }),
        });
        const data = await res.json();
        if (!res.ok) { setRxError(data.error); return; }
        setRxMsg('✅ Prescription assigned successfully');
        setRxForm({ medicine_id: '' });
        fetchAll();
        setTimeout(() => {
            setRxModalPatient(null);
            setRxMsg('');
        }, 1500);
    };

    const tabs = [
        { key: 'monitor', label: `❤️ Live Monitor${criticalCount > 0 ? ` 🚨${criticalCount}` : ''}` },
        { key: 'patients', label: '👥 All Patients' },
        { key: 'highrisk', label: `🚨 High Risk (${highRisk.length})` },
        { key: 'notes', label: '📝 Add Note' },
        { key: 'slots', label: `🗓 My Slots (${slots.length})` },
    ] as const;

    return (
        <div className="p-8">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-800">Doctor Dashboard</h1>
                <p className="text-slate-500 mt-1">{patients.length} total patients · {highRisk.length} high risk</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-5 gap-4 mb-6">
                {[
                    { label: 'Total Patients', value: patients.length, color: 'bg-blue-500', icon: '👥' },
                    { label: 'High Risk', value: highRisk.length, color: 'bg-red-500', icon: '🚨' },
                    { label: 'Consultations', value: notes.length, color: 'bg-teal-500', icon: '📝' },
                    { label: 'Open Slots', value: slots.filter(s => !s.is_booked).length, color: 'bg-purple-500', icon: '🗓' },
                    { label: '🚨 Critical Now', value: criticalCount, color: criticalCount > 0 ? 'bg-red-600' : 'bg-slate-400', icon: '⚡' },
                ].map(c => (
                    <div key={c.label} className={`card flex items-center gap-3 ${c.label === '🚨 Critical Now' && criticalCount > 0 ? 'ring-2 ring-red-400' : ''}`}>
                        <div className={`${c.color} w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0`}>{c.icon}</div>
                        <div>
                            <p className="text-xl font-bold text-slate-800">{c.value}</p>
                            <p className="text-xs text-slate-500">{c.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Tab Nav */}
            <div className="flex gap-2 mb-6 bg-white border border-slate-200 rounded-xl p-1 w-fit flex-wrap">
                {tabs.map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.key ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ── LIVE MONITOR ──────────────────────────────────────────────────── */}
            {tab === 'monitor' && (
                <div className="space-y-4">
                    {/* Alert banner */}
                    {alerts.filter(a => a.level === 'critical').length > 0 && (
                        <div className="bg-red-600 text-white rounded-xl px-5 py-3 flex items-start gap-3 animate-pulse">
                            <span className="text-2xl">🚨</span>
                            <div>
                                <p className="font-bold text-sm">Critical Alert{alerts.filter(a => a.level === 'critical').length > 1 ? 's' : ''}</p>
                                {alerts.filter(a => a.level === 'critical').slice(0, 3).map((a, i) => (
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
                        <h2 className="text-sm font-semibold text-slate-500 uppercase">Live Vitals — {vitals.length} patients</h2>
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" />
                            Updating every 3s
                        </span>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        {vitals.length === 0 && <div className="card text-center py-10 text-slate-400 col-span-2">No patient vitals on file yet</div>}
                        {vitals.map(v => <VitalsCard key={v.patient_id} v={v} />)}
                    </div>
                </div>
            )}

            {/* ── ALL PATIENTS ──────────────────────────────────────────────── */}
            {tab === 'patients' && (
                <div className="card p-0 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>{['Patient', 'Age/Sex', 'Village', 'Symptoms', 'Vitals', 'Risk', 'Actions'].map(h => (
                                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>
                                ))}</tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {patients.length === 0 && <tr><td colSpan={7} className="text-center py-10 text-slate-400">No patients yet</td></tr>}
                                {patients.map(p => (
                                    <tr key={p.id} className={`hover:bg-slate-50 ${p.risk_level === 'high' ? 'bg-red-50/40' : ''}`}>
                                        <td className="px-4 py-3 font-medium text-slate-800">{p.name}</td>
                                        <td className="px-4 py-3 text-slate-500">{p.age ?? '—'}/{p.gender?.[0] ?? '—'}</td>
                                        <td className="px-4 py-3 text-slate-500">{p.village ?? '—'}</td>
                                        <td className="px-4 py-3 text-slate-500 max-w-[160px] truncate" title={p.symptoms ?? ''}>{p.symptoms ?? '—'}</td>
                                        <td className="px-4 py-3 text-slate-500 max-w-[140px] truncate" title={p.vitals ?? ''}>{p.vitals ?? '—'}</td>
                                        <td className="px-4 py-3">
                                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${riskBadge[p.risk_level]}`}>
                                                {p.risk_level === 'high' ? '🚨 ' : p.risk_level === 'medium' ? '⚠️ ' : '✅ '}{p.risk_level}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-2">
                                                <button onClick={() => handleDownloadReport(p.id, p.name)} className="btn-secondary text-xs py-1 px-2 whitespace-nowrap" title="Download Medical Report">
                                                    📄 Report
                                                </button>
                                                <button onClick={() => setRxModalPatient(p)} className="btn-primary text-xs py-1 px-2 whitespace-nowrap bg-indigo-600 hover:bg-indigo-700">
                                                    💊 Prescribe
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── HIGH RISK ─────────────────────────────────────────────────── */}
            {tab === 'highrisk' && (
                <div className="space-y-3">
                    {highRisk.length === 0 && <div className="card text-center py-10 text-slate-400">No high-risk patients 🎉</div>}
                    {highRisk.map(p => (
                        <div key={p.id} className="card border-l-4 border-red-500">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="font-semibold text-slate-800 flex items-center gap-2">
                                        <span className="text-red-500">🚨</span>{p.name}
                                        <span className="text-xs text-slate-400 font-normal">Age {p.age} · {p.gender} · {p.village}</span>
                                    </p>
                                    <p className="text-sm text-slate-600 mt-1"><span className="font-medium">Symptoms:</span> {p.symptoms}</p>
                                    <p className="text-sm text-slate-600"><span className="font-medium">Vitals:</span> {p.vitals}</p>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <button onClick={() => handleDownloadReport(p.id, p.name)} className="btn-secondary text-xs ml-4 whitespace-nowrap">📄 Download Report</button>
                                    <button onClick={() => setRxModalPatient(p)} className="btn-primary text-xs ml-4 whitespace-nowrap bg-indigo-600 hover:bg-indigo-700">💊 Prescribe</button>
                                    <button onClick={() => { setTab('notes'); setNoteForm(f => ({ ...f, patient_id: String(p.id) })); }}
                                        className="btn-primary text-xs ml-4 whitespace-nowrap">Add Note</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── ADD NOTE ─────────────────────────────────────────────────── */}
            {tab === 'notes' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="card">
                        <h2 className="text-base font-semibold text-slate-700 mb-4">Add Consultation Note</h2>
                        <form onSubmit={handleNote} className="space-y-4">
                            <div>
                                <label className="form-label">Patient *</label>
                                <select className="form-input" value={noteForm.patient_id} onChange={e => setNoteForm(p => ({ ...p, patient_id: e.target.value }))} required>
                                    <option value="">Select patient...</option>
                                    {patients.map(p => <option key={p.id} value={p.id}>{p.name}{p.village ? ` — ${p.village}` : ''}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="form-label">Note *</label>
                                <textarea className="form-input resize-none" rows={4} value={noteForm.raw_note}
                                    onChange={e => setNoteForm(p => ({ ...p, raw_note: e.target.value }))} required />
                            </div>
                            <div>
                                <label className="form-label">Summary <span className="text-slate-400 font-normal">(optional)</span></label>
                                <input className="form-input" value={noteForm.structured_summary}
                                    onChange={e => setNoteForm(p => ({ ...p, structured_summary: e.target.value }))} />
                            </div>
                            <div>
                                <label className="form-label">Follow-up days <span className="text-slate-400 font-normal">(optional)</span></label>
                                <input type="number" min="1" className="form-input" value={noteForm.follow_up_days}
                                    onChange={e => setNoteForm(p => ({ ...p, follow_up_days: e.target.value }))} />
                            </div>
                            {noteError && <div className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{noteError}</div>}
                            {noteMsg && <div className="text-green-700 text-sm bg-green-50 rounded-lg px-3 py-2">{noteMsg}</div>}
                            <button type="submit" className="btn-primary w-full">Save Note</button>
                        </form>
                    </div>
                    <div className="space-y-3">
                        <h2 className="text-sm font-semibold text-slate-500 uppercase">Recent Notes ({notes.length})</h2>
                        {notes.slice(0, 5).map(n => (
                            <div key={n.id} className="card">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="font-medium text-slate-800">{n.patient_name}</p>
                                    {n.follow_up_days && <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">📆 {n.follow_up_days}d</span>}
                                </div>
                                <p className="text-sm text-slate-600 line-clamp-2">{n.raw_note}</p>
                                <p className="text-xs text-slate-400 mt-1">{new Date(n.created_at).toLocaleString()}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── MY SLOTS ─────────────────────────────────────────────────── */}
            {tab === 'slots' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="card">
                        <h2 className="text-base font-semibold text-slate-700 mb-4">Create Availability Slot</h2>
                        <form onSubmit={handleSlot} className="space-y-4">
                            <div>
                                <label className="form-label">Doctor *</label>
                                <select className="form-input" value={slotForm.doctor_id} onChange={e => setSlotForm(f => ({ ...f, doctor_id: e.target.value }))} required>
                                    <option value="">Select doctor...</option>
                                    {doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </select>
                            </div>
                            <div><label className="form-label">Date *</label>
                                <input type="date" className="form-input" value={slotForm.date} onChange={e => setSlotForm(f => ({ ...f, date: e.target.value }))} required /></div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="form-label">Start *</label>
                                    <input type="time" className="form-input" value={slotForm.start_time} onChange={e => setSlotForm(f => ({ ...f, start_time: e.target.value }))} required /></div>
                                <div><label className="form-label">End *</label>
                                    <input type="time" className="form-input" value={slotForm.end_time} onChange={e => setSlotForm(f => ({ ...f, end_time: e.target.value }))} required /></div>
                            </div>
                            {slotError && <div className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{slotError}</div>}
                            {slotMsg && <div className="text-green-700 text-sm bg-green-50 rounded-lg px-3 py-2">{slotMsg}</div>}
                            <button type="submit" className="btn-primary w-full">Add Slot</button>
                        </form>
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-sm font-semibold text-slate-500 uppercase mb-3">All Slots ({slots.length}) — {slots.filter(s => !s.is_booked).length} free</h2>
                        {slots.length === 0 && <div className="card text-center py-10 text-slate-400">No slots yet</div>}
                        {slots.map(s => (
                            <div key={s.id} className="card flex items-center justify-between py-3">
                                <div>
                                    <p className="text-sm font-medium text-slate-800">{s.date} · {s.start_time}–{s.end_time}</p>
                                    <p className="text-xs text-slate-500 mt-0.5">{(s as any).doctor_name}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${s.is_booked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                        {s.is_booked ? '🔒 Booked' : '✅ Free'}
                                    </span>
                                    {!s.is_booked && <button onClick={() => deleteSlot(s.id)} className="btn-danger text-xs py-1 px-2">Del</button>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── RX MODAL ─────────────────────────────────────────────────── */}
            {rxModalPatient && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl relative animate-fade-in-up">
                        <button
                            onClick={() => { setRxModalPatient(null); setRxMsg(''); setRxError(''); }}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full w-8 h-8 flex items-center justify-center transition-colors"
                        >
                            ✕
                        </button>
                        <h2 className="text-xl font-bold text-slate-800 mb-1 flex items-center gap-2">
                            <span className="text-2xl">💊</span> Prescribe Medication
                        </h2>
                        <p className="text-sm text-slate-500 mb-6">Assigning to <span className="font-medium text-slate-800">{rxModalPatient.name}</span></p>

                        <form onSubmit={handlePrescription} className="space-y-4">
                            <div>
                                <label className="form-label">Medicine *</label>
                                <select className="form-input" value={rxForm.medicine_id} onChange={e => setRxForm(f => ({ ...f, medicine_id: e.target.value }))} required>
                                    <option value="">Select medicine...</option>
                                    {medicines.filter(m => m.stock_quantity > 0).map(m => (
                                        <option key={m.id} value={m.id}>{m.name} - {m.strength} ({m.category})</option>
                                    ))}
                                </select>
                                <p className="text-xs text-slate-400 mt-1">Only medicines currently in stock are shown.</p>
                            </div>

                            {rxError && <div className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2 border border-red-100">{rxError}</div>}
                            {rxMsg && <div className="text-green-700 text-sm bg-green-50 rounded-lg px-3 py-2 border border-green-100">{rxMsg}</div>}

                            <div className="pt-2">
                                <button type="submit" className="btn-primary w-full bg-indigo-600 hover:bg-indigo-700 py-2.5">
                                    Send to Pharmacy
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
