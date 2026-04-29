import type { Request, Response } from 'express';
import { queryAll, queryOne, execute } from '../db/database.js';
import type { AuthRequest } from '../middleware/auth.js';

export const addNode = (req: AuthRequest, res: Response) => {
  const { story_id, parent_id, content } = req.body;
  const author_id = req.user?.id;

  const story = queryOne('SELECT status, current_nodes, max_nodes FROM stories WHERE id = ?', [story_id]);
  
  if (!story) {
    return res.status(404).json({ message: 'Story not found' });
  }

  if (story.status !== 'ongoing') {
    return res.status(400).json({ message: 'Story is not accepting new nodes' });
  }

  if (story.current_nodes >= story.max_nodes) {
    return res.status(400).json({ message: 'Story has reached maximum nodes' });
  }

  try {
    execute('INSERT INTO story_nodes (story_id, parent_id, content, author_id) VALUES (?, ?, ?, ?)', [story_id, parent_id || null, content, author_id]);
    execute('UPDATE stories SET current_nodes = current_nodes + 1 WHERE id = ?', [story_id]);
    const node = queryOne('SELECT id FROM story_nodes WHERE story_id = ? AND author_id = ? ORDER BY id DESC LIMIT 1', [story_id, author_id]);
    res.status(201).json({ id: node?.id });
  } catch (error) {
    return res.status(400).json({ message: 'Error adding node' });
  }
};

export const getNodesByStory = (req: Request, res: Response) => {
  const { story_id } = req.params;

  const nodes = queryAll('SELECT * FROM story_nodes WHERE story_id = ? ORDER BY created_at ASC', [story_id]) as any[];

  res.json(nodes);
};

export const selectNode = (req: AuthRequest, res: Response) => {
  const { node_id } = req.params;
  const user_id = req.user?.id;

  const node = queryOne('SELECT id, story_id FROM story_nodes WHERE id = ?', [node_id]);
  
  if (!node) {
    return res.status(404).json({ message: 'Node not found' });
  }

  const story = queryOne('SELECT author_id, current_nodes, max_nodes FROM stories WHERE id = ?', [node.story_id]);
  
  if (!story) {
    return res.status(404).json({ message: 'Story not found' });
  }

  if (story.author_id !== user_id) {
    return res.status(403).json({ message: 'Only story author can select nodes' });
  }

  execute('UPDATE story_nodes SET is_selected = FALSE WHERE story_id = ?', [node.story_id]);
  execute('UPDATE story_nodes SET is_selected = TRUE WHERE id = ?', [node_id]);

  const newStatus = story.current_nodes >= story.max_nodes ? 'completed' : 'ongoing';
  execute('UPDATE stories SET status = ? WHERE id = ?', [newStatus, node.story_id]);

  calculatePoints(node.story_id);
  res.json({ message: 'Node selected successfully' });
};

const calculatePoints = (story_id: number) => {
  const story = queryOne('SELECT views, author_id FROM stories WHERE id = ?', [story_id]);
  if (!story) return;

  const authorPoints = Math.floor(story.views / 10);
  execute('UPDATE users SET points = points + ? WHERE id = ?', [authorPoints, story.author_id]);

  const nodes = queryAll('SELECT author_id, coins FROM story_nodes WHERE story_id = ? AND is_selected = TRUE', [story_id]) as any[];

  if (!nodes.length) return;

  const totalCoins = nodes.reduce((sum: number, node: any) => sum + (node.coins || 0), 0);
  nodes.forEach((node: any) => {
    const nodePoints = totalCoins > 0 ? Math.floor((node.coins / totalCoins) * 100) : 0;
    execute('UPDATE users SET points = points + ? WHERE id = ?', [nodePoints, node.author_id]);
  });
};
