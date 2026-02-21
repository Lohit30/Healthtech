"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = __importDefault(require("../db"));
const router = (0, express_1.Router)();
// GET all patients
router.get('/', (_req, res) => {
    const patients = db_1.default.prepare('SELECT * FROM patients ORDER BY created_at DESC').all();
    res.json(patients);
});
// GET single patient
router.get('/:id', (req, res) => {
    const patient = db_1.default.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id);
    if (!patient)
        return res.status(404).json({ error: 'Patient not found' });
    res.json(patient);
});
// POST create patient
router.post('/', (req, res) => {
    const { name, age, gender, village, symptoms, vitals, risk_level } = req.body;
    if (!name || !age || !gender || !village || !symptoms || !vitals || !risk_level) {
        return res.status(400).json({ error: 'All fields are required' });
    }
    const result = db_1.default.prepare(`INSERT INTO patients (name, age, gender, village, symptoms, vitals, risk_level)
     VALUES (?, ?, ?, ?, ?, ?, ?)`).run(name, age, gender, village, symptoms, vitals, risk_level);
    const newPatient = db_1.default.prepare('SELECT * FROM patients WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newPatient);
});
// PUT update patient
router.put('/:id', (req, res) => {
    const { name, age, gender, village, symptoms, vitals, risk_level } = req.body;
    const existing = db_1.default.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id);
    if (!existing)
        return res.status(404).json({ error: 'Patient not found' });
    db_1.default.prepare(`UPDATE patients SET name=?, age=?, gender=?, village=?, symptoms=?, vitals=?, risk_level=?
     WHERE id=?`).run(name, age, gender, village, symptoms, vitals, risk_level, req.params.id);
    const updated = db_1.default.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id);
    res.json(updated);
});
// DELETE patient
router.delete('/:id', (req, res) => {
    const existing = db_1.default.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id);
    if (!existing)
        return res.status(404).json({ error: 'Patient not found' });
    db_1.default.prepare('DELETE FROM patients WHERE id = ?').run(req.params.id);
    res.json({ message: 'Patient deleted' });
});
exports.default = router;
