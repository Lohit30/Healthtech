"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = __importDefault(require("../db"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// All appointment routes require authentication
router.use(auth_1.authenticate);
// ─── Helpers ─────────────────────────────────────────────────────────────────
function isPatient(req) { return req.user?.role === 'patient'; }
function isAdminOrDoctor(req) {
    return req.user?.role === 'admin' || req.user?.role === 'doctor';
}
/** Mark an availability slot as booked (1) or free (0). No-op if id is null. */
function setSlotBooked(slotId, booked) {
    if (!slotId)
        return;
    db_1.default.prepare('UPDATE doctor_availability SET is_booked = ? WHERE id = ?').run(booked, slotId);
}
// ─── GET all appointments ──────────────────────────────────────────────────────
// • Patients: only see their own (WHERE user_id = JWT userId)
// • Admin / Doctor: see all
router.get('/', (req, res) => {
    if (isPatient(req)) {
        const appointments = db_1.default.prepare(`
      SELECT a.*, d.name as doctor_name,
             COALESCE(p.name, u.name) as patient_name
      FROM appointments a
      LEFT JOIN patients p ON a.patient_id = p.id
      LEFT JOIN users   u ON a.user_id     = u.id
      JOIN  doctors   d ON a.doctor_id   = d.id
      WHERE a.user_id = ?
      ORDER BY a.date DESC
    `).all(req.user.id);
        return res.json(appointments);
    }
    const appointments = db_1.default.prepare(`
    SELECT a.*, d.name as doctor_name,
           COALESCE(p.name, u.name) as patient_name
    FROM appointments a
    LEFT JOIN patients p ON a.patient_id = p.id
    LEFT JOIN users   u ON a.user_id     = u.id
    JOIN  doctors   d ON a.doctor_id   = d.id
    ORDER BY a.date DESC
  `).all();
    res.json(appointments);
});
// ─── GET single appointment ────────────────────────────────────────────────────
router.get('/:id', (req, res) => {
    const appt = db_1.default.prepare(`
    SELECT a.*, d.name as doctor_name,
           COALESCE(p.name, u.name) as patient_name
    FROM appointments a
    LEFT JOIN patients p ON a.patient_id = p.id
    LEFT JOIN users   u ON a.user_id     = u.id
    JOIN  doctors   d ON a.doctor_id   = d.id
    WHERE a.id = ?
  `).get(req.params.id);
    if (!appt)
        return res.status(404).json({ error: 'Appointment not found' });
    if (isPatient(req) && appt.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
    }
    res.json(appt);
});
// ─── POST create appointment ───────────────────────────────────────────────────
// user_id always from JWT. If availability_id provided, marks that slot as booked.
router.post('/', (req, res) => {
    const { doctor_id, date, status, availability_id } = req.body;
    const patient_id_from_body = isAdminOrDoctor(req) ? (req.body.patient_id ?? null) : null;
    if (!doctor_id || !date) {
        return res.status(400).json({ error: 'doctor_id and date are required' });
    }
    const doctor = db_1.default.prepare('SELECT id FROM doctors WHERE id = ?').get(doctor_id);
    if (!doctor)
        return res.status(404).json({ error: 'Doctor not found' });
    // If a slot was chosen, verify it exists and is still free
    if (availability_id) {
        const slot = db_1.default.prepare('SELECT * FROM doctor_availability WHERE id = ?').get(availability_id);
        if (!slot)
            return res.status(404).json({ error: 'Availability slot not found' });
        if (slot.is_booked)
            return res.status(409).json({ error: 'That slot is already booked' });
    }
    const result = db_1.default.prepare(`INSERT INTO appointments (patient_id, user_id, doctor_id, availability_id, date, status)
         VALUES (?, ?, ?, ?, ?, ?)`).run(patient_id_from_body, req.user.id, doctor_id, availability_id ?? null, date, status || 'scheduled');
    // Mark slot as booked
    setSlotBooked(availability_id, 1);
    const created = db_1.default.prepare('SELECT * FROM appointments WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(created);
});
// ─── PUT update appointment ────────────────────────────────────────────────────
// • Patient: can ONLY change `date` and optionally pick a new slot
// • Admin/Doctor: full update
router.put('/:id', (req, res) => {
    const existing = db_1.default.prepare('SELECT * FROM appointments WHERE id = ?').get(req.params.id);
    if (!existing)
        return res.status(404).json({ error: 'Appointment not found' });
    const { patient_id, doctor_id, date, status, availability_id } = req.body;
    if (status !== undefined && status !== 'scheduled' && status !== 'completed') {
        return res.status(400).json({ error: "status must be 'scheduled' or 'completed'" });
    }
    if (isPatient(req)) {
        if (existing.user_id !== req.user.id) {
            return res.status(403).json({ error: 'You can only reschedule your own appointments' });
        }
        if (!date)
            return res.status(400).json({ error: 'date is required for rescheduling' });
        // Free old slot, mark new slot if switching
        if (availability_id !== undefined && availability_id !== existing.availability_id) {
            setSlotBooked(existing.availability_id, 0);
            if (availability_id) {
                const newSlot = db_1.default.prepare('SELECT * FROM doctor_availability WHERE id = ?').get(availability_id);
                if (!newSlot)
                    return res.status(404).json({ error: 'New slot not found' });
                if (newSlot.is_booked)
                    return res.status(409).json({ error: 'New slot is already booked' });
                setSlotBooked(availability_id, 1);
            }
        }
        db_1.default.prepare('UPDATE appointments SET date = ?, availability_id = ? WHERE id = ?')
            .run(date, availability_id ?? existing.availability_id, req.params.id);
        return res.json(db_1.default.prepare('SELECT * FROM appointments WHERE id = ?').get(req.params.id));
    }
    // Admin / Doctor: free old slot, link new slot if changing
    if (availability_id !== undefined && availability_id !== existing.availability_id) {
        setSlotBooked(existing.availability_id, 0);
        if (availability_id) {
            setSlotBooked(availability_id, 1);
        }
    }
    db_1.default.prepare(`UPDATE appointments SET patient_id=?, doctor_id=?, availability_id=?, date=?, status=? WHERE id=?`).run(patient_id ?? existing.patient_id, doctor_id ?? existing.doctor_id, availability_id ?? existing.availability_id, date ?? existing.date, status ?? existing.status, req.params.id);
    res.json(db_1.default.prepare('SELECT * FROM appointments WHERE id = ?').get(req.params.id));
});
// ─── DELETE appointment ────────────────────────────────────────────────────────
// Frees the linked slot on deletion.
router.delete('/:id', (req, res) => {
    const existing = db_1.default.prepare('SELECT * FROM appointments WHERE id = ?').get(req.params.id);
    if (!existing)
        return res.status(404).json({ error: 'Appointment not found' });
    if (isPatient(req) && existing.user_id !== req.user.id) {
        return res.status(403).json({ error: 'You can only cancel your own appointments' });
    }
    // Free the slot before deleting
    setSlotBooked(existing.availability_id, 0);
    db_1.default.prepare('DELETE FROM appointments WHERE id = ?').run(req.params.id);
    res.json({ message: 'Appointment deleted' });
});
exports.default = router;
