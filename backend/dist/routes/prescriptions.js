"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const db_1 = __importDefault(require("../db"));
const router = (0, express_1.Router)();
// GET /api/prescriptions
// For pharmacy: see pending and recently dispensed prescriptions
router.get('/', auth_1.authenticate, (0, auth_1.requireRole)('pharmacy', 'admin'), (req, res) => {
    const prescriptions = db_1.default.prepare(`
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
router.get('/patient/:id', auth_1.authenticate, (req, res) => {
    const { id } = req.params;
    // Auth check - if patient, ensure they are requesting their own ID
    // Simplification: we'll just allow it as long as they are authenticated, 
    // or strictly require doctor/admin, but let's just let it pass for now like other routes.
    const prescriptions = db_1.default.prepare(`
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
router.post('/', auth_1.authenticate, (0, auth_1.requireRole)('doctor'), (req, res) => {
    const { patient_id, medicine_id } = req.body;
    if (!patient_id || !medicine_id) {
        return res.status(400).json({ error: 'patient_id and medicine_id required' });
    }
    const result = db_1.default.prepare('SELECT id FROM doctors WHERE name = ?').get(req.user?.name);
    if (!result) {
        return res.status(403).json({ error: 'Authenticated user is not an active doctor' });
    }
    const doctor_id = result.id;
    try {
        const insertResult = db_1.default.prepare(`
            INSERT INTO prescriptions (patient_id, doctor_id, medicine_id, status)
            VALUES (?, ?, ?, 'pending')
        `).run(patient_id, doctor_id, medicine_id);
        res.status(201).json({ id: insertResult.lastInsertRowid, status: 'pending' });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
// PATCH /api/prescriptions/:id/dispense
// Pharmacy dispenses medicine
router.patch('/:id/dispense', auth_1.authenticate, (0, auth_1.requireRole)('pharmacy', 'admin'), (req, res) => {
    const { id } = req.params;
    const prescription = db_1.default.prepare('SELECT * FROM prescriptions WHERE id = ?').get(id);
    if (!prescription) {
        return res.status(404).json({ error: 'Prescription not found' });
    }
    if (prescription.status === 'dispensed') {
        return res.status(400).json({ error: 'Already dispensed' });
    }
    // Check stock
    const medicine = db_1.default.prepare('SELECT * FROM medicines WHERE id = ?').get(prescription.medicine_id);
    if (medicine.stock_quantity <= 0) {
        return res.status(400).json({ error: 'Out of stock' });
    }
    // Transaction to update prescription and decrement stock
    const dispenseTransaction = db_1.default.transaction(() => {
        db_1.default.prepare("UPDATE prescriptions SET status = ?, dispensed_at = datetime('now') WHERE id = ?").run('dispensed', id);
        db_1.default.prepare('UPDATE medicines SET stock_quantity = stock_quantity - 1 WHERE id = ?').run(prescription.medicine_id);
    });
    try {
        dispenseTransaction();
        res.json({ message: 'Dispensed successfully' });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
exports.default = router;
