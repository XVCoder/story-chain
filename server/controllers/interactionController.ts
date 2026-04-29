import type { Request, Response } from 'express';
import { queryAll, queryOne, execute } from '../db/database.js';
import type { AuthRequest } from '../middleware/auth.js';

export const likeStory = (req: AuthRequest, res: Response) => {
  const { story_id } = req.params;
  const user_id = req.user?.id;

  const like = queryOne('SELECT id FROM likes WHERE user_id = ? AND story_id = ?', [user_id, story_id]);

  if (like) {
    execute('DELETE FROM likes WHERE user_id = ? AND story_id = ?', [user_id, story_id]);
    execute('UPDATE stories SET likes = likes - 1 WHERE id = ?', [story_id]);
    res.json({ message: 'Like removed' });
  } else {
    execute('INSERT INTO likes (user_id, story_id) VALUES (?, ?)', [user_id, story_id]);
    execute('UPDATE stories SET likes = likes + 1 WHERE id = ?', [story_id]);
    res.json({ message: 'Like added' });
  }
};

export const favoriteStory = (req: AuthRequest, res: Response) => {
  const { story_id } = req.params;
  const user_id = req.user?.id;

  const favorite = queryOne('SELECT id FROM favorites WHERE user_id = ? AND story_id = ?', [user_id, story_id]);

  if (favorite) {
    execute('DELETE FROM favorites WHERE user_id = ? AND story_id = ?', [user_id, story_id]);
    execute('UPDATE stories SET favorites = favorites - 1 WHERE id = ?', [story_id]);
    res.json({ message: 'Favorite removed' });
  } else {
    execute('INSERT INTO favorites (user_id, story_id) VALUES (?, ?)', [user_id, story_id]);
    execute('UPDATE stories SET favorites = favorites + 1 WHERE id = ?', [story_id]);
    res.json({ message: 'Favorite added' });
  }
};

export const coinNode = (req: AuthRequest, res: Response) => {
  const { node_id } = req.params;
  const user_id = req.user?.id;
  const { amount = 1 } = req.body;

  const user = queryOne('SELECT points FROM users WHERE id = ?', [user_id]);
  
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  
  if (user.points < amount) {
    return res.status(400).json({ message: 'Insufficient points' });
  }

  execute('UPDATE users SET points = points - ? WHERE id = ?', [amount, user_id]);

  const coin = queryOne('SELECT id FROM coins WHERE user_id = ? AND node_id = ?', [user_id, node_id]);

  if (coin) {
    execute('UPDATE coins SET amount = amount + ? WHERE user_id = ? AND node_id = ?', [amount, user_id, node_id]);
  } else {
    execute('INSERT INTO coins (user_id, node_id, amount) VALUES (?, ?, ?)', [user_id, node_id, amount]);
  }

  execute('UPDATE story_nodes SET coins = coins + ? WHERE id = ?', [amount, node_id]);

  res.json({ message: 'Coins added' });
};

export const getUserFavorites = (req: AuthRequest, res: Response) => {
  const user_id = req.user?.id;

  const favRows = queryAll('SELECT story_id FROM favorites WHERE user_id = ?', [user_id]) as any[];

  if (!favRows.length) {
    return res.json([]);
  }

  const storyIds = favRows.map((row: any) => row.story_id);
  const placeholders = storyIds.map(() => '?').join(',');
  const stories = queryAll(`SELECT * FROM stories WHERE id IN (${placeholders})`, storyIds) as any[];

  res.json(stories);
};
