import { useEffect, useState } from 'react';
import { authFetch } from '../auth';

interface Patient {
    id: number;
    name: string;
    age: number | null;
    gender: string | null;
    village: string | null;
    symptoms: string | null;
    vitals: string | null;
    risk_level: 'low' | 'medium' | 'high';
    created_at: string;
}

interface ConsultationNote {
    patient_id: number;
    follow_up_days: number | null;
}

const riskBadge = {
    high: 'bg-red-100 text-red-700 border border-red-200',
    medium: 'bg-amber-100 text-amber-700 border border-amber-200',
    low: 'bg-green-100 text-green-700 border border-green-200',
};

export default function PatientList() {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [followUps, setFollowUps] = useState<Record<number, number | null>>({});
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');

    const fetchData = async () => {
        const [pRes, cRes] = await Promise.all([
            authFetch('/api/patients'),
            authFetch('/api/consultations'),
        ]);
        const pData: Patient[] = await pRes.json();
        const cData: ConsultationNote[] = await cRes.json();

        // Map follow-up days per patient (latest note)
        const fu: Record<number, number | null> = {};
        cData.forEach(n => {
            if (!(n.patient_id in fu)) fu[n.patient_id] = n.follow_up_days;
        });

        setPatients(pData);
        setFollowUps(fu);
    };

    useEffect(() => { fetchData(); }, []);

    const handleDelete = async (id: number) => {
        if (!confirm('Delete this patient? This cannot be undone.')) return;
        await authFetch(`/api/patients/${id}`, { method: 'DELETE' });
        fetchData();
    };

    const filtered = patients
        .filter(p => filter === 'all' || p.risk_level === filter)
        .filter(p =>
            p.name.toLowerCase().includes(search.toLowerCase()) ||
            (p.village ?? '').toLowerCase().includes(search.toLowerCase())
        );

    return (
        <div className="p-8">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Patient List</h1>
                    <p className="text-slate-500 mt-1">{patients.length} total patients registered</p>
                </div>
            </div>

            {/* Filters */}
            <div className="card mb-6 flex flex-wrap gap-3 items-center">
                <input
                    type="text"
                    placeholder="Search by name or village..."
                    className="form-input max-w-xs"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
                <div className="flex gap-2">
                    {(['all', 'high', 'medium', 'low'] as const).map(level => (
                        <button
                            key={level}
                            onClick={() => setFilter(level)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === level
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                        >
                            {level.charAt(0).toUpperCase() + level.slice(1)}
                        </button>
                    ))}
                </div>
                <span className="text-sm text-slate-400 ml-auto">{filtered.length} shown</span>
            </div>

            {/* Table */}
            <div className="card p-0 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                {['Patient', 'Age / Gender', 'Village', 'Symptoms', 'Vitals', 'Risk', 'Follow-up', 'Actions'].map(h => (
                                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="text-center py-12 text-slate-400">No patients found</td>
                                </tr>
                            )}
                            {filtered.map(p => (
                                <tr key={p.id} className={`hover:bg-slate-50 transition-colors ${p.risk_level === 'high' ? 'bg-red-50/40' : ''}`}>
                                    <td className="px-4 py-3 font-medium text-slate-800">{p.name}</td>
                                    <td className="px-4 py-3 text-slate-600">
                                        {p.age != null ? `${p.age} / ${p.gender ?? '—'}` : <span className="text-slate-400">Not recorded</span>}
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">{p.village ?? <span className="text-slate-400">—</span>}</td>
                                    <td className="px-4 py-3 text-slate-600 max-w-[180px] truncate" title={p.symptoms ?? ''}>
                                        {p.symptoms ?? <span className="text-slate-400">—</span>}
                                    </td>
                                    <td className="px-4 py-3 text-slate-600 max-w-[160px] truncate" title={p.vitals ?? ''}>
                                        {p.vitals ?? <span className="text-slate-400">—</span>}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${riskBadge[p.risk_level]}`}>
                                            {p.risk_level === 'high' && '🚨'}
                                            {p.risk_level === 'medium' && '⚠️'}
                                            {p.risk_level === 'low' && '✅'}
                                            {p.risk_level}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        {followUps[p.id] != null ? (
                                            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                                                📆 {followUps[p.id]}d
                                            </span>
                                        ) : (
                                            <span className="text-xs text-slate-400">—</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <button
                                            onClick={() => handleDelete(p.id)}
                                            className="btn-danger text-xs py-1 px-3"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
