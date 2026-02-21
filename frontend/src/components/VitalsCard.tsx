import { VitalsData, computeRisk, computeHRRisk, computeSpO2Risk, computeGlucoseRisk, RiskLevel } from '../utils/vitalsUtils';

interface Props {
    v: VitalsData;
    compact?: boolean;
}

const riskStyles: Record<RiskLevel, string> = {
    normal: 'border-green-200 bg-green-50/30',
    warning: 'border-amber-300 bg-amber-50/40',
    critical: 'border-red-400 bg-red-50/40 animate-pulse',
};

const riskBadge: Record<RiskLevel, string> = {
    normal: 'bg-green-100 text-green-700',
    warning: 'bg-amber-100 text-amber-700',
    critical: 'bg-red-100 text-red-700',
};

const riskLabel: Record<RiskLevel, string> = {
    normal: '✅ Normal',
    warning: '⚠️ Warning',
    critical: '🚨 Critical',
};

const metricRiskColor: Record<RiskLevel, string> = {
    normal: 'text-green-600',
    warning: 'text-amber-600',
    critical: 'text-red-600',
};

function Metric({ label, value, unit, risk }: { label: string; value: number; unit: string; risk: RiskLevel }) {
    return (
        <div className="flex flex-col items-center">
            <p className={`text-xl font-bold tabular-nums ${metricRiskColor[risk]}`}>
                {value}
                <span className="text-xs font-normal text-slate-400 ml-0.5">{unit}</span>
            </p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
        </div>
    );
}

export default function VitalsCard({ v, compact = false }: Props) {
    const risk = computeRisk(v.heart_rate, v.spo2, v.glucose);
    const hrRisk = computeHRRisk(v.heart_rate);
    const spo2Risk = computeSpO2Risk(v.spo2);
    const glucoseRisk = computeGlucoseRisk(v.glucose);

    if (compact) {
        // Table-row style for compact lists
        return (
            <div className={`flex items-center justify-between px-4 py-3 rounded-lg border transition-all duration-700 ${riskStyles[risk]}`}>
                <div className="flex items-center gap-3 min-w-0">
                    {risk === 'critical' && <span className="text-red-500 text-sm flex-shrink-0">🚨</span>}
                    <p className="text-sm font-medium text-slate-800 truncate">{v.patient_name}</p>
                </div>
                <div className="flex items-center gap-4 ml-4">
                    <span className={`text-sm font-bold tabular-nums ${metricRiskColor[hrRisk]}`}>
                        ❤️ {v.heart_rate}
                    </span>
                    <span className={`text-sm font-bold tabular-nums ${metricRiskColor[spo2Risk]}`}>
                        🫁 {v.spo2}%
                    </span>
                    <span className={`text-sm font-bold tabular-nums ${metricRiskColor[glucoseRisk]}`}>
                        🩸 {v.glucose}
                    </span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${riskBadge[risk]}`}>
                        {riskLabel[risk]}
                    </span>
                </div>
            </div>
        );
    }

    return (
        <div className={`rounded-xl border-2 p-4 transition-all duration-700 ${riskStyles[risk]}`}>
            <div className="flex items-center justify-between mb-3">
                <p className="font-semibold text-slate-800">{v.patient_name}</p>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${riskBadge[risk]}`}>
                    {riskLabel[risk]}
                </span>
            </div>
            <div className="flex items-center justify-around">
                <Metric label="Heart Rate" value={v.heart_rate} unit="bpm" risk={hrRisk} />
                <div className="w-px h-8 bg-slate-200" />
                <Metric label="SpO₂" value={v.spo2} unit="%" risk={spo2Risk} />
                <div className="w-px h-8 bg-slate-200" />
                <Metric label="Glucose" value={v.glucose} unit="mg/dL" risk={glucoseRisk} />
            </div>
            <p className="text-[10px] text-slate-300 text-right mt-2 tabular-nums">
                {new Date(v.timestamp).toLocaleTimeString()}
            </p>
        </div>
    );
}
