import request from 'supertest';
import express from 'express';
import cors from 'cors';
import router from '../server/routes';
import { initDatabase, execute } from '../server/db/database';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', router);

describe('Game Mode Logic', () => {
  let token: string;

  beforeAll(async () => {
    await initDatabase();

    await request(app)
      .post('/api/users/register')
      .send({ username: 'modeuser', password: 'testpass' });

    const loginResponse = await request(app)
      .post('/api/users/login')
      .send({ username: 'modeuser', password: 'testpass' });
    token = loginResponse.body.token;
  });

  describe('Solo Mode', () => {
    let soloStoryId: number;

    it('should create a solo story with max_nodes=1', async () => {
      const response = await request(app)
        .post('/api/stories')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Solo Story', summary: 'Solo test', content: 'Solo content...', mode: 'solo' });

      expect(response.status).toBe(201);
      soloStoryId = response.body.id;

      const storyResponse = await request(app).get(`/api/stories/${soloStoryId}`);
      expect(storyResponse.body.mode).toBe('solo');
      expect(storyResponse.body.max_nodes).toBe(1);
    });

    it('should reject adding nodes to solo story', async () => {
      await request(app)
        .put(`/api/stories/${soloStoryId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Solo Story', summary: 'Solo test', status: 'ongoing' });

      const response = await request(app)
        .post('/api/nodes')
        .set('Authorization', `Bearer ${token}`)
        .send({ story_id: soloStoryId, content: 'Should fail...' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Solo mode does not accept new nodes');
    });

    it('should reject node selection in solo mode', async () => {
      const nodesResponse = await request(app).get(`/api/nodes/${soloStoryId}`);
      const nodeId = nodesResponse.body[0]?.id;

      const response = await request(app)
        .put(`/api/nodes/${nodeId}/select`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Solo mode does not require node selection');
    });
  });

  describe('Free Mode', () => {
    let freeStoryId: number;

    it('should create a free mode story with unlimited nodes when max_nodes=0', async () => {
      const response = await request(app)
        .post('/api/stories')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Free Unlimited Story', summary: 'Free test', content: 'Free content...', mode: 'free', max_nodes: 0 });

      expect(response.status).toBe(201);
      freeStoryId = response.body.id;

      await request(app)
        .put(`/api/stories/${freeStoryId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Free Unlimited Story', summary: 'Free test', status: 'ongoing' });
    });

    it('should allow unlimited nodes in free mode with max_nodes=0', async () => {
      for (let i = 0; i < 3; i++) {
        const response = await request(app)
          .post('/api/nodes')
          .set('Authorization', `Bearer ${token}`)
          .send({ story_id: freeStoryId, content: `Free node ${i}...` });
        expect(response.status).toBe(201);
      }
    });
  });

  describe('Prevent mode change', () => {
    let storyId: number;

    it('should create a story', async () => {
      const response = await request(app)
        .post('/api/stories')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Mode Change Test', summary: 'Test', content: 'Content...', mode: 'free' });
      storyId = response.body.id;
    });

    it('should reject mode change on update', async () => {
      const response = await request(app)
        .put(`/api/stories/${storyId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Mode Change Test', summary: 'Test', status: 'draft', mode: 'solo' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Story mode cannot be changed after creation');
    });
  });

  describe('Team Mode', () => {
    let leaderToken: string;
    let memberToken: string;
    let teamId: number;
    let competitionId: number;
    const teamSuffix = `team${Date.now()}`;

    beforeAll(async () => {
      await request(app)
        .post('/api/users/register')
        .send({ username: `teamleader2_${teamSuffix}`, password: 'testpass' });
      const leaderLogin = await request(app)
        .post('/api/users/login')
        .send({ username: `teamleader2_${teamSuffix}`, password: 'testpass' });
      leaderToken = leaderLogin.body.token;

      await request(app)
        .post('/api/users/register')
        .send({ username: `teammember2_${teamSuffix}`, password: 'testpass' });
      const memberLogin = await request(app)
        .post('/api/users/login')
        .send({ username: `teammember2_${teamSuffix}`, password: 'testpass' });
      memberToken = memberLogin.body.token;

      const teamResponse = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${leaderToken}`)
        .send({ name: `Mode Team ${teamSuffix}` });
      if (teamResponse.status !== 201) {
        console.log('Team creation failed:', teamResponse.status, teamResponse.body);
      }
      teamId = teamResponse.body.id;

      await request(app)
        .post(`/api/teams/${teamId}/join`)
        .set('Authorization', `Bearer ${memberToken}`);

      const compResponse = await request(app)
        .post('/api/competitions')
        .set('Authorization', `Bearer ${leaderToken}`)
        .send({ title: `Mode Competition ${teamSuffix}` });
      if (compResponse.status !== 201) {
        console.log('Comp creation failed:', compResponse.status, compResponse.body);
      }
      competitionId = compResponse.body.id;

      await request(app)
        .post('/api/competitions/join')
        .set('Authorization', `Bearer ${leaderToken}`)
        .send({ competition_id: competitionId, team_id: teamId });
    });

    it('should create a team story', async () => {
      const response = await request(app)
        .post('/api/stories')
        .set('Authorization', `Bearer ${leaderToken}`)
        .send({
          title: 'Team Story',
          summary: 'Team test',
          content: 'Team content...',
          mode: 'team',
          team_id: teamId,
          competition_id: competitionId
        });

      if (response.status !== 201) {
        console.log('Create team story error:', response.status, JSON.stringify(response.body));
      }
      expect(response.status).toBe(201);
    });

    it('should reject team story by non-leader', async () => {
      const response = await request(app)
        .post('/api/stories')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          title: 'Unauthorized Team Story',
          summary: 'Should fail',
          content: 'Content...',
          mode: 'team',
          team_id: teamId
        });

      if (response.status !== 403) {
        console.log('Non-leader team story error:', response.status, JSON.stringify(response.body));
      }
      expect(response.status).toBe(403);
    });

    it('should reject team story without team_id', async () => {
      const response = await request(app)
        .post('/api/stories')
        .set('Authorization', `Bearer ${leaderToken}`)
        .send({
          title: 'No Team Story',
          summary: 'Should fail',
          content: 'Content...',
          mode: 'team'
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Competition Leaderboard', () => {
    let competitionId: number;
    let leaderToken: string;
    let teamId: number;

    beforeAll(async () => {
      const uniqueSuffix = Date.now();
      const regRes = await request(app)
        .post('/api/users/register')
        .send({ username: `lbuser${uniqueSuffix}`, password: 'testpass' });
      if (regRes.status !== 201) {
        console.log('Leaderboard user reg failed:', regRes.status, regRes.body);
      }

      const login = await request(app)
        .post('/api/users/login')
        .send({ username: `lbuser${uniqueSuffix}`, password: 'testpass' });
      if (login.status !== 200) {
        console.log('Leaderboard user login failed:', login.status, login.body);
      }
      leaderToken = login.body?.token;

      const teamRes = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${leaderToken}`)
        .send({ name: `LB Team ${uniqueSuffix}` });
      if (teamRes.status !== 201) {
        console.log('Leaderboard team create failed:', teamRes.status, teamRes.body);
      }
      teamId = teamRes.body?.id;

      const compRes = await request(app)
        .post('/api/competitions')
        .set('Authorization', `Bearer ${leaderToken}`)
        .send({ title: `LB Comp ${uniqueSuffix}` });
      if (compRes.status !== 201) {
        console.log('Leaderboard comp create failed:', compRes.status, compRes.body);
      }
      competitionId = compRes.body?.id;

      const joinRes = await request(app)
        .post('/api/competitions/join')
        .set('Authorization', `Bearer ${leaderToken}`)
        .send({ competition_id: competitionId, team_id: teamId });
      if (joinRes.status !== 200) {
        console.log('Leaderboard join failed:', joinRes.status, joinRes.body);
      }
    });

    it('should get competition leaderboard', async () => {
      const response = await request(app).get(`/api/competitions/${competitionId}/leaderboard`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('competition');
      expect(response.body).toHaveProperty('leaderboard');
      expect(Array.isArray(response.body.leaderboard)).toBe(true);
    });

    it('should return 404 for non-existent competition', async () => {
      const response = await request(app).get('/api/competitions/99999/leaderboard');
      expect(response.status).toBe(404);
    });
  });
});
