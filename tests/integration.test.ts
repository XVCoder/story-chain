import request from 'supertest';
import express from 'express';
import cors from 'cors';
import router from '../server/routes';
import { initDatabase, execute } from '../server/db/database';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', router);

describe('Integration: Full User Flow', () => {
  let token: string;
  let userId: number;
  let storyId: number;
  let nodeId: number;
  let teamId: number;
  let competitionId: number;
  const suffix = Date.now();

  beforeAll(async () => {
    await initDatabase();
  });

  it('should complete full user flow: register -> login -> create story -> add nodes -> select -> publish', async () => {
    const registerRes = await request(app)
      .post('/api/users/register')
      .send({ username: `flowuser${suffix}`, password: 'testpass' });
    expect(registerRes.status).toBe(201);
    expect(registerRes.body.points).toBe(100);

    const loginRes = await request(app)
      .post('/api/users/login')
      .send({ username: `flowuser${suffix}`, password: 'testpass' });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body).toHaveProperty('token');
    token = loginRes.body.token;
    userId = loginRes.body.user.id;

    const createRes = await request(app)
      .post('/api/stories')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: `Flow Story ${suffix}`, summary: 'Integration test', content: 'Start...', mode: 'free', max_nodes: 3 });
    expect(createRes.status).toBe(201);
    storyId = createRes.body.id;

    await request(app)
      .put(`/api/stories/${storyId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: `Flow Story ${suffix}`, summary: 'Integration test', status: 'ongoing' });

    for (let i = 0; i < 2; i++) {
      const nodeRes = await request(app)
        .post('/api/nodes')
        .set('Authorization', `Bearer ${token}`)
        .send({ story_id: storyId, content: `Node ${i + 1}: continuation...` });
      expect(nodeRes.status).toBe(201);
      if (i === 0) nodeId = nodeRes.body.id;
    }

    const selectRes = await request(app)
      .put(`/api/nodes/${nodeId}/select`)
      .set('Authorization', `Bearer ${token}`);
    expect(selectRes.status).toBe(200);
    expect(selectRes.body.message).toBe('Node selected successfully');

    const publishRes = await request(app)
      .put(`/api/stories/${storyId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: `Flow Story ${suffix}`, summary: 'Integration test', status: 'published' });
    expect(publishRes.status).toBe(200);

    const viewRes = await request(app).get(`/api/stories/${storyId}`);
    expect(viewRes.status).toBe(200);
    expect(viewRes.body.status).toBe('published');
    expect(viewRes.body.nodes.length).toBeGreaterThanOrEqual(3);
  });
});

