import { Router, Request, Response } from 'express';
import db from '../db';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

type Role = 'admin' | 'doctor' | 'patient';

// ─── GET /api/availability ────────────────────────────────────────────────────
// • Doctor: sees ALL their own slots (any is_booked value)
// • Patient / Admin: sees only FREE slots (is_booked = 0)
// Optional query params: ?doctor_id=1&date=2025-06-01
router.get('/', (req: Request, res: Response) => {
    const { doctor_id, date } = req.query;
    const role: Role = req.user!.role as Role;
    const isDoctor = role === 'doctor';

    let query = isDoctor
        ? `SELECT da.*, d.name as doctor_name, d.specialization
           FROM doctor_availability da
           JOIN doctors d ON da.doctor_id = d.id
           WHERE da.doctor_id IN (
             SELECT id FROM doctors WHERE name = (SELECT name FROM users WHERE id = ?)
           )`
        : `SELECT da.*, d.name as doctor_name, d.specialization
           FROM doctor_availability da
           JOIN doctors d ON da.doctor_id = d.id
           WHERE da.is_booked = 0`;

    const params: (string | number)[] = isDoctor ? [req.user!.id] : [];

    if (doctor_id) {
        query += ` AND da.doctor_id = ?`;
        params.push(Number(doctor_id));
    }
    if (date) {
        query += ` AND da.date = ?`;
        params.push(String(date));
    }
    query += ` ORDER BY da.date, da.start_time`;

    res.json(db.prepare(query).all(...params));
});

// ─── POST /api/availability ───────────────────────────────────────────────────
// Doctor-only: create an availability slot
router.post('/', (req: Request, res: Response) => {
    if (req.user!.role !== 'doctor' && req.user!.role !== 'admin') {
        return res.status(403).json({ error: 'Only doctors can create availability slots' });
    }
    const { doctor_id, date, start_time, end_time } = req.body;
    if (!doctor_id || !date || !start_time || !end_time) {
        return res.status(400).json({ error: 'doctor_id, date, start_time, end_time are required' });
    }
    // Verify doctor exists
    const doctor = db.prepare('SELECT id FROM doctors WHERE id = ?').get(doctor_id);
    if (!doctor) return res.status(404).json({ error: 'Doctor not found' });

    // Prevent duplicate overlapping slots for same doctor/date/time
    const clash = db.prepare(
        `SELECT id FROM doctor_availability
         WHERE doctor_id = ? AND date = ? AND start_time = ?`
    ).get(doctor_id, date, start_time);
    if (clash) return res.status(409).json({ error: 'A slot already exists at that time' });

    const result = db.prepare(
        `INSERT INTO doctor_availability (doctor_id, date, start_time, end_time, is_booked)
         VALUES (?, ?, ?, ?, 0)`
    ).run(doctor_id, date, start_time, end_time);

    res.status(201).json(db.prepare('SELECT * FROM doctor_availability WHERE id = ?').get(result.lastInsertRowid));
});

// ─── DELETE /api/availability/:id ────────────────────────────────────────────
// Doctor-only: remove a slot (only if not booked)
router.delete('/:id', (req: Request, res: Response) => {
    if (req.user!.role !== 'doctor' && req.user!.role !== 'admin') {
        return res.status(403).json({ error: 'Only doctors/admins can remove slots' });
    }
    const slot = db.prepare('SELECT * FROM doctor_availability WHERE id = ?').get(req.params.id) as
        { id: number; doctor_id: number; is_booked: number } | undefined;

    if (!slot) return res.status(404).json({ error: 'Slot not found' });
    if (slot.is_booked) return res.status(409).json({ error: 'Cannot delete a booked slot' });

    db.prepare('DELETE FROM doctor_availability WHERE id = ?').run(req.params.id);
    res.json({ message: 'Slot deleted' });
});

export default router;
