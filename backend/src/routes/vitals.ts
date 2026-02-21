import { Router, Request, Response } from 'express';
import db from '../db';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// ─── Jitter helper ────────────────────────────────────────────────────────────
// Adds a bounded random delta to simulate sensor noise each request.
function jitter(base: number, range: number): number {
    return Math.round(base + (Math.random() * range * 2 - range));
}

type VitalsRow = { id: number; patient_id: number; heart_rate: number; spo2: number; glucose: number };
type PatientRow = { id: number; name: string; risk_level: string };

function buildResponse(vitals: VitalsRow, patient: PatientRow) {
    return {
        patient_id: patient.id,
        patient_name: patient.name,
        risk_level: patient.risk_level,
        heart_rate: Math.min(200, Math.max(30, jitter(vitals.heart_rate, 5))),
        spo2: Math.min(100, Math.max(70, jitter(vitals.spo2, 2))),
        glucose: Math.min(400, Math.max(40, jitter(vitals.glucose, 10))),
        timestamp: new Date().toISOString(),
    };
}

// ─── GET /api/vitals ─ admin / doctor ────────────────────────────────────────
router.get('/', (req: Request, res: Response) => {
    if (req.user!.role === 'patient') {
        return res.status(403).json({ error: 'Use /api/vitals/mine for patient vitals' });
    }

    const rows = db.prepare(`
        SELECT pv.*, p.name, p.risk_level
        FROM patient_vitals pv
        JOIN patients p ON pv.patient_id = p.id
        ORDER BY p.name
    `).all() as (VitalsRow & PatientRow)[];

    res.json(rows.map(r => buildResponse(r, r)));
});

// ─── GET /api/vitals/mine ─ patient ──────────────────────────────────────────
router.get('/mine', (req: Request, res: Response) => {
    // Find the patient record linked to this user account
    const patient = db.prepare(
        'SELECT * FROM patients WHERE user_id = ?'
    ).get(req.user!.id) as PatientRow | undefined;

    if (!patient) {
        return res.status(404).json({ error: 'No health record found for this account. Visit the clinic to register.' });
    }

    const vitals = db.prepare(
        'SELECT * FROM patient_vitals WHERE patient_id = ?'
    ).get(patient.id) as VitalsRow | undefined;

    if (!vitals) {
        return res.status(404).json({ error: 'No vitals on file yet.' });
    }

    res.json(buildResponse(vitals, patient));
});

export default router;
