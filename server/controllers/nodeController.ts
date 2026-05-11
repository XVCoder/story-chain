import type { Response } from 'express';
import { queryAll, queryOne, execute } from '../db/database.js';
import type { AuthRequest } from '../middleware/auth.js';

export const addNode = (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: '请先登录' });
  }

  const { story_id, content, parent_id } = req.body;

  if (!content) {
    return res.status(400).json({ message: '内容为必填项' });
  }

  const story = queryOne('SELECT * FROM stories WHERE id = ?', [story_id]);
  
  if (!story) {
    return res.status(404).json({ message: '故事不存在' });
  }

  if (story.mode === 'solo') {
    return res.status(403).json({ message: 'Solo模式不接受新节点' });
  }

  if (story.max_nodes > 0) {
    const existingNodes = queryAll('SELECT COUNT(*) as count FROM story_nodes WHERE story_id = ?', [story_id]) as any[];
    if (existingNodes[0]?.count >= story.max_nodes) {
      return res.status(400).json({ message: '该故事已达到最大节点数' });
    }
  }

  if (story.status !== 'ongoing') {
    return res.status(400).json({ message: '该故事不接受新节点' });
  }

  if (story.mode === 'team') {
    const member = queryOne('SELECT id FROM team_members WHERE team_id = ? AND user_id = ?', [story.team_id, userId]);
    if (!member) {
      return res.status(403).json({ message: '只有团队成员才能添加节点' });
    }
  }

  if (parent_id) {
    const parentNode = queryOne('SELECT id FROM story_nodes WHERE id = ? AND story_id = ?', [parent_id, story_id]);
    if (!parentNode) {
      return res.status(400).json({ message: '父节点不存在于该故事中' });
    }
  }

  try {
    execute('INSERT INTO story_nodes (story_id, parent_id, content, author_id) VALUES (?, ?, ?, ?)', [story_id, parent_id || null, content, userId]);
    const newNode = queryOne('SELECT * FROM story_nodes WHERE story_id = ? AND author_id = ? ORDER BY id DESC LIMIT 1', [story_id, userId]);
    
    const countResult = queryAll('SELECT COUNT(*) as count FROM story_nodes WHERE story_id = ?', [story_id]) as any[];
    const newCount = countResult[0]?.count || 1;
    execute('UPDATE stories SET current_nodes = ? WHERE id = ?', [newCount, story_id]);

    if (story.max_nodes > 0 && newCount >= story.max_nodes) {
      execute('UPDATE stories SET status = ? WHERE id = ?', ['completed', story_id]);
    }

    autoSelectMainLineInternal(story_id);

    res.status(201).json(newNode);
  } catch (error: any) {
    const errMsg = error?.message || error?.toString() || '未知错误';
    res.status(500).json({ message: `添加节点失败: ${errMsg}` });
  }
};

export const getNodesByStory = (req: AuthRequest, res: Response) => {
  const { story_id } = req.params;

  const nodes = queryAll(`
    SELECT n.*, u.username AS author_name
    FROM story_nodes n
    LEFT JOIN users u ON n.author_id = u.id
    WHERE n.story_id = ?
    ORDER BY n.id ASC
  `, [story_id]) as any[];

  res.json(nodes);
};

export const selectNode = (req: AuthRequest, res: Response) => {
  const { node_id } = req.params;
  const userId = req.user?.id;

  const node = queryOne('SELECT id, story_id, parent_id FROM story_nodes WHERE id = ?', [node_id]);
  
  if (!node) {
    return res.status(404).json({ message: '节点不存在' });
  }

  const story = queryOne('SELECT * FROM stories WHERE id = ?', [node.story_id]);
  
  if (!story) {
    return res.status(404).json({ message: '故事不存在' });
  }

  if (story.mode === 'solo') {
    return res.status(400).json({ message: 'Solo模式不需要选择节点' });
  }

  if (story.mode === 'team') {
    const member = queryOne('SELECT id FROM team_members WHERE team_id = ? AND user_id = ? AND role = ?', [story.team_id, userId, 'leader']);
    if (!member) {
      return res.status(403).json({ message: '只有队长才能选择节点' });
    }
  } else if (story.author_id !== userId) {
    return res.status(403).json({ message: '只有故事发起者才能选择节点' });
  }

  if (node.parent_id) {
    execute('UPDATE story_nodes SET is_manual_selected = FALSE WHERE story_id = ? AND parent_id = ?', [node.story_id, node.parent_id]);
  } else {
    execute('UPDATE story_nodes SET is_manual_selected = FALSE WHERE story_id = ? AND parent_id IS NULL', [node.story_id]);
  }

  execute('UPDATE story_nodes SET is_manual_selected = TRUE WHERE id = ?', [node_id]);

  const selectedCount = autoSelectMainLineInternal(node.story_id);

  res.json({ message: '节点选择成功', timeline_nodes: selectedCount });
};

