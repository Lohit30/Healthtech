"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = __importDefault(require("../db"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// POST /api/auth/register — patients only
router.post('/register', (req, res) => {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ error: 'name, email, and password are required' });
    }
    // Block non-patient registrations
    if (role && role !== 'patient') {
        return res.status(403).json({ error: 'Only patients can self-register' });
    }
    const existing = db_1.default.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
        return res.status(409).json({ error: 'Email already registered' });
    }
    const hashed = bcryptjs_1.default.hashSync(password, 10);
    const result = db_1.default.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)').run(name, email, hashed, 'patient');
    // Auto-create a matching patient profile row
    db_1.default.prepare('INSERT INTO patients (user_id, name, risk_level) VALUES (?, ?, ?)').run(result.lastInsertRowid, name, 'low');
    const user = db_1.default.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(result.lastInsertRowid);
    const token = jsonwebtoken_1.default.sign({ id: user.id, name: user.name, email: user.email, role: user.role }, auth_1.JWT_SECRET, {
        expiresIn: '7d',
    });
    res.status(201).json({ token, user });
});
// POST /api/auth/login — all roles
router.post('/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'email and password are required' });
    }
    const user = db_1.default.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
    }
    const valid = bcryptjs_1.default.compareSync(password, user.password);
    if (!valid) {
        return res.status(401).json({ error: 'Invalid email or password' });
    }
    const token = jsonwebtoken_1.default.sign({ id: user.id, name: user.name, email: user.email, role: user.role }, auth_1.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});
exports.default = router;
