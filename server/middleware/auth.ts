import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'story_chain_secret';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
  };
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ message: '未提供认证令牌' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; username: string };
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: '无效的认证令牌' });
  }
};
