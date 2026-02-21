"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = __importDefault(require("../db"));
const router = (0, express_1.Router)();
// GET all doctors
router.get('/', (_req, res) => {
    const doctors = db_1.default.prepare('SELECT * FROM doctors ORDER BY name').all();
    res.json(doctors);
});
// POST add doctor
router.post('/', (req, res) => {
    const { name, specialization } = req.body;
    if (!name || !specialization) {
        return res.status(400).json({ error: 'name and specialization are required' });
    }
    const result = db_1.default.prepare('INSERT INTO doctors (name, specialization) VALUES (?, ?)').run(name, specialization);
    const newDoctor = db_1.default.prepare('SELECT * FROM doctors WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newDoctor);
});
exports.default = router;
