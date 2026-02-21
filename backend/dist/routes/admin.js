"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const db_1 = __importDefault(require("../db"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// POST /api/admin/create-doctor — admin only
router.post('/create-doctor', auth_1.authenticate, (0, auth_1.requireRole)('admin'), (req, res) => {
    const { name, email, password, specialization } = req.body;
    if (!name || !email || !password || !specialization) {
        return res.status(400).json({ error: 'name, email, password, and specialization are required' });
    }
    const existing = db_1.default.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
        return res.status(409).json({ error: 'Email already registered' });
    }
    const hashed = bcryptjs_1.default.hashSync(password, 10);
    // Create user account for doctor
    const userResult = db_1.default.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)').run(name, email, hashed, 'doctor');
    // Also add to doctors table for appointment scheduling
    const doctorResult = db_1.default.prepare('INSERT INTO doctors (name, specialization) VALUES (?, ?)').run(name, specialization);
    res.status(201).json({
        message: 'Doctor account created',
        user: { id: userResult.lastInsertRowid, name, email, role: 'doctor' },
        doctor: { id: doctorResult.lastInsertRowid, name, specialization },
    });
});
// GET /api/admin/users — admin only, list all users
router.get('/users', auth_1.authenticate, (0, auth_1.requireRole)('admin'), (_req, res) => {
    const users = db_1.default.prepare('SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC').all();
    res.json(users);
});
exports.default = router;