export const unselectNode = (req: AuthRequest, res: Response) => {
  const { node_id } = req.params;
  const userId = req.user?.id;

  const node = queryOne('SELECT id, story_id, parent_id FROM story_nodes WHERE id = ?', [node_id]);
  
  if (!node) {
    return res.status(404).json({ message: '节点不存在' });
  }

  const story = queryOne('SELECT * FROM stories WHERE id = ?', [node.story_id]);
  
  if (!story) {
    return res.status(404).json({ message: '故事不存在' });
  }

  if (story.mode === 'solo') {
    return res.status(400).json({ message: 'Solo模式不需要选择节点' });
  }

  if (story.mode === 'team') {
    const member = queryOne('SELECT id FROM team_members WHERE team_id = ? AND user_id = ? AND role = ?', [story.team_id, userId, 'leader']);
    if (!member) {
      return res.status(403).json({ message: '只有队长才能更改节点选择' });
    }
  } else if (story.author_id !== userId) {
    return res.status(403).json({ message: '只有故事发起者才能更改节点选择' });
  }

  if (node.parent_id) {
    execute('UPDATE story_nodes SET is_manual_selected = FALSE WHERE story_id = ? AND parent_id = ?', [node.story_id, node.parent_id]);
  } else {
    execute('UPDATE story_nodes SET is_manual_selected = FALSE WHERE story_id = ? AND parent_id IS NULL', [node.story_id]);
  }

  const selectedCount = autoSelectMainLineInternal(node.story_id);

  res.json({ message: '手动选择已取消', timeline_nodes: selectedCount });
};

export const autoSelectMainLine = (req: AuthRequest, res: Response) => {
  const { story_id } = req.params;

  const story = queryOne('SELECT id FROM stories WHERE id = ?', [story_id]);
  if (!story) {
    return res.status(404).json({ message: '故事不存在' });
  }

  const selectedCount = autoSelectMainLineInternal(Number(story_id));

  res.json({ 
    message: `主线自动选择完成：共 ${selectedCount} 个节点`,
    timeline_nodes: selectedCount 
  });
};

export function autoSelectMainLineInternal(storyId: number): number {
  const story = queryOne('SELECT id FROM stories WHERE id = ?', [storyId]);
  if (!story) {
    return 0;
  }

  execute('UPDATE story_nodes SET is_selected = FALSE WHERE story_id = ?', [storyId]);

  const allNodes = queryAll(
    'SELECT id, parent_id, is_manual_selected, coins FROM story_nodes WHERE story_id = ? ORDER BY is_manual_selected DESC, coins DESC, created_at ASC',
    [storyId]
  ) as any[];

  if (allNodes.length === 0) {
    return 0;
  }

  const canonicalRoot = allNodes
    .filter((n: any) => n.parent_id === null)
    .sort((a: any, b: any) => a.id - b.id)[0];

  if (!canonicalRoot) {
    return 0;
  }

  const selectedIds: number[] = [canonicalRoot.id];
  const visitedIds = new Set<number>([canonicalRoot.id]);
  let currentId = canonicalRoot.id;

  while (true) {
    let nextNode = allNodes.find((n: any) => !visitedIds.has(n.id) && n.parent_id === currentId);

    if (!nextNode && currentId === canonicalRoot.id) {
      nextNode = allNodes.find((n: any) => !visitedIds.has(n.id) && n.parent_id === null);
    }

    if (!nextNode) break;

    selectedIds.push(nextNode.id);
    visitedIds.add(nextNode.id);
    currentId = nextNode.id;
  }

  selectedIds.forEach(id => {
    execute('UPDATE story_nodes SET is_selected = TRUE WHERE id = ?', [id]);
  });

  return selectedIds.length;
}

export const getTimeline = (req: AuthRequest, res: Response) => {
  const { story_id } = req.params;

  const story = queryOne('SELECT id FROM stories WHERE id = ?', [story_id]);
  
  if (!story) {
    return res.status(404).json({ message: '故事不存在' });
  }

  const timelineNodes = queryAll(`
    SELECT n.id, n.content, n.author_id, n.coins, n.created_at, u.username AS author_name
    FROM story_nodes n
    LEFT JOIN users u ON n.author_id = u.id
    WHERE n.story_id = ? AND n.is_selected = TRUE
    ORDER BY n.id ASC
  `, [story_id]) as any[];

  const fullText = timelineNodes.map((n: any) => n.content).join('');

  res.json({
    nodes: timelineNodes,
    full_text: fullText,
    node_count: timelineNodes.length
  });
};
