import type { Request, Response } from 'express';
import { queryOne } from '../db/database.js';
import { execute } from '../db/database.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { AuthRequest } from '../middleware/auth.js';

const JWT_SECRET = process.env.JWT_SECRET || 'story_chain_secret';

export const register = (req: Request, res: Response) => {
  const { username, password, email } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  try {
    const hash = bcrypt.hashSync(password, 10);
    execute('INSERT INTO users (username, password, email) VALUES (?, ?, ?)', [username, hash, email || null]);
    const user = queryOne('SELECT id, username, email FROM users WHERE username = ?', [username]);
    res.status(201).json(user);
  } catch (error) {
    return res.status(400).json({ message: 'Username or email already exists' });
  }
};

export const login = (req: Request, res: Response) => {
  const { username, password } = req.body;

  const user = queryOne('SELECT * FROM users WHERE username = ?', [username]);
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const isMatch = bcrypt.compareSync(password, user.password);
  if (!isMatch) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1d' });
  res.json({ token, user: { id: user.id, username: user.username, points: user.points } });
};

export const getUserProfile = (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;

  const user = queryOne('SELECT id, username, email, points, created_at FROM users WHERE id = ?', [userId]);
  
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  
  res.json(user);
};

export const updateUserProfile = (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const { email } = req.body;

  try {
    execute('UPDATE users SET email = ? WHERE id = ?', [email, userId]);
    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    return res.status(400).json({ message: 'Error updating profile' });
  }
};
