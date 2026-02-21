import { useEffect, useState } from 'react';

interface Patient { id: number; name: string; }
interface ConsultationNote {
    id: number;
    patient_id: number;
    patient_name: string;
    raw_note: string;
    structured_summary: string | null;
    follow_up_days: number | null;
    created_at: string;
}

export default function ConsultationNotes() {
    const [notes, setNotes] = useState<ConsultationNote[]>([]);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [form, setForm] = useState({
        patient_id: '',
        raw_note: '',
        structured_summary: '',
        follow_up_days: '',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [filterPatient, setFilterPatient] = useState('');

    const fetchAll = async () => {
        const [n, p] = await Promise.all([
            fetch('/api/consultations').then(r => r.json()),
            fetch('/api/patients').then(r => r.json()),
        ]);
        setNotes(n);
        setPatients(p);
    };

    useEffect(() => { fetchAll(); }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const body = {
                patient_id: Number(form.patient_id),
                raw_note: form.raw_note,
                structured_summary: form.structured_summary || null,
                follow_up_days: form.follow_up_days ? Number(form.follow_up_days) : null,
            };
            const res = await fetch('/api/consultations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (!res.ok) {
                const d = await res.json();
                throw new Error(d.error || 'Failed to save note');
            }
            setForm({ patient_id: '', raw_note: '', structured_summary: '', follow_up_days: '' });
            fetchAll();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Error');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Delete this note?')) return;
        await fetch(`/api/consultations/${id}`, { method: 'DELETE' });
        fetchAll();
    };

    const filtered = filterPatient
        ? notes.filter(n => String(n.patient_id) === filterPatient)
        : notes;

    return (
        <div className="p-8">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-800">Consultation Notes</h1>
                <p className="text-slate-500 mt-1">Record and review patient consultation notes</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Form */}
                <div className="card">
                    <h2 className="text-base font-semibold text-slate-700 mb-4">New Note</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="form-label">Patient *</label>
                            <select
                                className="form-input"
                                value={form.patient_id}
                                onChange={e => setForm(p => ({ ...p, patient_id: e.target.value }))}
                                required
                            >
                                <option value="">Select patient...</option>
                                {patients.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="form-label">Raw Note *</label>
                            <textarea
                                className="form-input resize-none"
                                rows={4}
                                placeholder="Describe patient condition, observations, and treatment given..."
                                value={form.raw_note}
                                onChange={e => setForm(p => ({ ...p, raw_note: e.target.value }))}
                                required
                            />
                        </div>

                        <div>
                            <label className="form-label">Structured Summary <span className="text-slate-400 font-normal">(optional)</span></label>
                            <textarea
                                className="form-input resize-none"
                                rows={2}
                                placeholder="Brief structured summary of the consultation"
                                value={form.structured_summary}
                                onChange={e => setForm(p => ({ ...p, structured_summary: e.target.value }))}
                            />
                        </div>

                        <div>
                            <label className="form-label">Follow-up in days <span className="text-slate-400 font-normal">(optional)</span></label>
                            <input
                                type="number"
                                min="1"
                                className="form-input"
                                placeholder="e.g. 7"
                                value={form.follow_up_days}
                                onChange={e => setForm(p => ({ ...p, follow_up_days: e.target.value }))}
                            />
                        </div>

                        {error && (
                            <div className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</div>
                        )}

                        <button type="submit" disabled={loading} className="btn-primary w-full">
                            {loading ? 'Saving...' : 'Save Note'}
                        </button>
                    </form>
                </div>

                {/* Notes list */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="card py-3">
                        <div className="flex items-center gap-3">
                            <label className="text-sm font-medium text-slate-600 whitespace-nowrap">Filter by patient:</label>
                            <select
                                className="form-input"
                                value={filterPatient}
                                onChange={e => setFilterPatient(e.target.value)}
                            >
                                <option value="">All patients</option>
                                {patients.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                            <span className="text-sm text-slate-400 ml-auto whitespace-nowrap">{filtered.length} notes</span>
                        </div>
                    </div>

                    {filtered.length === 0 && (
                        <div className="card text-center py-12 text-slate-400">No consultation notes yet</div>
                    )}

                    {filtered.map(note => (
                        <div key={note.id} className="card">
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <p className="font-semibold text-slate-800">{note.patient_name}</p>
                                    <p className="text-xs text-slate-400 mt-0.5">{new Date(note.created_at).toLocaleString()}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {note.follow_up_days != null && (
                                        <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
                                            📆 Follow-up: {note.follow_up_days} days
                                        </span>
                                    )}
                                    <button onClick={() => handleDelete(note.id)} className="btn-danger text-xs py-1 px-2">Del</button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div>
                                    <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Raw Note</p>
                                    <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3 whitespace-pre-wrap">{note.raw_note}</p>
                                </div>
                                {note.structured_summary && (
                                    <div>
                                        <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Summary</p>
                                        <p className="text-sm text-slate-700 bg-blue-50 rounded-lg p-3 whitespace-pre-wrap">{note.structured_summary}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
