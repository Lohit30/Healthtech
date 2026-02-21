// ─── Thresholds ───────────────────────────────────────────────────────────────
export type RiskLevel = 'normal' | 'warning' | 'critical';

export interface VitalsData {
    patient_id: number;
    patient_name: string;
    risk_level: string;
    heart_rate: number;
    spo2: number;
    glucose: number;
    timestamp: string;
}

export interface Alert {
    patient_id: number;
    patient_name: string;
    message: string;
    level: RiskLevel;
}

export function computeHRRisk(hr: number): RiskLevel {
    if (hr > 130 || hr < 50) return 'critical';
    if (hr > 100 || hr < 60) return 'warning';
    return 'normal';
}

export function computeSpO2Risk(spo2: number): RiskLevel {
    if (spo2 <= 90) return 'critical';
    if (spo2 <= 95) return 'warning';
    return 'normal';
}

export function computeGlucoseRisk(glucose: number): RiskLevel {
    if (glucose > 200 || glucose < 55) return 'critical';
    if (glucose > 140 || glucose < 70) return 'warning';
    return 'normal';
}

const RISK_RANK: Record<RiskLevel, number> = { normal: 0, warning: 1, critical: 2 };

export function computeRisk(hr: number, spo2: number, glucose: number): RiskLevel {
    const levels: RiskLevel[] = [
        computeHRRisk(hr),
        computeSpO2Risk(spo2),
        computeGlucoseRisk(glucose),
    ];
    return levels.reduce((a, b) => RISK_RANK[a] >= RISK_RANK[b] ? a : b);
}

export function generateAlerts(vitals: VitalsData[]): Alert[] {
    const alerts: Alert[] = [];
    for (const v of vitals) {
        const hrRisk = computeHRRisk(v.heart_rate);
        const spo2Risk = computeSpO2Risk(v.spo2);
        const glucoseRisk = computeGlucoseRisk(v.glucose);

        if (hrRisk !== 'normal') {
            alerts.push({
                patient_id: v.patient_id,
                patient_name: v.patient_name,
                message: `HR ${v.heart_rate} bpm — ${hrRisk === 'critical' ? '🚨 CRITICAL' : '⚠️ WARNING'}`,
                level: hrRisk,
            });
        }
        if (spo2Risk !== 'normal') {
            alerts.push({
                patient_id: v.patient_id,
                patient_name: v.patient_name,
                message: `SpO₂ ${v.spo2}% — ${spo2Risk === 'critical' ? '🚨 CRITICAL' : '⚠️ WARNING'}`,
                level: spo2Risk,
            });
        }
        if (glucoseRisk !== 'normal') {
            alerts.push({
                patient_id: v.patient_id,
                patient_name: v.patient_name,
                message: `Glucose ${v.glucose} mg/dL — ${glucoseRisk === 'critical' ? '🚨 CRITICAL' : '⚠️ WARNING'}`,
                level: glucoseRisk,
            });
        }
    }
    // Critical first
    return alerts.sort((a, b) => RISK_RANK[b.level] - RISK_RANK[a.level]);
}
