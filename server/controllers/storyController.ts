import type { Request, Response } from 'express';
import { queryAll, queryOne, execute } from '../db/database.js';
import type { AuthRequest } from '../middleware/auth.js';

export const createStory = (req: AuthRequest, res: Response) => {
  const { title, summary, content, mode, max_nodes, team_id, competition_id } = req.body;
  const author_id = req.user?.id;

  const resolvedMode = mode || 'free';
  let resolvedMaxNodes = max_nodes || 5;
  let resolvedTeamId: number | null = null;
  let resolvedCompetitionId: number | null = null;

  if (resolvedMode === 'solo') {
    resolvedMaxNodes = 1;
  }

  if (resolvedMode === 'team') {
    if (!team_id) {
      return res.status(400).json({ message: 'Team mode requires a team_id' });
    }
    const member = queryOne('SELECT id FROM team_members WHERE team_id = ? AND user_id = ? AND role = ?', [team_id, author_id, 'leader']);
    if (!member) {
      return res.status(403).json({ message: 'Only team leader can create team stories' });
    }
    resolvedTeamId = team_id;
    resolvedCompetitionId = competition_id || null;
  }

  try {
    execute('INSERT INTO stories (title, summary, content, author_id, mode, max_nodes, team_id, competition_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [title, summary, content, author_id, resolvedMode, resolvedMaxNodes, resolvedTeamId, resolvedCompetitionId]);
    const story = queryOne('SELECT id FROM stories WHERE title = ? AND author_id = ? ORDER BY id DESC LIMIT 1', [title, author_id]);
    if (!story) throw new Error('Story not created');

    execute('INSERT INTO story_nodes (story_id, content, author_id) VALUES (?, ?, ?)', [story.id, content, author_id]);

    res.status(201).json({ id: story.id });
  } catch (error: any) {
    const errMsg = error?.message || error?.toString() || 'Unknown error';
    return res.status(400).json({ message: `Error creating story: ${errMsg}` });
  }
};

export const getStories = (req: Request, res: Response) => {
  const { status, mode, sort_by, page = 1, limit = 10 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  let query = 'SELECT * FROM stories WHERE 1=1';
  const params: any[] = [];

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  if (mode) {
    query += ' AND mode = ?';
    params.push(mode);
  }

  if (sort_by === 'hot') {
    query += ' ORDER BY (likes + favorites) DESC';
  } else {
    query += ' ORDER BY created_at DESC';
  }

  query += ' LIMIT ? OFFSET ?';
  params.push(Number(limit), offset);

  const stories = queryAll(query, params) as any[];

  res.json(stories);
};

export const getStoryById = (req: Request, res: Response) => {
  const { id } = req.params;

  const story = queryOne('SELECT * FROM stories WHERE id = ?', [id]);
  
  if (!story) {
    return res.status(404).json({ message: 'Story not found' });
  }

  execute('UPDATE stories SET views = views + 1 WHERE id = ?', [id]);
  story.views = (story.views || 0) + 1;

  const nodes = queryAll('SELECT * FROM story_nodes WHERE story_id = ? ORDER BY created_at ASC', [id]) as any[];

  res.json({ ...story, nodes });
};

export const updateStory = (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { title, summary, status, mode } = req.body;
  const author_id = req.user?.id;

  if (mode) {
    return res.status(400).json({ message: 'Story mode cannot be changed after creation' });
  }

  const story = queryOne('SELECT * FROM stories WHERE id = ? AND author_id = ?', [id, author_id]);

  if (!story) {
    return res.status(404).json({ message: 'Story not found or not authorized' });
  }

  try {
    const publishedAt = status === 'published' ? new Date().toISOString() : null;
    execute('UPDATE stories SET title = ?, summary = ?, status = ?, published_at = ? WHERE id = ?',
      [title, summary, status, publishedAt, id]);
    res.json({ message: 'Story updated successfully' });
  } catch (error) {
    return res.status(400).json({ message: 'Error updating story' });
  }
};

export const deleteStory = (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const author_id = req.user?.id;

  const story = queryOne('SELECT id FROM stories WHERE id = ? AND author_id = ?', [id, author_id]);

  if (!story) {
    return res.status(404).json({ message: 'Story not found or not authorized' });
  }

  execute('DELETE FROM story_nodes WHERE story_id = ?', [id]);
  execute('DELETE FROM stories WHERE id = ?', [id]);

  res.json({ message: 'Story deleted successfully' });
};

export const getMyStories = (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;

  const stories = queryAll(`
    SELECT * FROM stories WHERE author_id = ?
    ORDER BY created_at DESC
  `, [userId]) as any[];

  res.json(stories);
};

export const searchStories = (req: Request, res: Response) => {
  const { q } = req.query;

  if (!q) {
    const stories = queryAll('SELECT * FROM stories WHERE status = ? ORDER BY created_at DESC', ['published']) as any[];
    return res.json(stories);
  }

  const searchTerm = `%${q}%`;
  const stories = queryAll(`
    SELECT * FROM stories
    WHERE (title LIKE ? OR summary LIKE ?)
    AND status = ?
    ORDER BY created_at DESC
  `, [searchTerm, searchTerm, 'published']) as any[];

  res.json(stories);
};
