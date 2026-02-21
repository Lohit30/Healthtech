import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const JWT_SECRET = process.env.JWT_SECRET || 'ruralcare_jwt_secret_2024';

export interface AuthPayload {
    id: number;
    name: string;
    email: string;
    role: 'admin' | 'doctor' | 'patient' | 'pharmacy';
}

// Extend Express Request to carry user info
declare global {
    namespace Express {
        interface Request {
            user?: AuthPayload;
        }
    }
}

// Verify JWT and attach user to request
export function authenticate(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const payload = jwt.verify(token, JWT_SECRET) as AuthPayload;
        req.user = payload;
        next();
    } catch {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

// Only allow specific roles
export function requireRole(...roles: AuthPayload['role'][]) {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: `Access denied. Required role: ${roles.join(' or ')}` });
        }
        next();
    };
}
