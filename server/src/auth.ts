import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';

export const loginSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
});

export const registerSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
  role: z.enum(['admin', 'technician']).default('technician'),
  name: z.string().min(2),
});

export interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
    role: string;
    customer_id?: number;
  };
}

export const generateToken = (user: { id: number; username: string; role: string; customer_id?: number }) => {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '1d' });
};

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

export const adminOnly = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Admins only' });
  }
  next();
};

export const hashPassword = async (password: string) => {
  return await bcrypt.hash(password, 10);
};

export const comparePassword = async (password: string, hash: string) => {
  return await bcrypt.compare(password, hash);
};
