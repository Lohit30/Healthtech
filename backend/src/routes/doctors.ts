import { Router, Request, Response } from 'express';
import db from '../db';

const router = Router();

// GET all doctors
router.get('/', (_req: Request, res: Response) => {
    const doctors = db.prepare('SELECT * FROM doctors ORDER BY name').all();
    res.json(doctors);
});

// POST add doctor
router.post('/', (req: Request, res: Response) => {
    const { name, specialization } = req.body;
    if (!name || !specialization) {
        return res.status(400).json({ error: 'name and specialization are required' });
    }
    const result = db.prepare('INSERT INTO doctors (name, specialization) VALUES (?, ?)').run(name, specialization);
    const newDoctor = db.prepare('SELECT * FROM doctors WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newDoctor);
});

export default router;
