import type { Request, Response } from 'express';
import { queryOne, queryAll } from '../db/database.js';
import { execute } from '../db/database.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { AuthRequest } from '../middleware/auth.js';

const JWT_SECRET = process.env.JWT_SECRET || 'story_chain_secret';

export const register = (req: Request, res: Response) => {
  const { username, password, email } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ message: '用户名和密码为必填项' });
  }

  if (username.length < 3) {
    return res.status(400).json({ message: '用户名至少需要3个字符' });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: '密码至少需要6个字符' });
  }

  try {
    const hash = bcrypt.hashSync(password, 10);
    const initialPoints = 100;
    execute('INSERT INTO users (username, password, email, points) VALUES (?, ?, ?, ?)', [username, hash, email || null, initialPoints]);
    const user = queryOne('SELECT id, username, email, points FROM users WHERE username = ?', [username]);
    res.status(201).json(user);
  } catch (error) {
    return res.status(400).json({ message: '用户名或邮箱已存在' });
  }
};

export const login = (req: Request, res: Response) => {
  const { username, password } = req.body;

  const user = queryOne('SELECT * FROM users WHERE username = ?', [username]);
  if (!user) {
    return res.status(401).json({ message: '用户名或密码错误' });
  }

  const isMatch = bcrypt.compareSync(password, user.password);
  if (!isMatch) {
    return res.status(401).json({ message: '用户名或密码错误' });
  }

  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1d' });
  res.json({ token, user: { id: user.id, username: user.username, points: user.points, email: user.email } });
};

export const getUserProfile = (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;

  const user = queryOne('SELECT id, username, email, points, created_at FROM users WHERE id = ?', [userId]);
  
  if (!user) {
    return res.status(404).json({ message: '用户不存在' });
  }
  
  res.json(user);
};

export const updateUserProfile = (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const { email } = req.body;

  try {
    execute('UPDATE users SET email = ? WHERE id = ?', [email, userId]);
    res.json({ message: '个人资料更新成功' });
  } catch (error) {
    return res.status(400).json({ message: '更新个人资料失败' });
  }
};

export const checkIn = (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: '请先登录' });
  }

  const today = new Date().toISOString().split('T')[0];

  try {
    const existing = queryOne('SELECT id FROM check_ins WHERE user_id = ? AND check_date = ?', [userId, today]);

    if (existing) {
      return res.status(400).json({ message: '今日已签到' });
    }

    const pointsAwarded = 10;
    execute('INSERT INTO check_ins (user_id, check_date, points_awarded) VALUES (?, ?, ?)', [userId, today, pointsAwarded]);
    execute('UPDATE users SET points = points + ? WHERE id = ?', [pointsAwarded, userId]);

    res.json({ message: '签到成功', points_awarded: pointsAwarded });
  } catch (error) {
    return res.status(500).json({ message: '签到失败，请稍后重试' });
  }
};

export const getUserStats = (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;

  const createdStories = queryAll('SELECT COUNT(*) as count FROM stories WHERE author_id = ?', [userId]) as any[];
  const participatedStories = queryAll(`
    SELECT COUNT(DISTINCT story_id) as count FROM story_nodes WHERE author_id = ? AND story_id NOT IN (SELECT id FROM stories WHERE author_id = ?)
  `, [userId, userId]) as any[];
  const receivedCoins = queryAll('SELECT COALESCE(SUM(coins), 0) as total FROM story_nodes WHERE author_id = ?', [userId]) as any[];

  res.json({
    created_stories: createdStories[0]?.count || 0,
    participated_stories: participatedStories[0]?.count || 0,
    received_coins: receivedCoins[0]?.total || 0,
  });
};
