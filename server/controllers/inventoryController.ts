import type { Request, Response } from 'express';
import { queryAll, queryOne, execute } from '../db/database.js';
import type { AuthRequest } from '../middleware/auth.js';

export const exchangePoints = (req: AuthRequest, res: Response) => {
  const { item_type, quantity = 1 } = req.body;
  const user_id = req.user?.id;

  if (!Number.isInteger(quantity) || quantity <= 0) {
    return res.status(400).json({ message: '数量必须为正整数' });
  }

  const itemPrices: Record<string, number> = {
    ai_polish: 100,
    hint: 50,
    skip: 30
  };

  const price = itemPrices[item_type];
  if (!price) {
    return res.status(400).json({ message: '无效的道具类型' });
  }

  const totalCost = price * quantity;

  const user = queryOne('SELECT points FROM users WHERE id = ?', [user_id]);

  if (!user) {
    return res.status(404).json({ message: '用户不存在' });
  }

  if (user.points < totalCost) {
    return res.status(400).json({ message: '积分不足' });
  }

  execute('UPDATE users SET points = points - ? WHERE id = ?', [totalCost, user_id]);

  const item = queryOne('SELECT id, quantity FROM inventory WHERE user_id = ? AND item_type = ?', [user_id, item_type]);

  if (item) {
    execute('UPDATE inventory SET quantity = quantity + ? WHERE user_id = ? AND item_type = ?', [quantity, user_id, item_type]);
  } else {
    execute('INSERT INTO inventory (user_id, item_type, quantity) VALUES (?, ?, ?)', [user_id, item_type, quantity]);
  }

  res.json({ message: '道具购买成功' });
};

export const getUserInventory = (req: AuthRequest, res: Response) => {
  const user_id = req.user?.id;

  const items = queryAll('SELECT * FROM inventory WHERE user_id = ?', [user_id]) as any[];

  res.json(items);
};

export const useItem = (req: AuthRequest, res: Response) => {
  const { item_type, story_id } = req.body;
  const user_id = req.user?.id;

  const invItem = queryOne('SELECT id, quantity FROM inventory WHERE user_id = ? AND item_type = ?', [user_id, item_type]);
  
  if (!invItem || invItem.quantity <= 0) {
    return res.status(400).json({ message: '道具不足' });
  }

  if (item_type === 'ai_polish') {
    if (!story_id) {
      return res.status(400).json({ message: '使用AI润色需要指定故事ID' });
    }

    const node = queryOne('SELECT id, content FROM story_nodes WHERE story_id = ? AND is_selected = TRUE ORDER BY created_at DESC LIMIT 1', [story_id]);

    if (!node) {
      return res.status(404).json({ message: '未找到已选中的节点' });
    }

    execute('UPDATE inventory SET quantity = quantity - 1 WHERE user_id = ? AND item_type = ?', [user_id, item_type]);

    const polishedContent = node.content + '\n\n[AI润色完成]';
    execute('UPDATE story_nodes SET content = ? WHERE id = ?', [polishedContent, node.id]);

    res.json({ message: 'AI润色已应用', polishedContent });
  } else {
    execute('UPDATE inventory SET quantity = quantity - 1 WHERE user_id = ? AND item_type = ?', [user_id, item_type]);
    res.json({ message: '道具使用成功' });
  }
};
