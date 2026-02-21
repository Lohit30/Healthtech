import { useEffect, useState, useCallback } from 'react';
import { authFetch } from '../../auth';
import { useRefetchOnFocus } from '../../hooks/useRefetchOnFocus';

interface Prescription {
    id: number;
    patient_id: number;
    doctor_id: number;
    medicine_id: string;
    status: 'pending' | 'dispensed';
    created_at: string;
    dispensed_at: string | null;
    medicine_name: string;
    medicine_strength: string;
    patient_name: string;
    patient_village: string | null;
    doctor_name: string;
}

interface Medicine {
    id: string;
    name: string;
    category: string;
    strength: string;
    price: number;
    stock_quantity: number;
}

export default function PharmacyDashboard() {
    const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
    const [medicines, setMedicines] = useState<Medicine[]>([]);
    const [actionMsg, setActionMsg] = useState('');
    const [actionError, setActionError] = useState('');

    const fetchAll = useCallback(async () => {
        try {
            const [pRes, mRes] = await Promise.all([
                authFetch('/api/prescriptions'),
                authFetch('/api/medicines')
            ]);

            if (pRes.ok) setPrescriptions(await pRes.json());
            if (mRes.ok) setMedicines(await mRes.json());
        } catch (e) {
            console.error('Failed to fetch pharmacy data', e);
        }
    }, []);

    useEffect(() => {
        fetchAll();
        const interval = setInterval(fetchAll, 10000); // refresh every 10s
        return () => clearInterval(interval);
    }, [fetchAll]);

    useRefetchOnFocus(fetchAll);

    const handleDispense = async (id: number) => {
        if (!confirm('Dispense this medication?')) return;
        setActionMsg('');
        setActionError('');

        try {
            const res = await authFetch(`/api/prescriptions/${id}/dispense`, { method: 'PATCH' });
            const data = await res.json();

            if (!res.ok) {
                setActionError(data.error || 'Failed to dispense');
            } else {
                setActionMsg('✅ Medication dispensed successfully');
                fetchAll(); // refresh data
            }
        } catch (e: any) {
            setActionError(e.message || 'Error occurred');
        }
    };

    const pendingCount = prescriptions.filter(p => p.status === 'pending').length;
    const lowStockMedicines = medicines.filter(m => m.stock_quantity > 0 && m.stock_quantity <= 100);
    const outOfStockMedicines = medicines.filter(m => m.stock_quantity === 0);

    return (
        <div className="p-8">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-800">Pharmacy Dashboard</h1>
                <p className="text-slate-500 mt-1">Manage prescriptions and medicine stock</p>
            </div>

            {actionError && <div className="mb-4 bg-red-100 text-red-700 px-4 py-3 rounded-lg border border-red-200">{actionError}</div>}
            {actionMsg && <div className="mb-4 bg-green-100 text-green-700 px-4 py-3 rounded-lg border border-green-200">{actionMsg}</div>}

            <div className="grid grid-cols-4 gap-4 mb-8">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="bg-orange-100 text-orange-600 w-12 h-12 rounded-xl flex items-center justify-center text-2xl">⏳</div>
                    <div>
                        <p className="text-2xl font-bold text-slate-800">{pendingCount}</p>
                        <p className="text-sm text-slate-500">Pending Prescriptions</p>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="bg-blue-100 text-blue-600 w-12 h-12 rounded-xl flex items-center justify-center text-2xl">💊</div>
                    <div>
                        <p className="text-2xl font-bold text-slate-800">{medicines.length}</p>
                        <p className="text-sm text-slate-500">Total Medicines</p>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="bg-amber-100 text-amber-600 w-12 h-12 rounded-xl flex items-center justify-center text-2xl">⚠️</div>
                    <div>
                        <p className="text-2xl font-bold text-slate-800">{lowStockMedicines.length}</p>
                        <p className="text-sm text-slate-500">Low Stock items</p>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${outOfStockMedicines.length > 0 ? 'bg-red-100 text-red-600 ring-2 ring-red-400 animate-pulse' : 'bg-green-100 text-green-600'}`}>🚨</div>
                    <div>
                        <p className="text-2xl font-bold text-slate-800">{outOfStockMedicines.length}</p>
                        <p className="text-sm text-slate-500">Out of Stock</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Prescriptions List */}
                <div className="xl:col-span-2">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                            <h2 className="text-lg font-bold text-slate-800">Prescriptions</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-3 text-left font-semibold text-slate-500">Date</th>
                                        <th className="px-6 py-3 text-left font-semibold text-slate-500">Patient</th>
                                        <th className="px-6 py-3 text-left font-semibold text-slate-500">Medicine</th>
                                        <th className="px-6 py-3 text-left font-semibold text-slate-500">Doctor</th>
                                        <th className="px-6 py-3 text-center font-semibold text-slate-500">Status</th>
                                        <th className="px-6 py-3 text-right font-semibold text-slate-500">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {prescriptions.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                                                No prescriptions found.
                                            </td>
                                        </tr>
                                    )}
                                    {prescriptions.map((p) => (
                                        <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 text-slate-600">
                                                {new Date(p.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-slate-800">{p.patient_name}</div>
                                                <div className="text-xs text-slate-500">{p.patient_village || '—'}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-slate-800">{p.medicine_name}</div>
                                                <div className="text-xs text-slate-500">{p.medicine_strength}</div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600">Dr. {p.doctor_name}</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${p.status === 'pending' ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'
                                                    }`}>
                                                    {p.status === 'pending' ? '⏳ Pending' : '✅ Dispensed'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {p.status === 'pending' ? (
                                                    <button
                                                        onClick={() => handleDispense(p.id)}
                                                        className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded hover:bg-blue-700 transition-colors"
                                                    >
                                                        Dispense
                                                    </button>
                                                ) : (
                                                    <span className="text-xs text-slate-400">
                                                        {new Date(p.dispensed_at as string).toLocaleDateString()}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Inventory Snapshot */}
                <div className="xl:col-span-1 space-y-6">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50">
                            <h2 className="text-base font-bold text-slate-800">Inventory Status</h2>
                        </div>
                        <div className="p-0 max-h-[600px] overflow-y-auto">
                            {medicines.map((m) => (
                                <div key={m.id} className="px-5 py-3 border-b border-slate-100 hover:bg-slate-50 flex items-center justify-between">
                                    <div>
                                        <p className="font-medium text-slate-800 text-sm">{m.name} <span className="text-slate-400 font-normal text-xs">{m.strength}</span></p>
                                        <p className="text-xs text-slate-500 mt-0.5">{m.category}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${m.stock_quantity === 0 ? 'bg-red-100 text-red-800 border border-red-200' :
                                                m.stock_quantity <= 100 ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                                                    'bg-slate-100 text-slate-600 border border-slate-200'
                                            }`}>
                                            {m.stock_quantity} in stock
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
