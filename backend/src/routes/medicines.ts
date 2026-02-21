import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import db from '../db';

const router = Router();

// GET /api/medicines
// Public/Authenticated access for staff (doctors, pharmacy, admin)
router.get('/', authenticate, (req: Request, res: Response) => {
    // Return all medicines (or could filter by stock > 0, but doctors might want to see all)
    const medicines = db.prepare('SELECT * FROM medicines ORDER BY name ASC').all();
    res.json(medicines);
});

export default router;
