"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const db_1 = __importDefault(require("../db"));
const router = (0, express_1.Router)();
// GET /api/medicines
// Public/Authenticated access for staff (doctors, pharmacy, admin)
router.get('/', auth_1.authenticate, (req, res) => {
    // Return all medicines (or could filter by stock > 0, but doctors might want to see all)
    const medicines = db_1.default.prepare('SELECT * FROM medicines ORDER BY name ASC').all();
    res.json(medicines);
});
exports.default = router;
