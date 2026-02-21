import { Router, Request, Response } from 'express';
import db from '../db';

const router = Router();

// GET all patients
router.get('/', (_req: Request, res: Response) => {
    const patients = db.prepare('SELECT * FROM patients ORDER BY created_at DESC').all();
    res.json(patients);
});

// GET single patient
router.get('/:id', (req: Request, res: Response) => {
    const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    res.json(patient);
});

// POST create patient
router.post('/', (req: Request, res: Response) => {
    const { name, age, gender, village, symptoms, vitals, risk_level } = req.body;
    if (!name || !age || !gender || !village || !symptoms || !vitals || !risk_level) {
        return res.status(400).json({ error: 'All fields are required' });
    }
    const result = db.prepare(
        `INSERT INTO patients (name, age, gender, village, symptoms, vitals, risk_level)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(name, age, gender, village, symptoms, vitals, risk_level);
    const newPatient = db.prepare('SELECT * FROM patients WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newPatient);
});

// PUT update patient
router.put('/:id', (req: Request, res: Response) => {
    const { name, age, gender, village, symptoms, vitals, risk_level } = req.body;
    const existing = db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Patient not found' });
    db.prepare(
        `UPDATE patients SET name=?, age=?, gender=?, village=?, symptoms=?, vitals=?, risk_level=?
     WHERE id=?`
    ).run(name, age, gender, village, symptoms, vitals, risk_level, req.params.id);
    const updated = db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id);
    res.json(updated);
});

// DELETE patient
router.delete('/:id', (req: Request, res: Response) => {
    const existing = db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Patient not found' });
    db.prepare('DELETE FROM patients WHERE id = ?').run(req.params.id);
    res.json({ message: 'Patient deleted' });
});

export default router;
