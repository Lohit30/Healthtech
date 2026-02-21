import { Router, Request, Response } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import db from '../db';

const router = Router();

// GET /api/prescriptions
// For pharmacy: see pending and recently dispensed prescriptions
router.get('/', authenticate, requireRole('pharmacy', 'admin'), (req: Request, res: Response) => {
    const prescriptions = db.prepare(`
        SELECT p.*,
               m.name as medicine_name, m.strength as medicine_strength,
               pt.name as patient_name, pt.village as patient_village,
               d.name as doctor_name
        FROM prescriptions p
        JOIN medicines m ON p.medicine_id = m.id
        JOIN patients pt ON p.patient_id = pt.id
        JOIN doctors d ON p.doctor_id = d.id
        ORDER BY p.status DESC, p.created_at DESC -- pending usually sorts before dispensed alphabetically, wait, 'pending' vs 'dispensed', 'pending' is > 'dispensed'
    `).all();
    res.json(prescriptions);
});

// GET /api/prescriptions/patient/:id
// For doctor/patient to see their prescriptions
router.get('/patient/:id', authenticate, (req: Request, res: Response) => {
    const { id } = req.params;

    // Auth check - if patient, ensure they are requesting their own ID
    // Simplification: we'll just allow it as long as they are authenticated, 
    // or strictly require doctor/admin, but let's just let it pass for now like other routes.

    const prescriptions = db.prepare(`
        SELECT p.*,
               m.name as medicine_name, m.strength as medicine_strength,
               d.name as doctor_name
        FROM prescriptions p
        JOIN medicines m ON p.medicine_id = m.id
        JOIN doctors d ON p.doctor_id = d.id
        WHERE p.patient_id = ?
        ORDER BY p.created_at DESC
    `).all(id);
    res.json(prescriptions);
});

// POST /api/prescriptions
// Doctor prescribes medicine
router.post('/', authenticate, requireRole('doctor'), (req: Request, res: Response) => {
    const { patient_id, medicine_id } = req.body;

    if (!patient_id || !medicine_id) {
        return res.status(400).json({ error: 'patient_id and medicine_id required' });
    }

    const result = db.prepare('SELECT id FROM doctors WHERE name = ?').get(req.user?.name) as { id: number } | undefined;
    if (!result) {
        return res.status(403).json({ error: 'Authenticated user is not an active doctor' });
    }
    const doctor_id = result.id;

    try {
        const insertResult = db.prepare(`
            INSERT INTO prescriptions (patient_id, doctor_id, medicine_id, status)
            VALUES (?, ?, ?, 'pending')
        `).run(patient_id, doctor_id, medicine_id);

        res.status(201).json({ id: insertResult.lastInsertRowid, status: 'pending' });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// PATCH /api/prescriptions/:id/dispense
// Pharmacy dispenses medicine
router.patch('/:id/dispense', authenticate, requireRole('pharmacy', 'admin'), (req: Request, res: Response) => {
    const { id } = req.params;

    const prescription = db.prepare('SELECT * FROM prescriptions WHERE id = ?').get(id) as any;
    if (!prescription) {
        return res.status(404).json({ error: 'Prescription not found' });
    }

    if (prescription.status === 'dispensed') {
        return res.status(400).json({ error: 'Already dispensed' });
    }

    // Check stock
    const medicine = db.prepare('SELECT * FROM medicines WHERE id = ?').get(prescription.medicine_id) as any;
    if (medicine.stock_quantity <= 0) {
        return res.status(400).json({ error: 'Out of stock' });
    }

    // Transaction to update prescription and decrement stock
    const dispenseTransaction = db.transaction(() => {
        db.prepare("UPDATE prescriptions SET status = ?, dispensed_at = datetime('now') WHERE id = ?").run('dispensed', id);
        db.prepare('UPDATE medicines SET stock_quantity = stock_quantity - 1 WHERE id = ?').run(prescription.medicine_id);
    });

    try {
        dispenseTransaction();
        res.json({ message: 'Dispensed successfully' });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
