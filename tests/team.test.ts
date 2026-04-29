import request from 'supertest';
import express from 'express';
import cors from 'cors';
import router from '../server/routes';
import { initDatabase } from '../server/db/database';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', router);

describe('Team API', () => {
  let leaderToken: string;
  let memberToken: string;
  let teamId: number;

  beforeAll(async () => {
    await initDatabase();

    await request(app)
      .post('/api/users/register')
      .send({ username: 'teamleader', password: 'testpass' });
    const leaderLogin = await request(app)
      .post('/api/users/login')
      .send({ username: 'teamleader', password: 'testpass' });
    leaderToken = leaderLogin.body.token;

    await request(app)
      .post('/api/users/register')
      .send({ username: 'teammember', password: 'testpass' });
    const memberLogin = await request(app)
      .post('/api/users/login')
      .send({ username: 'teammember', password: 'testpass' });
    memberToken = memberLogin.body.token;
  });

  describe('Create Team', () => {
    it('should create a team', async () => {
      const response = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${leaderToken}`)
        .send({ name: 'Test Team' });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Test Team');
      teamId = response.body.id;
    });

    it('should fail to create duplicate team name', async () => {
      const response = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${leaderToken}`)
        .send({ name: 'Test Team' });

      expect(response.status).toBe(400);
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .post('/api/teams')
        .send({ name: 'Unauthorized Team' });

      expect(response.status).toBe(401);
    });
  });

  describe('Join Team', () => {
    it('should join a team', async () => {
      const response = await request(app)
        .post(`/api/teams/${teamId}/join`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Joined team successfully');
    });

    it('should fail to join already joined team', async () => {
      const response = await request(app)
        .post(`/api/teams/${teamId}/join`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(response.status).toBe(400);
    });

    it('should fail to join non-existent team', async () => {
      const response = await request(app)
        .post('/api/teams/99999/join')
        .set('Authorization', `Bearer ${memberToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('Get Teams', () => {
    it('should list all teams', async () => {
      const response = await request(app).get('/api/teams');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
    });

    it('should get user teams', async () => {
      const response = await request(app)
        .get('/api/teams/user')
        .set('Authorization', `Bearer ${leaderToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
    });
  });
});

describe('Competition API', () => {
  let leaderToken: string;
  let teamId: number;
  let competitionId: number;

  beforeAll(async () => {
    await initDatabase();

    await request(app)
      .post('/api/users/register')
      .send({ username: 'compleader', password: 'testpass' });
    const leaderLogin = await request(app)
      .post('/api/users/login')
      .send({ username: 'compleader', password: 'testpass' });
    leaderToken = leaderLogin.body.token;

    const teamResponse = await request(app)
      .post('/api/teams')
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({ name: 'Competition Team' });
    teamId = teamResponse.body.id;
  });

  describe('Create Competition', () => {
    it('should create a competition', async () => {
      const response = await request(app)
        .post('/api/competitions')
        .set('Authorization', `Bearer ${leaderToken}`)
        .send({ title: 'Test Competition', description: 'A test competition' });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      competitionId = response.body.id;
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .post('/api/competitions')
        .send({ title: 'Unauthorized Competition' });

      expect(response.status).toBe(401);
    });
  });

  describe('Join Competition', () => {
    it('should fail for non-leader to join competition', async () => {
      await request(app)
        .post('/api/users/register')
        .send({ username: 'regularmember', password: 'testpass' });
      const memberLogin = await request(app)
        .post('/api/users/login')
        .send({ username: 'regularmember', password: 'testpass' });

      const response = await request(app)
        .post('/api/competitions/join')
        .set('Authorization', `Bearer ${memberLogin.body.token}`)
        .send({ competition_id: competitionId, team_id: teamId });

      expect(response.status).toBe(403);
    });

    it('should join competition as team leader', async () => {
      const response = await request(app)
        .post('/api/competitions/join')
        .set('Authorization', `Bearer ${leaderToken}`)
        .send({ competition_id: competitionId, team_id: teamId });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Team joined competition successfully');
    });
  });

  describe('Get Competitions', () => {
    it('should list all competitions', async () => {
      const response = await request(app).get('/api/competitions');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
    });
  });
});
