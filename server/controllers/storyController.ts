import type { Response } from 'express';
import { queryAll, queryOne, execute } from '../db/database.js';
import type { AuthRequest } from '../middleware/auth.js';

export const createStory = (req: AuthRequest, res: Response) => {
  const { title, summary, content, mode = 'free', max_nodes = 5, team_id, competition_id } = req.body;
  const author_id = req.user?.id;

  if (!title) {
    return res.status(400).json({ message: '标题为必填项' });
  }

  if (!summary) {
    return res.status(400).json({ message: '简介为必填项' });
  }

  if (!content) {
    return res.status(400).json({ message: '内容为必填项' });
  }

  const finalMaxNodes = mode === 'solo' ? 1 : max_nodes;

  if (mode === 'team' && !team_id) {
    return res.status(400).json({ message: '团队模式需要指定团队' });
  }

  if (mode === 'team' && team_id) {
    const member = queryOne('SELECT id FROM team_members WHERE team_id = ? AND user_id = ? AND role = ?', [team_id, author_id, 'leader']);
    if (!member) {
      return res.status(403).json({ message: '只有队长才能创建团队故事' });
    }
  }

  try {
    let storyId: number;
    if (mode === 'team' && competition_id) {
      execute('INSERT INTO stories (title, summary, content, author_id, mode, max_nodes, status, team_id, competition_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [title, summary, content, author_id, mode, finalMaxNodes, 'ongoing', team_id, competition_id]);
      const created = queryOne('SELECT id FROM stories WHERE title = ? AND author_id = ? ORDER BY id DESC LIMIT 1', [title, author_id]);
      storyId = created.id;
    } else if (mode === 'team' && team_id) {
      execute('INSERT INTO stories (title, summary, content, author_id, mode, max_nodes, status, team_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [title, summary, content, author_id, mode, finalMaxNodes, 'ongoing', team_id]);
      const created = queryOne('SELECT id FROM stories WHERE title = ? AND author_id = ? ORDER BY id DESC LIMIT 1', [title, author_id]);
      storyId = created.id;
    } else {
      execute('INSERT INTO stories (title, summary, content, author_id, mode, max_nodes, status) VALUES (?, ?, ?, ?, ?, ?, ?)', [title, summary, content, author_id, mode, finalMaxNodes, 'ongoing']);
      const created = queryOne('SELECT id FROM stories WHERE title = ? AND author_id = ? ORDER BY id DESC LIMIT 1', [title, author_id]);
      storyId = created.id;
    }

    if (!storyId) {
      throw new Error('创建故事失败');
    }

    execute('INSERT INTO story_nodes (story_id, content, author_id, is_selected) VALUES (?, ?, ?, ?)', [storyId, content, author_id, true]);
    const story = queryOne('SELECT * FROM stories WHERE id = ?', [storyId]);
    res.status(201).json(story);
  } catch (error: any) {
    const errMsg = error?.message || error?.toString() || '未知错误';
    res.status(500).json({ message: `创建故事失败: ${errMsg}` });
  }
};

export const getStories = (req: AuthRequest, res: Response) => {
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

export const getStoryById = (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const story = queryOne(`
    SELECT s.*, u.username AS author_name
    FROM stories s
    LEFT JOIN users u ON s.author_id = u.id
    WHERE s.id = ?
  `, [id]);
  
  if (!story) {
    return res.status(404).json({ message: '故事不存在' });
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
  const userId = req.user?.id;
  const { title, summary, status, mode } = req.body;

  const story = queryOne('SELECT * FROM stories WHERE id = ?', [id]);
  
  if (!story) {
    return res.status(404).json({ message: '故事不存在' });
  }

  if (story.author_id !== userId) {
    return res.status(403).json({ message: '无权操作此故事' });
  }

  if (mode && mode !== story.mode) {
    return res.status(400).json({ message: '故事模式创建后不可更改' });
  }

  const teamCheck = queryOne('SELECT team_id FROM stories WHERE id = ?', [id]);
  if (!teamCheck) {
    return res.status(404).json({ message: '故事不存在或无权操作' });
  }

  const updates: string[] = [];
  const params: any[] = [];

  if (title) {
    updates.push('title = ?');
    params.push(title);
  }
  if (summary) {
    updates.push('summary = ?');
    params.push(summary);
  }
  if (status) {
    updates.push('status = ?');
    params.push(status);
    if (status === 'published') {
      updates.push('published_at = ?');
      params.push(new Date().toISOString());
    }
  }

  if (updates.length === 0) {
    return res.status(400).json({ message: '没有需要更新的字段' });
  }

  params.push(id);
  execute(`UPDATE stories SET ${updates.join(', ')} WHERE id = ?`, params);

  res.json({ message: '故事更新成功' });
};

export const deleteStory = (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;

  const story = queryOne('SELECT * FROM stories WHERE id = ?', [id]);

  if (!story) {
    return res.status(404).json({ message: '故事不存在或无权操作' });
  }

  if (story.author_id !== userId) {
    return res.status(403).json({ message: '无权删除此故事' });
  }

  execute('DELETE FROM story_nodes WHERE story_id = ?', [id]);
  execute('DELETE FROM likes WHERE story_id = ?', [id]);
  execute('DELETE FROM favorites WHERE story_id = ?', [id]);
  execute('DELETE FROM coins WHERE node_id IN (SELECT id FROM story_nodes WHERE story_id = ?)', [id]);
  execute('DELETE FROM stories WHERE id = ?', [id]);

  res.json({ message: '故事删除成功' });
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

export const searchStories = (req: AuthRequest, res: Response) => {
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
