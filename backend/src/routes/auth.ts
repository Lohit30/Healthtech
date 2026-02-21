import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db';
import { JWT_SECRET } from '../middleware/auth';

const router = Router();

// POST /api/auth/register — patients only
router.post('/register', (req: Request, res: Response) => {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: 'name, email, and password are required' });
    }

    // Block non-patient registrations
    if (role && role !== 'patient') {
        return res.status(403).json({ error: 'Only patients can self-register' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
        return res.status(409).json({ error: 'Email already registered' });
    }

    const hashed = bcrypt.hashSync(password, 10);
    const result = db.prepare(
        'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)'
    ).run(name, email, hashed, 'patient');

    // Auto-create a matching patient profile row
    db.prepare(
        'INSERT INTO patients (user_id, name, risk_level) VALUES (?, ?, ?)'
    ).run(result.lastInsertRowid, name, 'low');

    const user = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(result.lastInsertRowid) as {
        id: number; name: string; email: string; role: string;
    };

    const token = jwt.sign({ id: user.id, name: user.name, email: user.email, role: user.role }, JWT_SECRET, {
        expiresIn: '7d',
    });

    res.status(201).json({ token, user });
});

// POST /api/auth/login — all roles
router.post('/login', (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'email and password are required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as {
        id: number; name: string; email: string; password: string; role: string;
    } | undefined;

    if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) {
        return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
        { id: user.id, name: user.name, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '7d' }
    );

    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

export default router;