describe('Untested API Endpoints', () => {
  let token: string;
  let otherToken: string;
  let storyId: number;
  let teamId: number;
  const suffix = Date.now();

  beforeAll(async () => {
    await initDatabase();

    await request(app)
      .post('/api/users/register')
      .send({ username: `untested${suffix}`, password: 'testpass' });
    const loginRes = await request(app)
      .post('/api/users/login')
      .send({ username: `untested${suffix}`, password: 'testpass' });
    token = loginRes.body.token;

    await request(app)
      .post('/api/users/register')
      .send({ username: `other${suffix}`, password: 'testpass' });
    const otherLogin = await request(app)
      .post('/api/users/login')
      .send({ username: `other${suffix}`, password: 'testpass' });
    otherToken = otherLogin.body.token;

    const storyRes = await request(app)
      .post('/api/stories')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: `Untested Story ${suffix}`, summary: 'Test', content: 'Start...', mode: 'free' });
    storyId = storyRes.body.id;
  });

  describe('PUT /api/users/profile', () => {
    it('should update user email', async () => {
      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'updated@test.com' });
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Profile updated successfully');
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .put('/api/users/profile')
        .send({ email: 'test@test.com' });
      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/stories/:id', () => {
    let deleteStoryId: number;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/stories')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: `ToDelete ${suffix}`, summary: 'Will be deleted', content: 'Content...', mode: 'free' });
      deleteStoryId = res.body.id;
    });

    it('should delete a story', async () => {
      const response = await request(app)
        .delete(`/api/stories/${deleteStoryId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Story deleted successfully');
    });

    it('should fail to delete non-existent story', async () => {
      const response = await request(app)
        .delete('/api/stories/99999')
        .set('Authorization', `Bearer ${token}`);
      expect(response.status).toBe(404);
    });

    it('should fail without authentication', async () => {
      const response = await request(app).delete(`/api/stories/${storyId}`);
      expect(response.status).toBe(401);
    });

    it('should fail when not the author', async () => {
      const response = await request(app)
        .delete(`/api/stories/${storyId}`)
        .set('Authorization', `Bearer ${otherToken}`);
      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/stories/my', () => {
    it('should return user stories', async () => {
      const response = await request(app)
        .get('/api/stories/my')
        .set('Authorization', `Bearer ${token}`);
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
    });

    it('should fail without authentication', async () => {
      const response = await request(app).get('/api/stories/my');
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/stories/search', () => {
    it('should return published stories when no query', async () => {
      const response = await request(app).get('/api/stories/search');
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should filter stories by search term', async () => {
      const response = await request(app)
        .get('/api/stories/search')
        .query({ q: 'Untested' });
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Team Leave & Members', () => {
    beforeAll(async () => {
      const teamRes = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: `LeaveTest Team ${suffix}` });
      teamId = teamRes.body.id;
    });

    describe('GET /api/teams/:team_id/members', () => {
      it('should return team members', async () => {
        const response = await request(app)
          .get(`/api/teams/${teamId}/members`);
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBe(1);
        expect(response.body[0].role).toBe('leader');
      });

      it('should fail for non-existent team', async () => {
        const response = await request(app).get('/api/teams/99999/members');
        expect(response.status).toBe(404);
      });
    });

    describe('POST /api/teams/:team_id/leave', () => {
      it('should fail to leave without authentication', async () => {
        const response = await request(app).post(`/api/teams/${teamId}/leave`);
        expect(response.status).toBe(401);
      });

      it('should fail to leave non-existent team', async () => {
        const response = await request(app)
          .post('/api/teams/99999/leave')
          .set('Authorization', `Bearer ${token}`);
        expect(response.status).toBe(404);
      });
    });
  });
});

describe('Boundary & Edge Cases', () => {
  let token: string;
  let otherToken: string;
  let storyId: number;
  const suffix = Date.now();

  beforeAll(async () => {
    await initDatabase();

    await request(app)
      .post('/api/users/register')
      .send({ username: `boundary${suffix}`, password: 'testpass' });
    const loginRes = await request(app)
      .post('/api/users/login')
      .send({ username: `boundary${suffix}`, password: 'testpass' });
    token = loginRes.body.token;

    await request(app)
      .post('/api/users/register')
      .send({ username: `boundaryOther${suffix}`, password: 'testpass' });
    const otherLogin = await request(app)
      .post('/api/users/login')
      .send({ username: `boundaryOther${suffix}`, password: 'testpass' });
    otherToken = otherLogin.body.token;

    const storyRes = await request(app)
      .post('/api/stories')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: `Boundary Story ${suffix}`, summary: 'Test', content: 'Start...', mode: 'free', max_nodes: 5 });
    storyId = storyRes.body.id;
  });

  describe('Authentication Required', () => {
    const authEndpoints: [string, string, any][] = [
      ['POST', '/api/stories', { title: 'No Auth', summary: 'Test', content: 'Test', mode: 'free' }],
      ['PUT', `/api/stories/${storyId}`, { title: 'No Auth', summary: 'Test', status: 'ongoing' }],
      ['POST', '/api/nodes', { story_id: storyId, content: 'No auth node' }],
      ['PUT', `/api/nodes/1/select`, null],
      ['POST', `/api/stories/${storyId}/like`, null],
      ['POST', `/api/stories/${storyId}/favorite`, null],
      ['POST', `/api/nodes/1/coin`, { amount: 1 }],
      ['GET', '/api/favorites', null],
      ['POST', '/api/inventory/exchange', { item_type: 'hint', quantity: 1 }],
      ['POST', '/api/inventory/use', { item_type: 'hint' }],
      ['POST', '/api/teams', { name: 'No Auth Team' }],
      ['POST', `/api/teams/${storyId}/join`, null],
      ['GET', '/api/teams/user', null],
    ];

    authEndpoints.forEach((item: [string, string, any]) => {
      const method = item[0];
      const url = item[1];
      const body = item[2];
      it(`${method} ${url} should return 401 without auth`, async () => {
        let response: any;
        if (body) {
          response = await (request(app) as any)[method.toLowerCase()](url).send(body);
        } else {
          response = await (request(app) as any)[method.toLowerCase()](url);
        }
        expect(response.status).toBe(401);
      });
    });
  });

  describe('Data Validation', () => {
    it('should require username for registration', async () => {
      const response = await request(app)
        .post('/api/users/register')
        .send({ password: 'testpass' });
      expect(response.status).toBe(400);
    });

    it('should require password for registration', async () => {
      const response = await request(app)
        .post('/api/users/register')
        .send({ username: 'nopass' });
      expect(response.status).toBe(400);
    });

    it('should reject invalid JWT token', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer invalid_token_here');
      expect(response.status).toBe(401);
    });
  });

  describe('404 Scenarios', () => {
    it('should return 404 for non-existent story', async () => {
      const response = await request(app).get('/api/stories/99999');
      expect(response.status).toBe(404);
    });

    it('should return 404 for updating non-existent story', async () => {
      const response = await request(app)
        .put('/api/stories/99999')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'No', summary: 'No', status: 'draft' });
      expect(response.status).toBe(404);
    });

    it('should return 404 for non-existent node selection', async () => {
      const response = await request(app)
        .put('/api/nodes/99999/select')
        .set('Authorization', `Bearer ${token}`);
      expect(response.status).toBe(404);
    });
  });

  describe('Business Logic Edge Cases', () => {
    it('should reject adding node when story is completed', async () => {
      await request(app)
        .put(`/api/stories/${storyId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: `Boundary Story ${suffix}`, summary: 'Test', status: 'completed' });

      const response = await request(app)
        .post('/api/nodes')
        .set('Authorization', `Bearer ${token}`)
        .send({ story_id: storyId, content: 'Should fail' });
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Story is not accepting new nodes');
    });

    it('should reject non-member from adding to team story', async () => {
      const teamRes = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: `Team Edge ${suffix}` });

      const teamStoryRes = await request(app)
        .post('/api/stories')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: `Team Edge Story ${suffix}`,
          summary: 'Test',
          content: 'Start...',
          mode: 'team',
          team_id: teamRes.body.id
        });

      await request(app)
        .put(`/api/stories/${teamStoryRes.body.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: `Team Edge Story ${suffix}`, summary: 'Test', status: 'ongoing' });

      const nodeRes = await request(app)
        .post('/api/nodes')
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ story_id: teamStoryRes.body.id, content: 'Should fail' });
      expect(nodeRes.status).toBe(403);
      expect(nodeRes.body.message).toBe('Only team members can add nodes to team stories');
    });

    it('should prevent leader from leaving team with members', async () => {
      const teamRes = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: `Leader Leave Test ${suffix}` });
      const tid = teamRes.body.id;

      await request(app)
        .post(`/api/teams/${tid}/join`)
        .set('Authorization', `Bearer ${otherToken}`);

      const leaveRes = await request(app)
        .post(`/api/teams/${tid}/leave`)
        .set('Authorization', `Bearer ${token}`);
      expect(leaveRes.status).toBe(400);
      expect(leaveRes.body.message).toBe('Transfer leadership before leaving');
    });

    it('should disband team when last leader leaves', async () => {
      const teamRes = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: `Disband Test ${suffix}` });

      const leaveRes = await request(app)
        .post(`/api/teams/${teamRes.body.id}/leave`)
        .set('Authorization', `Bearer ${token}`);
      expect(leaveRes.status).toBe(200);
      expect(leaveRes.body.message).toBe('Team disbanded');
    });
  });
});
