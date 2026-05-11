import type { Request, Response } from 'express';
import { queryAll, queryOne, execute } from '../db/database.js';
import type { AuthRequest } from '../middleware/auth.js';
import { autoSelectMainLineInternal } from './nodeController.js';

export const likeStory = (req: AuthRequest, res: Response) => {
  const { story_id } = req.params;
  const user_id = req.user?.id;

  const like = queryOne('SELECT id FROM likes WHERE user_id = ? AND story_id = ?', [user_id, story_id]);

  if (like) {
    execute('DELETE FROM likes WHERE user_id = ? AND story_id = ?', [user_id, story_id]);
    execute('UPDATE stories SET likes = likes - 1 WHERE id = ?', [story_id]);
    res.json({ message: '已取消点赞' });
  } else {
    execute('INSERT INTO likes (user_id, story_id) VALUES (?, ?)', [user_id, story_id]);
    execute('UPDATE stories SET likes = likes + 1 WHERE id = ?', [story_id]);
    res.json({ message: '点赞成功' });
  }
};

export const favoriteStory = (req: AuthRequest, res: Response) => {
  const { story_id } = req.params;
  const user_id = req.user?.id;

  const favorite = queryOne('SELECT id FROM favorites WHERE user_id = ? AND story_id = ?', [user_id, story_id]);

  if (favorite) {
    execute('DELETE FROM favorites WHERE user_id = ? AND story_id = ?', [user_id, story_id]);
    execute('UPDATE stories SET favorites = favorites - 1 WHERE id = ?', [story_id]);
    res.json({ message: '已取消收藏' });
  } else {
    execute('INSERT INTO favorites (user_id, story_id) VALUES (?, ?)', [user_id, story_id]);
    execute('UPDATE stories SET favorites = favorites + 1 WHERE id = ?', [story_id]);
    res.json({ message: '收藏成功' });
  }
};

export const coinNode = (req: AuthRequest, res: Response) => {
  const { node_id } = req.params;
  const user_id = req.user?.id;
  const { amount = 1 } = req.body;

  if (!Number.isInteger(amount) || amount <= 0) {
    return res.status(400).json({ message: '投币数量必须为正整数' });
  }

  if (amount > 5) {
    return res.status(400).json({ message: '单次投币不能超过5个' });
  }

  const node = queryOne('SELECT id, story_id FROM story_nodes WHERE id = ?', [node_id]);

  if (!node) {
    return res.status(404).json({ message: '节点不存在' });
  }

  const user = queryOne('SELECT points FROM users WHERE id = ?', [user_id]);

  if (!user) {
    return res.status(404).json({ message: '用户不存在' });
  }

  if (user.points < amount) {
    return res.status(400).json({ message: '积分不足' });
  }

  const today = new Date().toISOString().split('T')[0];
  const dailyCoin = queryOne('SELECT daily_amount FROM daily_coins WHERE user_id = ? AND node_id = ? AND coin_date = ?', [user_id, node_id, today]);

  if (dailyCoin && dailyCoin.daily_amount + amount > 5) {
    return res.status(400).json({ message: '该节点今日投币已达上限（最多5个）' });
  }

  execute('UPDATE users SET points = points - ? WHERE id = ?', [amount, user_id]);

  if (dailyCoin) {
    execute('UPDATE daily_coins SET daily_amount = daily_amount + ? WHERE user_id = ? AND node_id = ? AND coin_date = ?', [amount, user_id, node_id, today]);
  } else {
    execute('INSERT INTO daily_coins (user_id, node_id, coin_date, daily_amount) VALUES (?, ?, ?, ?)', [user_id, node_id, today, amount]);
  }

  const coin = queryOne('SELECT id FROM coins WHERE user_id = ? AND node_id = ?', [user_id, node_id]);

  if (coin) {
    execute('UPDATE coins SET amount = amount + ? WHERE user_id = ? AND node_id = ?', [amount, user_id, node_id]);
  } else {
    execute('INSERT INTO coins (user_id, node_id, amount) VALUES (?, ?, ?)', [user_id, node_id, amount]);
  }

  execute('UPDATE story_nodes SET coins = coins + ? WHERE id = ?', [amount, node_id]);

  const selectedCount = autoSelectMainLineInternal(node.story_id);

  res.json({ message: '投币成功', timeline_nodes: selectedCount });
};

export const getUserFavorites = (req: AuthRequest, res: Response) => {
  const user_id = req.user?.id;

  const favRows = queryAll('SELECT story_id FROM favorites WHERE user_id = ?', [user_id]) as any[];

  if (!favRows.length) {
    return res.json([]);
  }

  const storyIds = favRows.map((row: any) => row.story_id);
  const placeholders = storyIds.map(() => '?').join(',');
  const stories = queryAll(`SELECT s.*, u.username AS author_name FROM stories s LEFT JOIN users u ON s.author_id = u.id WHERE s.id IN (${placeholders})`, storyIds) as any[];

  res.json(stories);
};
