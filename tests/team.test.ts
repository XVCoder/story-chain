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
  const ts = Date.now();

  beforeAll(async () => {
    await initDatabase();

    await request(app)
      .post('/api/users/register')
      .send({ username: `teamleader_${ts}`, password: 'testpass' });
    const leaderLogin = await request(app)
      .post('/api/users/login')
      .send({ username: `teamleader_${ts}`, password: 'testpass' });
    leaderToken = leaderLogin.body.token;

    await request(app)
      .post('/api/users/register')
      .send({ username: `teammember_${ts}`, password: 'testpass' });
    const memberLogin = await request(app)
      .post('/api/users/login')
      .send({ username: `teammember_${ts}`, password: 'testpass' });
    memberToken = memberLogin.body.token;
  });

  describe('Create Team', () => {
    it('should create a team', async () => {
      const response = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${leaderToken}`)
        .send({ name: `Test Team ${ts}` });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(`Test Team ${ts}`);
      teamId = response.body.id;
    });

    it('should fail to create duplicate team name', async () => {
      const response = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${leaderToken}`)
        .send({ name: `Test Team ${ts}` });

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
      expect(response.body.message).toBe('成功加入团队');
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
  const ts2 = Date.now();

  beforeAll(async () => {
    await initDatabase();

    await request(app)
      .post('/api/users/register')
      .send({ username: `compleader_${ts2}`, password: 'testpass' });
    const leaderLogin = await request(app)
      .post('/api/users/login')
      .send({ username: `compleader_${ts2}`, password: 'testpass' });
    leaderToken = leaderLogin.body.token;

    const teamResponse = await request(app)
      .post('/api/teams')
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({ name: `Competition Team ${ts2}` });
    teamId = teamResponse.body.id;
  });

  describe('Create Competition', () => {
    it('should create a competition', async () => {
      const response = await request(app)
        .post('/api/competitions')
        .set('Authorization', `Bearer ${leaderToken}`)
        .send({ title: `Test Competition ${ts2}`, description: 'A test competition' });

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
        .send({ username: `regularmember_${ts2}`, password: 'testpass' });
      const memberLogin = await request(app)
        .post('/api/users/login')
        .send({ username: `regularmember_${ts2}`, password: 'testpass' });

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
      expect(response.body.message).toBe('团队已成功参加竞赛');
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
