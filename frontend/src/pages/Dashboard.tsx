import { useEffect, useState } from 'react';

interface Stats {
    total: number;
    high: number;
    medium: number;
    low: number;
    appointments: number;
    consultations: number;
}

interface Patient {
    id: number;
    name: string;
    age: number;
    village: string;
    risk_level: 'low' | 'medium' | 'high';
    created_at: string;
}

const riskStyle = {
    high: 'bg-red-100 text-red-700 border border-red-200',
    medium: 'bg-amber-100 text-amber-700 border border-amber-200',
    low: 'bg-green-100 text-green-700 border border-green-200',
};

export default function Dashboard() {
    const [stats, setStats] = useState<Stats>({ total: 0, high: 0, medium: 0, low: 0, appointments: 0, consultations: 0 });
    const [recent, setRecent] = useState<Patient[]>([]);

    useEffect(() => {
        Promise.all([
            fetch('/api/patients').then(r => r.json()),
            fetch('/api/appointments').then(r => r.json()),
            fetch('/api/consultations').then(r => r.json()),
        ]).then(([patients, appointments, consultations]: [Patient[], unknown[], unknown[]]) => {
            setStats({
                total: patients.length,
                high: patients.filter(p => p.risk_level === 'high').length,
                medium: patients.filter(p => p.risk_level === 'medium').length,
                low: patients.filter(p => p.risk_level === 'low').length,
                appointments: appointments.length,
                consultations: consultations.length,
            });
            setRecent(patients.slice(0, 5));
        });
    }, []);

    const statCards = [
        { label: 'Total Patients', value: stats.total, color: 'bg-blue-500', icon: '👥' },
        { label: 'High Risk', value: stats.high, color: 'bg-red-500', icon: '🚨' },
        { label: 'Appointments', value: stats.appointments, color: 'bg-purple-500', icon: '📅' },
        { label: 'Consultations', value: stats.consultations, color: 'bg-teal-500', icon: '📝' },
    ];

    return (
        <div className="p-8">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
                <p className="text-slate-500 mt-1">Overview of your rural clinic operations</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {statCards.map((card) => (
                    <div key={card.label} className="card flex items-center gap-4">
                        <div className={`${card.color} w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0`}>
                            {card.icon}
                        </div>
                        <div>
                            <p className="text-3xl font-bold text-slate-800">{card.value}</p>
                            <p className="text-sm text-slate-500">{card.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Risk summary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div className="card">
                    <h2 className="text-base font-semibold text-slate-700 mb-4">Patient Risk Distribution</h2>
                    <div className="space-y-3">
                        {[
                            { label: 'High Risk', count: stats.high, total: stats.total, color: 'bg-red-500' },
                            { label: 'Medium Risk', count: stats.medium, total: stats.total, color: 'bg-amber-400' },
                            { label: 'Low Risk', count: stats.low, total: stats.total, color: 'bg-green-500' },
                        ].map(({ label, count, total, color }) => (
                            <div key={label}>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-slate-600">{label}</span>
                                    <span className="font-medium text-slate-800">{count}</span>
                                </div>
                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full ${color} rounded-full transition-all duration-500`}
                                        style={{ width: total ? `${(count / total) * 100}%` : '0%' }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="card">
                    <h2 className="text-base font-semibold text-slate-700 mb-4">Recent Patients</h2>
                    <div className="space-y-2">
                        {recent.length === 0 && <p className="text-slate-400 text-sm">No patients yet</p>}
                        {recent.map((p) => (
                            <div key={p.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                                <div>
                                    <p className="text-sm font-medium text-slate-800">{p.name}</p>
                                    <p className="text-xs text-slate-400">{p.village} · Age {p.age}</p>
                                </div>
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${riskStyle[p.risk_level]}`}>
                                    {p.risk_level}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
