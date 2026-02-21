"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JWT_SECRET = void 0;
exports.authenticate = authenticate;
exports.requireRole = requireRole;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
exports.JWT_SECRET = process.env.JWT_SECRET || 'ruralcare_jwt_secret_2024';
// Verify JWT and attach user to request
function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const payload = jsonwebtoken_1.default.verify(token, exports.JWT_SECRET);
        req.user = payload;
        next();
    }
    catch {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}
// Only allow specific roles
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user)
            return res.status(401).json({ error: 'Not authenticated' });
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: `Access denied. Required role: ${roles.join(' or ')}` });
        }
        next();
    };
}
