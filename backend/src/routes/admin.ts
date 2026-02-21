import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

// POST /api/admin/create-doctor — admin only
router.post('/create-doctor', authenticate, requireRole('admin'), (req: Request, res: Response) => {
    const { name, email, password, specialization } = req.body;

    if (!name || !email || !password || !specialization) {
        return res.status(400).json({ error: 'name, email, password, and specialization are required' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
        return res.status(409).json({ error: 'Email already registered' });
    }

    const hashed = bcrypt.hashSync(password, 10);

    // Create user account for doctor
    const userResult = db.prepare(
        'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)'
    ).run(name, email, hashed, 'doctor');

    // Also add to doctors table for appointment scheduling
    const doctorResult = db.prepare(
        'INSERT INTO doctors (name, specialization) VALUES (?, ?)'
    ).run(name, specialization);

    res.status(201).json({
        message: 'Doctor account created',
        user: { id: userResult.lastInsertRowid, name, email, role: 'doctor' },
        doctor: { id: doctorResult.lastInsertRowid, name, specialization },
    });
});

// GET /api/admin/users — admin only, list all users
router.get('/users', authenticate, requireRole('admin'), (_req: Request, res: Response) => {
    const users = db.prepare('SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC').all();
    res.json(users);
});

export default router;
