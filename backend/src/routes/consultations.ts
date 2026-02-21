import { Router, Request, Response } from 'express';
import db from '../db';

const router = Router();

// GET all consultation notes (with patient name)
router.get('/', (_req: Request, res: Response) => {
    const notes = db.prepare(`
    SELECT cn.*, p.name as patient_name
    FROM consultation_notes cn
    JOIN patients p ON cn.patient_id = p.id
    ORDER BY cn.created_at DESC
  `).all();
    res.json(notes);
});

// GET notes for a specific patient
router.get('/patient/:patient_id', (req: Request, res: Response) => {
    const notes = db.prepare(`
    SELECT cn.*, p.name as patient_name
    FROM consultation_notes cn
    JOIN patients p ON cn.patient_id = p.id
    WHERE cn.patient_id = ?
    ORDER BY cn.created_at DESC
  `).all(req.params.patient_id);
    res.json(notes);
});

// POST add consultation note
router.post('/', (req: Request, res: Response) => {
    const { patient_id, raw_note, structured_summary, follow_up_days } = req.body;
    if (!patient_id || !raw_note) {
        return res.status(400).json({ error: 'patient_id and raw_note are required' });
    }
    const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(patient_id);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const result = db.prepare(
        `INSERT INTO consultation_notes (patient_id, raw_note, structured_summary, follow_up_days)
     VALUES (?, ?, ?, ?)`
    ).run(patient_id, raw_note, structured_summary || null, follow_up_days || null);
    const newNote = db.prepare('SELECT * FROM consultation_notes WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newNote);
});

// DELETE note
router.delete('/:id', (req: Request, res: Response) => {
    const existing = db.prepare('SELECT * FROM consultation_notes WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Note not found' });
    db.prepare('DELETE FROM consultation_notes WHERE id = ?').run(req.params.id);
    res.json({ message: 'Note deleted' });
});

export default router;
