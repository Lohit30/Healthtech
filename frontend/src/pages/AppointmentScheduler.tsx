import { useCallback, useEffect, useState } from 'react';
import { authFetch } from '../auth';
import { useRefetchOnFocus } from '../hooks/useRefetchOnFocus';

interface Patient { id: number; name: string; }
interface Doctor { id: number; name: string; specialization: string; }
interface Slot { id: number; doctor_id: number; date: string; start_time: string; end_time: string; is_booked: number; }
interface Appointment {
    id: number;
    patient_id: number;
    doctor_id: number;
    patient_name: string;
    doctor_name: string;
    date: string;
    status: 'scheduled' | 'completed';
}

const statusStyle = {
    scheduled: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
};

export default function AppointmentScheduler() {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    // Slot picker state
    const [freeSlots, setFreeSlots] = useState<Slot[]>([]);
    const [selectedSlotId, setSelectedSlotId] = useState('');
    const [form, setForm] = useState({ patient_id: '', doctor_id: '', date: '', status: 'scheduled' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const fetchAll = useCallback(async () => {
        try {
            const [appts, pts, drs] = await Promise.all([
                authFetch('/api/appointments').then(r => r.json()),
                authFetch('/api/patients').then(r => r.json()),
                authFetch('/api/doctors').then(r => r.json()),
            ]);
            setAppointments(Array.isArray(appts) ? appts : []);
            setPatients(Array.isArray(pts) ? pts : []);
            setDoctors(Array.isArray(drs) ? drs : []);
        } catch (err) {
            console.error('Failed to fetch data:', err);
        }
    }, []);

    useEffect(() => {
        fetchAll();
        const interval = setInterval(fetchAll, 5000); // Poll every 5 seconds
        return () => clearInterval(interval);
    }, [fetchAll]);

    useRefetchOnFocus(fetchAll);

    // Reschedule state
    const [reschedulingId, setReschedulingId] = useState<number | null>(null);

    // Load free slots whenever doctor changes
    useEffect(() => {
        if (!reschedulingId) {
            setSelectedSlotId('');
            setFreeSlots([]);
        }
        if (!form.doctor_id) return;
        authFetch(`/api/availability?doctor_id=${form.doctor_id}`)
            .then(r => r.json())
            .then(slots => setFreeSlots(Array.isArray(slots) ? slots : []));
    }, [form.doctor_id, reschedulingId]);

    const handleRescheduleInit = (appt: Appointment) => {
        setReschedulingId(appt.id);
        setForm({
            patient_id: String(appt.patient_id),
            doctor_id: String(appt.doctor_id),
            date: appt.date,
            status: appt.status
        });
        // We might want to see if the current availability ID is in the slots, 
        // but typically rescheduling means picking a NEW slot.
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const chosenSlot = freeSlots.find(s => String(s.id) === selectedSlotId);
            const dateToSend = chosenSlot ? `${chosenSlot.date}T${chosenSlot.start_time}` : form.date;
            if (!dateToSend) throw new Error('Please pick a slot or enter a date/time');

            const body: Record<string, unknown> = {
                patient_id: Number(form.patient_id),
                doctor_id: Number(form.doctor_id),
                date: dateToSend,
            };
            if (selectedSlotId) body.availability_id = Number(selectedSlotId);

            const url = reschedulingId ? `/api/appointments/${reschedulingId}` : '/api/appointments';
            const method = reschedulingId ? 'PUT' : 'POST';

            const res = await authFetch(url, { method, body: JSON.stringify(body) });
            if (!res.ok) {
                const d = await res.json();
                throw new Error(d.error || `Failed to ${reschedulingId ? 'reschedule' : 'create'} appointment`);
            }
            setForm({ patient_id: '', doctor_id: '', date: '', status: 'scheduled' });
            setSelectedSlotId('');
            setFreeSlots([]);
            setReschedulingId(null);
            fetchAll();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Error');
        } finally {
            setLoading(false);
        }
    };

    const markCompleted = async (id: number) => {
        await authFetch(`/api/appointments/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ status: 'completed' }),
        });
        fetchAll();
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Delete this appointment?')) return;
        await authFetch(`/api/appointments/${id}`, { method: 'DELETE' });
        fetchAll();
    };

    return (
        <div className="p-8">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-800">Appointments</h1>
                <p className="text-slate-500 mt-1">Schedule and manage patient appointments</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Form */}
                <div className="card">
                    <h2 className="text-base font-semibold text-slate-700 mb-4">
                        {reschedulingId ? 'Reschedule Appointment' : 'New Appointment'}
                    </h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="form-label">Patient *</label>
                            <select
                                className="form-input"
                                value={form.patient_id}
                                onChange={e => setForm(p => ({ ...p, patient_id: e.target.value }))}
                                required
                                disabled={!!reschedulingId}
                            >
                                <option value="">Select patient...</option>
                                {patients.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="form-label">Doctor *</label>
                            <select
                                className="form-input"
                                value={form.doctor_id}
                                onChange={e => setForm(p => ({ ...p, doctor_id: e.target.value }))}
                                required
                                disabled={!!reschedulingId}
                            >
                                <option value="">Select doctor...</option>
                                {doctors.map(d => (
                                    <option key={d.id} value={d.id}>{d.name} — {d.specialization}</option>
                                ))}
                            </select>
                        </div>

                        {/* Slot picker — shown when doctor selected and free slots exist */}
                        {form.doctor_id && (
                            <div>
                                <label className="form-label">Available Slot</label>
                                {freeSlots.length === 0 ? (
                                    <p className="text-xs text-slate-400 mt-1">No slots available — enter date/time manually below</p>
                                ) : (
                                    <select
                                        className="form-input"
                                        value={selectedSlotId}
                                        onChange={e => setSelectedSlotId(e.target.value)}
                                    >
                                        <option value="">— Pick a slot or enter manually —</option>
                                        {freeSlots.map(s => (
                                            <option key={s.id} value={s.id}>
                                                {s.date} · {s.start_time}–{s.end_time}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        )}

                        {/* Manual date/time — shown only when no slot is chosen */}
                        {!selectedSlotId && (
                            <div>
                                <label className="form-label">Date &amp; Time {freeSlots.length === 0 ? '*' : '(or pick slot above)'}</label>
                                <input
                                    type="datetime-local"
                                    className="form-input"
                                    value={form.date}
                                    onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                                    required={!selectedSlotId && freeSlots.length === 0}
                                />
                            </div>
                        )}

                        {error && (
                            <div className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</div>
                        )}
                        <div className="flex gap-2">
                            {reschedulingId && (
                                <button type="button" onClick={() => { setReschedulingId(null); setForm({ patient_id: '', doctor_id: '', date: '', status: 'scheduled' }); }} className="btn-secondary flex-1">
                                    Cancel
                                </button>
                            )}
                            <button type="submit" disabled={loading} className="btn-primary flex-[2]">
                                {loading ? (reschedulingId ? 'Rescheduling...' : 'Scheduling...') : (reschedulingId ? 'Confirm Reschedule' : 'Schedule Appointment')}
                            </button>
                        </div>
                    </form>
                </div>

                {/* List */}
                <div className="lg:col-span-2 card p-0 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100">
                        <h2 className="text-base font-semibold text-slate-700">All Appointments ({appointments.length})</h2>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {appointments.length === 0 && (
                            <p className="text-slate-400 text-sm text-center py-10">No appointments yet</p>
                        )}
                        {appointments.map(a => (
                            <div key={a.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                <div>
                                    <p className="text-sm font-semibold text-slate-800">{a.patient_name}</p>
                                    <p className="text-xs text-slate-500 mt-0.5">with {a.doctor_name}</p>
                                    <p className="text-xs text-slate-400 mt-0.5">{new Date(a.date).toLocaleString()}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${statusStyle[a.status]}`}>
                                        {a.status}
                                    </span>
                                    {a.status === 'scheduled' && (
                                        <>
                                            <button
                                                onClick={() => markCompleted(a.id)}
                                                className="text-xs text-green-600 hover:text-green-800 font-medium"
                                            >
                                                ✓ Complete
                                            </button>
                                            <button
                                                onClick={() => handleRescheduleInit(a)}
                                                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                                            >
                                                ✎ Reschedule
                                            </button>
                                        </>
                                    )}
                                    <button onClick={() => handleDelete(a.id)} className="btn-danger text-xs py-1 px-2">Cancel</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
