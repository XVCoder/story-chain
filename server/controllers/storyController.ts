import type { Request, Response } from 'express';
import { queryAll, queryOne, execute } from '../db/database.js';
import type { AuthRequest } from '../middleware/auth.js';

export const createStory = (req: AuthRequest, res: Response) => {
  const { title, summary, content, mode, max_nodes, team_id, competition_id } = req.body;
  const author_id = req.user?.id;

  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ message: 'Title is required' });
  }
  if (!summary || typeof summary !== 'string' || !summary.trim()) {
    return res.status(400).json({ message: 'Summary is required' });
  }
  if (!content || typeof content !== 'string' || !content.trim()) {
    return res.status(400).json({ message: 'Content is required' });
  }

  const resolvedMode = mode || 'free';
  let resolvedMaxNodes = max_nodes !== undefined ? max_nodes : 5;
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
    execute('INSERT INTO stories (title, summary, content, author_id, mode, max_nodes, team_id, competition_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [title, summary, content, author_id, resolvedMode, resolvedMaxNodes, resolvedTeamId, resolvedCompetitionId, 'ongoing']);
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

  let query = 'SELECT s.*, u.username AS author_name FROM stories s LEFT JOIN users u ON s.author_id = u.id WHERE 1=1';
  const params: any[] = [];

  if (status) {
    query += ' AND s.status = ?';
    params.push(status);
  }

  if (mode) {
    query += ' AND s.mode = ?';
    params.push(mode);
  }

  if (sort_by === 'hot') {
    query += ' ORDER BY (s.likes + s.favorites) DESC';
  } else {
    query += ' ORDER BY s.created_at DESC';
  }

  query += ' LIMIT ? OFFSET ?';
  params.push(Number(limit), offset);

  const stories = queryAll(query, params) as any[];

  res.json(stories);
};

export const getStoryById = (req: Request, res: Response) => {
  const { id } = req.params;

  const story = queryOne(`
    SELECT s.*, u.username AS author_name
    FROM stories s
    LEFT JOIN users u ON s.author_id = u.id
    WHERE s.id = ?
  `, [id]);
  
  if (!story) {
    return res.status(404).json({ message: 'Story not found' });
  }

  execute('UPDATE stories SET views = views + 1 WHERE id = ?', [id]);
  story.views = (story.views || 0) + 1;

  const nodes = queryAll(`
    SELECT n.*, u.username AS author_name
    FROM story_nodes n
    LEFT JOIN users u ON n.author_id = u.id
    WHERE n.story_id = ?
    ORDER BY n.created_at ASC
  `, [id]) as any[];

  const participants = queryAll(`
    SELECT DISTINCT u.id, u.username
    FROM story_nodes n
    INNER JOIN users u ON n.author_id = u.id
    WHERE n.story_id = ?
    ORDER BY u.username ASC
  `, [id]) as any[];

  res.json({ ...story, nodes, participants });
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
    const updates: string[] = [];
    const params: any[] = [];

    if (title !== undefined) {
      updates.push('title = ?');
      params.push(title);
    }
    if (summary !== undefined) {
      updates.push('summary = ?');
      params.push(summary);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
      if (status === 'published') {
        updates.push('published_at = ?');
        params.push(new Date().toISOString());
      }
    } else {
      updates.push('published_at = ?');
      params.push(story.published_at || null);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    params.push(id);
    execute(`UPDATE stories SET ${updates.join(', ')} WHERE id = ?`, params);
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
    SELECT s.*, u.username AS author_name
    FROM stories s
    LEFT JOIN users u ON s.author_id = u.id
    WHERE s.author_id = ?
    ORDER BY s.created_at DESC
  `, [userId]) as any[];

  res.json(stories);
};

export const searchStories = (req: Request, res: Response) => {
  const { q } = req.query;

  if (!q) {
    const stories = queryAll('SELECT s.*, u.username AS author_name FROM stories s LEFT JOIN users u ON s.author_id = u.id WHERE s.status = ? ORDER BY s.created_at DESC', ['published']) as any[];
    return res.json(stories);
  }

  const searchTerm = `%${q}%`;
  const stories = queryAll(`
    SELECT s.*, u.username AS author_name
    FROM stories s
    LEFT JOIN users u ON s.author_id = u.id
    WHERE (s.title LIKE ? OR s.summary LIKE ?)
    AND s.status = ?
    ORDER BY s.created_at DESC
  `, [searchTerm, searchTerm, 'published']) as any[];

  res.json(stories);
};
