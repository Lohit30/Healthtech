"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = __importDefault(require("../db"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
// ─── Jitter helper ────────────────────────────────────────────────────────────
// Adds a bounded random delta to simulate sensor noise each request.
function jitter(base, range) {
    return Math.round(base + (Math.random() * range * 2 - range));
}
function buildResponse(vitals, patient) {
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
router.get('/', (req, res) => {
    if (req.user.role === 'patient') {
        return res.status(403).json({ error: 'Use /api/vitals/mine for patient vitals' });
    }
    const rows = db_1.default.prepare(`
        SELECT pv.*, p.name, p.risk_level
        FROM patient_vitals pv
        JOIN patients p ON pv.patient_id = p.id
        ORDER BY p.name
    `).all();
    res.json(rows.map(r => buildResponse(r, r)));
});
// ─── GET /api/vitals/mine ─ patient ──────────────────────────────────────────
router.get('/mine', (req, res) => {
    // Find the patient record linked to this user account
    const patient = db_1.default.prepare('SELECT * FROM patients WHERE user_id = ?').get(req.user.id);
    if (!patient) {
        return res.status(404).json({ error: 'No health record found for this account. Visit the clinic to register.' });
    }
    const vitals = db_1.default.prepare('SELECT * FROM patient_vitals WHERE patient_id = ?').get(patient.id);
    if (!vitals) {
        return res.status(404).json({ error: 'No vitals on file yet.' });
    }
    res.json(buildResponse(vitals, patient));
});
exports.default = router;
