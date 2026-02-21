import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const initialForm = {
    name: '',
    age: '',
    gender: 'Male',
    village: '',
    symptoms: '',
    vitals: '',
    risk_level: 'low',
};

export default function AddPatient() {
    const [form, setForm] = useState(initialForm);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await fetch('/api/patients', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, age: Number(form.age) }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to add patient');
            }
            navigate('/patients');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-2xl">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-800">Add New Patient</h1>
                <p className="text-slate-500 mt-1">Register a new patient at your clinic</p>
            </div>

            <div className="card">
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="form-label">Full Name *</label>
                            <input
                                name="name"
                                value={form.name}
                                onChange={handleChange}
                                className="form-input"
                                placeholder="e.g. Ramesh Kumar"
                                required
                            />
                        </div>

                        <div>
                            <label className="form-label">Age *</label>
                            <input
                                name="age"
                                type="number"
                                min="0"
                                max="120"
                                value={form.age}
                                onChange={handleChange}
                                className="form-input"
                                placeholder="e.g. 45"
                                required
                            />
                        </div>

                        <div>
                            <label className="form-label">Gender *</label>
                            <select name="gender" value={form.gender} onChange={handleChange} className="form-input">
                                <option>Male</option>
                                <option>Female</option>
                                <option>Other</option>
                            </select>
                        </div>

                        <div className="col-span-2">
                            <label className="form-label">Village / Location *</label>
                            <input
                                name="village"
                                value={form.village}
                                onChange={handleChange}
                                className="form-input"
                                placeholder="e.g. Khandwa"
                                required
                            />
                        </div>

                        <div className="col-span-2">
                            <label className="form-label">Symptoms *</label>
                            <textarea
                                name="symptoms"
                                value={form.symptoms}
                                onChange={handleChange}
                                className="form-input resize-none"
                                rows={3}
                                placeholder="e.g. Chest pain, shortness of breath for 2 days"
                                required
                            />
                        </div>

                        <div className="col-span-2">
                            <label className="form-label">Vitals *</label>
                            <input
                                name="vitals"
                                value={form.vitals}
                                onChange={handleChange}
                                className="form-input"
                                placeholder="e.g. BP: 140/90, HR: 88, Temp: 99.2F"
                                required
                            />
                        </div>

                        <div className="col-span-2">
                            <label className="form-label">Risk Level *</label>
                            <div className="flex gap-3 mt-1">
                                {(['low', 'medium', 'high'] as const).map(level => {
                                    const colors = {
                                        low: 'border-green-300 bg-green-50 text-green-700',
                                        medium: 'border-amber-300 bg-amber-50 text-amber-700',
                                        high: 'border-red-300 bg-red-50 text-red-700',
                                    };
                                    const active = form.risk_level === level;
                                    return (
                                        <button
                                            key={level}
                                            type="button"
                                            onClick={() => setForm(prev => ({ ...prev, risk_level: level }))}
                                            className={`flex-1 py-2.5 rounded-lg border-2 text-sm font-semibold capitalize transition-all ${active ? colors[level] + ' ring-2 ring-offset-1' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                                                } ${active && level === 'low' ? 'ring-green-300' : ''} ${active && level === 'medium' ? 'ring-amber-300' : ''} ${active && level === 'high' ? 'ring-red-300' : ''}`}
                                        >
                                            {level === 'high' ? '🚨' : level === 'medium' ? '⚠️' : '✅'} {level}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
                            {error}
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button type="submit" disabled={loading} className="btn-primary">
                            {loading ? 'Saving...' : 'Save Patient'}
                        </button>
                        <button type="button" onClick={() => navigate('/patients')} className="btn-secondary">
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
