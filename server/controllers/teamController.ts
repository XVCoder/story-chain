import type { Request, Response } from 'express';
import { queryAll, queryOne, execute } from '../db/database.js';
import type { AuthRequest } from '../middleware/auth.js';

export const createTeam = (req: AuthRequest, res: Response) => {
  const { name } = req.body;
  const user_id = req.user?.id;

  try {
    execute('INSERT INTO teams (name) VALUES (?)', [name]);
    const team = queryOne('SELECT id FROM teams WHERE name = ?', [name]);
    if (!team) throw new Error('团队创建失败');

    execute('INSERT INTO team_members (team_id, user_id, role) VALUES (?, ?, ?)', [team.id, user_id, 'leader']);

    res.status(201).json({ id: team.id, name });
  } catch (error) {
    return res.status(400).json({ message: '团队名称已存在' });
  }
};

export const joinTeam = (req: AuthRequest, res: Response) => {
  const { team_id } = req.params;
  const user_id = req.user?.id;

  const team = queryOne('SELECT id FROM teams WHERE id = ?', [team_id]);
  
  if (!team) {
    return res.status(404).json({ message: '团队不存在' });
  }

  try {
    execute('INSERT INTO team_members (team_id, user_id) VALUES (?, ?)', [team_id, user_id]);
    res.json({ message: '成功加入团队' });
  } catch (error) {
    return res.status(400).json({ message: '已经是该团队成员' });
  }
};

export const getTeams = (req: Request, res: Response) => {
  const teams = queryAll('SELECT * FROM teams ORDER BY created_at DESC') as any[];
  res.json(teams);
};

export const getUserTeams = (req: AuthRequest, res: Response) => {
  const user_id = req.user?.id;

  const teams = queryAll('SELECT t.*, tm.role FROM teams t JOIN team_members tm ON t.id = tm.team_id WHERE tm.user_id = ?', [user_id]) as any[];

  res.json(teams);
};

export const createCompetition = (req: AuthRequest, res: Response) => {
  const { title, description, end_time } = req.body;

  try {
    execute('INSERT INTO competitions (title, description, end_time) VALUES (?, ?, ?)', [title, description || null, end_time || null]);
    const competition = queryOne('SELECT id FROM competitions WHERE title = ? ORDER BY id DESC LIMIT 1', [title]);
    if (!competition) {
      return res.status(500).json({ message: '竞赛已创建但未找到', title });
    }
    res.status(201).json({ id: competition.id, title });
  } catch (error: any) {
    const errMsg = error?.message || error?.toString() || '未知错误';
    return res.status(400).json({ message: `创建竞赛失败: ${errMsg}` });
  }
};

export const joinCompetition = (req: AuthRequest, res: Response) => {
  const { competition_id, team_id } = req.body;
  const user_id = req.user?.id;

  const member = queryOne('SELECT id FROM team_members WHERE team_id = ? AND user_id = ? AND role = ?', [team_id, user_id, 'leader']);
  
  if (!member) {
    return res.status(403).json({ message: '只有队长才能参加竞赛' });
  }

  try {
    execute('INSERT INTO competition_teams (competition_id, team_id) VALUES (?, ?)', [competition_id, team_id]);
    res.json({ message: '团队已成功参加竞赛' });
  } catch (error) {
    return res.status(400).json({ message: '该团队已参加此竞赛' });
  }
};

export const getTeamMembers = (req: Request, res: Response) => {
  const { team_id } = req.params;

  const team = queryOne('SELECT id FROM teams WHERE id = ?', [team_id]);
  if (!team) {
    return res.status(404).json({ message: '团队不存在' });
  }

  const members = queryAll(`
    SELECT tm.user_id, tm.role, u.username
    FROM team_members tm
    JOIN users u ON u.id = tm.user_id
    WHERE tm.team_id = ?
    ORDER BY tm.role DESC, u.username ASC
  `, [team_id]) as any[];

  res.json(members);
};

export const leaveTeam = (req: AuthRequest, res: Response) => {
  const { team_id } = req.params;
  const user_id = req.user?.id;

  const member = queryOne('SELECT id, role FROM team_members WHERE team_id = ? AND user_id = ?', [team_id, user_id]);
  if (!member) {
    return res.status(404).json({ message: '不是该团队成员' });
  }

  if (member.role === 'leader') {
    const otherMembers = queryOne('SELECT id FROM team_members WHERE team_id = ? AND role = ?', [team_id, 'member']);
    if (!otherMembers) {
      execute('DELETE FROM competition_teams WHERE team_id = ?', [team_id]);
      execute('DELETE FROM team_members WHERE team_id = ?', [team_id]);
      execute('DELETE FROM teams WHERE id = ?', [team_id]);
      return res.json({ message: '团队已解散' });
    }
    return res.status(400).json({ message: '请先转让队长身份再离开' });
  }

  execute('DELETE FROM team_members WHERE team_id = ? AND user_id = ?', [team_id, user_id]);
  res.json({ message: '已成功离开团队' });
};

export const getCompetitions = (req: Request, res: Response) => {
  const competitions = queryAll('SELECT * FROM competitions ORDER BY start_time DESC') as any[];
  res.json(competitions);
};

export const getCompetitionLeaderboard = (req: Request, res: Response) => {
  const { competition_id } = req.params;

  const competition = queryOne('SELECT id, title FROM competitions WHERE id = ?', [competition_id]);
  if (!competition) {
    return res.status(404).json({ message: '竞赛不存在' });
  }

  const leaderboard = queryAll(`
    SELECT t.id, t.name, ct.score
    FROM competition_teams ct
    JOIN teams t ON t.id = ct.team_id
    WHERE ct.competition_id = ?
    ORDER BY ct.score DESC
  `, [competition_id]) as any[];

  res.json({ competition, leaderboard });
};
