import type { Request, Response } from 'express';
import { queryAll, queryOne, execute } from '../db/database.js';
import type { AuthRequest } from '../middleware/auth.js';

export const createTeam = (req: AuthRequest, res: Response) => {
  const { name } = req.body;
  const user_id = req.user?.id;

  try {
    execute('INSERT INTO teams (name) VALUES (?)', [name]);
    const team = queryOne('SELECT id FROM teams WHERE name = ?', [name]);
    if (!team) throw new Error('Team not created');

    execute('INSERT INTO team_members (team_id, user_id, role) VALUES (?, ?, ?)', [team.id, user_id, 'leader']);

    res.status(201).json({ id: team.id, name });
  } catch (error) {
    return res.status(400).json({ message: 'Team name already exists' });
  }
};

export const joinTeam = (req: AuthRequest, res: Response) => {
  const { team_id } = req.params;
  const user_id = req.user?.id;

  const team = queryOne('SELECT id FROM teams WHERE id = ?', [team_id]);
  
  if (!team) {
    return res.status(404).json({ message: 'Team not found' });
  }

  try {
    execute('INSERT INTO team_members (team_id, user_id) VALUES (?, ?)', [team_id, user_id]);
    res.json({ message: 'Joined team successfully' });
  } catch (error) {
    return res.status(400).json({ message: 'Already a member of this team' });
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
    execute('INSERT INTO competitions (title, description, end_time) VALUES (?, ?, ?)', [title, description, end_time || null]);
    const competition = queryOne('SELECT id FROM competitions WHERE title = ? ORDER BY id DESC LIMIT 1', [title]);
    res.status(201).json({ id: competition?.id, title });
  } catch (error) {
    return res.status(400).json({ message: 'Error creating competition' });
  }
};

export const joinCompetition = (req: AuthRequest, res: Response) => {
  const { competition_id, team_id } = req.body;
  const user_id = req.user?.id;

  const member = queryOne('SELECT id FROM team_members WHERE team_id = ? AND user_id = ? AND role = ?', [team_id, user_id, 'leader']);
  
  if (!member) {
    return res.status(403).json({ message: 'Only team leader can join competitions' });
  }

  try {
    execute('INSERT INTO competition_teams (competition_id, team_id) VALUES (?, ?)', [competition_id, team_id]);
    res.json({ message: 'Team joined competition successfully' });
  } catch (error) {
    return res.status(400).json({ message: 'Team already joined this competition' });
  }
};

export const getCompetitions = (req: Request, res: Response) => {
  const competitions = queryAll('SELECT * FROM competitions ORDER BY start_time DESC') as any[];
  res.json(competitions);
};
