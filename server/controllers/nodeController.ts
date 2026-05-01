import type { Request, Response } from 'express';
import { queryAll, queryOne, execute } from '../db/database.js';
import type { AuthRequest } from '../middleware/auth.js';

export const addNode = (req: AuthRequest, res: Response) => {
  const { story_id, parent_id, content } = req.body;
  const author_id = req.user?.id;

  if (!author_id) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  if (!content || typeof content !== 'string' || !content.trim()) {
    return res.status(400).json({ message: 'Content is required' });
  }

  const story = queryOne('SELECT status, current_nodes, max_nodes, mode, team_id FROM stories WHERE id = ?', [story_id]);
  
  if (!story) {
    return res.status(404).json({ message: 'Story not found' });
  }

  if (story.status !== 'ongoing') {
    return res.status(400).json({ message: 'Story is not accepting new nodes' });
  }

  if (story.mode === 'solo') {
    return res.status(400).json({ message: 'Solo mode does not accept new nodes' });
  }

  if (story.mode === 'team') {
    const member = queryOne('SELECT id FROM team_members WHERE team_id = ? AND user_id = ?', [story.team_id, author_id]);
    if (!member) {
      return res.status(403).json({ message: 'Only team members can add nodes to team stories' });
    }
  }

  if (parent_id) {
    const parent = queryOne('SELECT id FROM story_nodes WHERE id = ? AND story_id = ?', [parent_id, story_id]);
    if (!parent) {
      return res.status(400).json({ message: 'Parent node not found in this story' });
    }
  }

  const hasMaxNodes = story.max_nodes !== 0;
  if (hasMaxNodes && story.current_nodes >= story.max_nodes) {
    return res.status(400).json({ message: 'Story has reached maximum nodes' });
  }

  try {
    execute('INSERT INTO story_nodes (story_id, parent_id, content, author_id) VALUES (?, ?, ?, ?)', [story_id, parent_id || null, content.trim(), author_id]);
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

  const story = queryOne('SELECT author_id, current_nodes, max_nodes, mode, team_id FROM stories WHERE id = ?', [node.story_id]);
  
  if (!story) {
    return res.status(404).json({ message: 'Story not found' });
  }

  if (story.mode === 'solo') {
    return res.status(400).json({ message: 'Solo mode does not require node selection' });
  }

  if (story.mode === 'team') {
    const leader = queryOne('SELECT id FROM team_members WHERE team_id = ? AND user_id = ? AND role = ?', [story.team_id, user_id, 'leader']);
    if (!leader) {
      return res.status(403).json({ message: 'Only team leader can select nodes' });
    }
  } else if (story.author_id !== user_id) {
    return res.status(403).json({ message: 'Only story author can select nodes' });
  }

  execute('UPDATE story_nodes SET is_selected = FALSE WHERE story_id = ?', [node.story_id]);
  execute('UPDATE story_nodes SET is_selected = TRUE WHERE id = ?', [node_id]);

  const hasMaxNodes = story.max_nodes !== 0;
  const newStatus = hasMaxNodes && story.current_nodes >= story.max_nodes ? 'completed' : 'ongoing';
  execute('UPDATE stories SET status = ? WHERE id = ?', [newStatus, node.story_id]);

  calculatePoints(node.story_id, story.mode, story.team_id);
  res.json({ message: 'Node selected successfully' });
};

export const autoSelectMainLine = (req: AuthRequest, res: Response) => {
  const { story_id } = req.params;

  const story = queryOne('SELECT id FROM stories WHERE id = ?', [story_id]);
  if (!story) {
    return res.status(404).json({ message: 'Story not found' });
  }

  const selectedCount = autoSelectMainLineInternal(Number(story_id));

  res.json({ message: `Main line auto-selected: ${selectedCount} nodes in chain`, nodes: selectedCount });
};

export function autoSelectMainLineInternal(story_id: number): number {
  const root = queryOne('SELECT id FROM story_nodes WHERE story_id = ? AND parent_id IS NULL ORDER BY id ASC LIMIT 1', [story_id]);
  if (!root) return 0;

  execute('UPDATE story_nodes SET is_selected = FALSE WHERE story_id = ?', [story_id]);
  execute('UPDATE story_nodes SET is_selected = TRUE WHERE id = ?', [root.id]);

  let count = 1;
  let currentParentId = root.id;

  while (true) {
    const bestChild = queryOne(`
      SELECT id, coins, created_at
      FROM story_nodes
      WHERE story_id = ? AND parent_id = ?
      ORDER BY coins DESC, created_at ASC
      LIMIT 1
    `, [story_id, currentParentId]);

    if (!bestChild) break;

    execute('UPDATE story_nodes SET is_selected = TRUE WHERE id = ?', [bestChild.id]);
    currentParentId = bestChild.id;
    count++;
  }

  return count;
}

export const getTimeline = (req: Request, res: Response) => {
  const { story_id } = req.params;

  const story = queryOne('SELECT id, title FROM stories WHERE id = ?', [story_id]);
  if (!story) {
    return res.status(404).json({ message: 'Story not found' });
  }

  const timelineNodes = queryAll(`
    SELECT id, content, author_id, coins, created_at
    FROM story_nodes
    WHERE story_id = ? AND is_selected = TRUE
    ORDER BY id ASC
  `, [story_id]) as any[];

  const fullText = timelineNodes.map((n: any) => n.content).join('\n\n');

  res.json({
    story_id: story.id,
    title: story.title,
    nodes: timelineNodes,
    full_text: fullText,
    node_count: timelineNodes.length,
  });
};

const calculatePoints = (story_id: number, mode: string, team_id: number | null) => {
  const story = queryOne('SELECT views, author_id FROM stories WHERE id = ?', [story_id]);
  if (!story) return;

  if (mode === 'solo') {
    const soloPoints = Math.floor(story.views / 5);
    execute('UPDATE users SET points = points + ? WHERE id = ?', [soloPoints, story.author_id]);
    return;
  }

  let multiplier = 1;
  if (mode === 'selected') {
    multiplier = 1.5;
  }

  const authorPoints = Math.floor((story.views / 10) * multiplier);
  execute('UPDATE users SET points = points + ? WHERE id = ?', [authorPoints, story.author_id]);

  const nodes = queryAll('SELECT author_id, coins FROM story_nodes WHERE story_id = ? AND is_selected = TRUE', [story_id]) as any[];

  if (!nodes.length) return;

  const totalCoins = nodes.reduce((sum: number, node: any) => sum + (node.coins || 0), 0);
  nodes.forEach((node: any) => {
    const nodePoints = totalCoins > 0 ? Math.floor((node.coins / totalCoins) * 100 * multiplier) : 0;
    execute('UPDATE users SET points = points + ? WHERE id = ?', [nodePoints, node.author_id]);
  });

  if (mode === 'team' && team_id) {
    const competitionTeam = queryOne('SELECT id FROM competition_teams WHERE team_id = ?', [team_id]);
    if (competitionTeam) {
      execute('UPDATE competition_teams SET score = score + ? WHERE team_id = ?', [100, team_id]);
    }
  }
};
