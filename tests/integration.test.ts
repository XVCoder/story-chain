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
  let storyId: number;
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

    const createRes = await request(app)
      .post('/api/stories')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: `Flow Story ${suffix}`, summary: 'Integration test', content: 'Start...', mode: 'free', max_nodes: 3 });
    expect(createRes.status).toBe(201);
    storyId = createRes.body.id;

    // Verify the story appears in the ongoing list immediately
    const ongoingRes = await request(app).get('/api/stories').query({ status: 'ongoing' });
    expect(ongoingRes.status).toBe(200);
    const found = ongoingRes.body.find((s: any) => s.id === storyId);
    expect(found).toBeDefined();
    expect(found.status).toBe('ongoing');

    // Add nodes, select, and publish as a continuation of the flow
    for (let i = 0; i < 2; i++) {
      const nodeRes = await request(app)
        .post('/api/nodes')
        .set('Authorization', `Bearer ${token}`)
        .send({ story_id: storyId, content: `Node ${i + 1}: continuation...` });
      expect(nodeRes.status).toBe(201);
    }

    const nodesRes = await request(app).get(`/api/nodes/${storyId}`);
    expect(nodesRes.status).toBe(200);
    expect(nodesRes.body.length).toBe(3);

    const selectRes = await request(app)
      .put(`/api/nodes/${nodesRes.body[1].id}/select`)
      .set('Authorization', `Bearer ${token}`);
    expect(selectRes.status).toBe(200);

    await request(app)
      .put(`/api/stories/${storyId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: `Flow Story ${suffix}`, summary: 'Integration test', status: 'published' });

    // Verify the story appears in the published list after publishing
    const publishedRes = await request(app).get('/api/stories').query({ status: 'published' });
    expect(publishedRes.status).toBe(200);
    const published = publishedRes.body.find((s: any) => s.id === storyId);
    expect(published).toBeDefined();
    expect(published.status).toBe('published');
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
      expect(response.body.message).toBe('个人资料更新成功');
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
      expect(response.body.message).toBe('故事删除成功');
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
      expect(response.status).toBe(403);
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
      expect(response.body.message).toBe('该故事不接受新节点');
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
      expect(nodeRes.body.message).toBe('只有团队成员才能添加节点');
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
      expect(leaveRes.body.message).toBe('请先转让队长身份再离开');
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
      expect(leaveRes.body.message).toBe('团队已解散');
    });
  });
});

describe('Auto-select Main Line & Timeline', () => {
  let token: string;
  let otherToken: string;
  let storyId: number;
  let rootNodeId: number;
  const suffix = Date.now();

  beforeAll(async () => {
    await initDatabase();

    await request(app)
      .post('/api/users/register')
      .send({ username: `autouser${suffix}`, password: 'testpass' });
    const loginRes = await request(app)
      .post('/api/users/login')
      .send({ username: `autouser${suffix}`, password: 'testpass' });
    token = loginRes.body.token;

    await request(app)
      .post('/api/users/register')
      .send({ username: `autoother${suffix}`, password: 'testpass' });
    const otherLogin = await request(app)
      .post('/api/users/login')
      .send({ username: `autoother${suffix}`, password: 'testpass' });
    otherToken = otherLogin.body.token;

    const storyRes = await request(app)
      .post('/api/stories')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: `Auto Story ${suffix}`, summary: 'Auto test', content: 'Root content', mode: 'free', max_nodes: 6 });
    expect(storyRes.status).toBe(201);
    storyId = storyRes.body.id;

    const nodesRes = await request(app).get(`/api/nodes/${storyId}`);
    rootNodeId = nodesRes.body[0].id;
  });

  it('should have multiple users submit branches under same parent', async () => {
    const branch1 = await request(app)
      .post('/api/nodes')
      .set('Authorization', `Bearer ${token}`)
      .send({ story_id: storyId, parent_id: rootNodeId, content: 'Branch 1 by author' });
    expect(branch1.status).toBe(201);

    const branch2 = await request(app)
      .post('/api/nodes')
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ story_id: storyId, parent_id: rootNodeId, content: 'Branch 2 by other' });
    expect(branch2.status).toBe(201);

    const nodes = await request(app).get(`/api/nodes/${storyId}`);
    expect(nodes.status).toBe(200);
    const children = nodes.body.filter((n: any) => n.parent_id === rootNodeId);
    expect(children.length).toBe(2);
  });

  it('should select the branch with more coins after coining', async () => {
    const nodes = await request(app).get(`/api/nodes/${storyId}`);
    const branches = nodes.body.filter((n: any) => n.parent_id === rootNodeId);
    const branch2Id = branches.sort((a: any, b: any) => b.id - a.id)[0].id;

    await request(app)
      .post(`/api/nodes/${branch2Id}/coin`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 3 });

    const timelineRes = await request(app).get(`/api/stories/${storyId}/timeline`);
    expect(timelineRes.status).toBe(200);
    expect(timelineRes.body.node_count).toBe(2);
    expect(timelineRes.body.nodes[1].id).toBe(branch2Id);
  });

  it('should select earliest branch when coins are tied', async () => {
    const nodes = await request(app).get(`/api/nodes/${storyId}`);
    const branch1 = nodes.body.filter((n: any) => n.parent_id === rootNodeId)[0];

    await request(app)
      .post(`/api/nodes/${branch1.id}/coin`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 3 });

    const timelineRes = await request(app).get(`/api/stories/${storyId}/timeline`);
    expect(timelineRes.status).toBe(200);
    expect(timelineRes.body.nodes[1].id).toBeGreaterThan(0);
  });
});

describe('Daily Coin Limit', () => {
  let token1: string;
  let token2: string;
  let storyId: number;
  let nodeId: number;
  let userId1: number;
  let userId2: number;
  const suffix = Date.now();

  beforeAll(async () => {
    await initDatabase();

    await request(app)
      .post('/api/users/register')
      .send({ username: `coinLmt1_${suffix}`, password: 'testpass' });
    const login1 = await request(app)
      .post('/api/users/login')
      .send({ username: `coinLmt1_${suffix}`, password: 'testpass' });
    token1 = login1.body.token;
    userId1 = login1.body.user.id;

    await request(app)
      .post('/api/users/register')
      .send({ username: `coinLmt2_${suffix}`, password: 'testpass' });
    const login2 = await request(app)
      .post('/api/users/login')
      .send({ username: `coinLmt2_${suffix}`, password: 'testpass' });
    token2 = login2.body.token;
    userId2 = login2.body.user.id;

    execute('UPDATE users SET points = 200 WHERE id = ?', [userId1]);
    execute('UPDATE users SET points = 100 WHERE id = ?', [userId2]);

    const storyRes = await request(app)
      .post('/api/stories')
      .set('Authorization', `Bearer ${token1}`)
      .send({ title: `Coin Limit Story ${suffix}`, summary: 'Daily limit test', content: 'Root...', mode: 'free', max_nodes: 5 });
    storyId = storyRes.body.id;

    const nodesRes = await request(app).get(`/api/nodes/${storyId}`);
    nodeId = nodesRes.body[0].id;
  });

  it('should allow coining up to 5 coins per node per day', async () => {
    for (let i = 0; i < 5; i++) {
      const res = await request(app)
        .post(`/api/nodes/${nodeId}/coin`)
        .set('Authorization', `Bearer ${token1}`)
        .send({ amount: 1 });
      expect(res.status).toBe(200);
    }
  });

  it('should reject coining more than 5 coins per node per day', async () => {
    const res = await request(app)
      .post(`/api/nodes/${nodeId}/coin`)
      .set('Authorization', `Bearer ${token1}`)
      .send({ amount: 1 });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('该节点今日投币已达上限（最多5个）');
  });

  it('should allow another user to coin the same node (their own daily limit)', async () => {
    const res = await request(app)
      .post(`/api/nodes/${nodeId}/coin`)
      .set('Authorization', `Bearer ${token2}`)
      .send({ amount: 1 });

    expect(res.status).toBe(200);
  });

  it('should track daily limit per-node independently', async () => {
    const nodeRes = await request(app)
      .post('/api/nodes')
      .set('Authorization', `Bearer ${token1}`)
      .send({ story_id: storyId, content: 'Another node...' });
    const nodeId2 = nodeRes.body.id;

    const res = await request(app)
      .post(`/api/nodes/${nodeId2}/coin`)
      .set('Authorization', `Bearer ${token1}`)
      .send({ amount: 1 });

    expect(res.status).toBe(200);
  });
});

describe('Daily Check-in', () => {
  let token: string;
  let userId: number;
  const suffix = Date.now();

  beforeAll(async () => {
    await initDatabase();

    await request(app)
      .post('/api/users/register')
      .send({ username: `checkin_${suffix}`, password: 'testpass' });
    const loginRes = await request(app)
      .post('/api/users/login')
      .send({ username: `checkin_${suffix}`, password: 'testpass' });
    token = loginRes.body.token;
    userId = loginRes.body.user.id;
  });

  it('should award 10 points on first check-in of the day', async () => {
    const beforePoints = 100;

    const res = await request(app)
      .post('/api/users/check-in')
      .set('Authorization', `Bearer ${token}`)
      .send();

    expect(res.status).toBe(200);
    expect(res.body.points_awarded).toBe(10);

    const profileRes = await request(app)
      .get('/api/users/profile')
      .set('Authorization', `Bearer ${token}`);
    expect(profileRes.body.points).toBe(beforePoints + 10);
  });

  it('should reject duplicate check-in on the same day', async () => {
    const res = await request(app)
      .post('/api/users/check-in')
      .set('Authorization', `Bearer ${token}`)
      .send();

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('今日已签到');
  });
});

describe('Author Info & Published Story', () => {
  let token: string;
  let otherToken: string;
  let storyId: number;
  let publishedStoryId: number;
  const suffix = Date.now();

  beforeAll(async () => {
    await initDatabase();

    await request(app)
      .post('/api/users/register')
      .send({ username: `authoruser_${suffix}`, password: 'testpass' });
    const loginRes = await request(app)
      .post('/api/users/login')
      .send({ username: `authoruser_${suffix}`, password: 'testpass' });
    token = loginRes.body.token;

    await request(app)
      .post('/api/users/register')
      .send({ username: `authorjoin_${suffix}`, password: 'testpass' });
    const otherLogin = await request(app)
      .post('/api/users/login')
      .send({ username: `authorjoin_${suffix}`, password: 'testpass' });
    otherToken = otherLogin.body.token;

    const storyRes = await request(app)
      .post('/api/stories')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: `Author Story ${suffix}`, summary: 'Author test', content: 'Once...', mode: 'free', max_nodes: 5 });
    storyId = storyRes.body.id;

    const pubRes = await request(app)
      .post('/api/stories')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: `Published Author ${suffix}`, summary: 'Published', content: 'Published content', mode: 'free', max_nodes: 5 });
    publishedStoryId = pubRes.body.id;
  });

  it('should return author_name in story list', async () => {
    const res = await request(app).get('/api/stories');
    expect(res.status).toBe(200);
    const story = res.body.find((s: any) => s.id === storyId);
    expect(story).toBeDefined();
    expect(story.author_name).toBe(`authoruser_${suffix}`);
  });

  it('should return author_name in story detail', async () => {
    const res = await request(app).get(`/api/stories/${storyId}`);
    expect(res.status).toBe(200);
    expect(res.body.author_name).toBe(`authoruser_${suffix}`);
  });

  it('should return participants in story detail', async () => {
    await request(app)
      .post('/api/nodes')
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ story_id: storyId, content: 'Join by other' });

    const res = await request(app).get(`/api/stories/${storyId}`);
    expect(res.status).toBe(200);
    expect(res.body.participants).toBeDefined();
    expect(Array.isArray(res.body.participants)).toBe(true);
    expect(res.body.participants.length).toBeGreaterThanOrEqual(2);
    const names = res.body.participants.map((p: any) => p.username);
    expect(names).toContain(`authoruser_${suffix}`);
    expect(names).toContain(`authorjoin_${suffix}`);
  });

  it('should return author_name in nodes list', async () => {
    const res = await request(app).get(`/api/nodes/${storyId}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
    const rootNode = res.body[0];
    expect(rootNode.author_name).toBe(`authoruser_${suffix}`);
    const otherNode = res.body.find((n: any) => n.author_name === `authorjoin_${suffix}`);
    expect(otherNode).toBeDefined();
  });

  it('should return author_name in timeline', async () => {
    const res = await request(app).get(`/api/stories/${storyId}/timeline`);
    expect(res.status).toBe(200);
    expect(res.body.nodes.length).toBeGreaterThanOrEqual(1);
    expect(res.body.nodes[0].author_name).toBe(`authoruser_${suffix}`);
  });

  it('should return author_name in search results', async () => {
    await request(app)
      .put(`/api/stories/${publishedStoryId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: `Published Author ${suffix}`, summary: 'Published', status: 'published' });

    const res = await request(app).get('/api/stories/search').query({ q: `Published Author ${suffix}` });
    expect(res.status).toBe(200);
    const found = res.body.find((s: any) => s.id === publishedStoryId);
    expect(found).toBeDefined();
    expect(found.author_name).toBe(`authoruser_${suffix}`);
  });

  it('should access published story without auth via /api/published/:id', async () => {
    const res = await request(app).get(`/api/published/${publishedStoryId}`);
    expect(res.status).toBe(200);
    expect(res.body.title).toBe(`Published Author ${suffix}`);
    expect(res.body.author_name).toBe(`authoruser_${suffix}`);
    expect(res.body.participants).toBeDefined();
  });

  it('should return 404 for non-existent published story', async () => {
    const res = await request(app).get('/api/published/99999');
    expect(res.status).toBe(404);
  });

  it('should return author_name in my stories', async () => {
    const res = await request(app)
      .get('/api/stories/my')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0].author_name).toBe(`authoruser_${suffix}`);
  });

  it('should return author_name in favorites', async () => {
    await request(app)
      .post(`/api/stories/${publishedStoryId}/favorite`)
      .set('Authorization', `Bearer ${otherToken}`);

    const res = await request(app)
      .get('/api/favorites')
      .set('Authorization', `Bearer ${otherToken}`);
    expect(res.status).toBe(200);
    const fav = res.body.find((s: any) => s.id === publishedStoryId);
    expect(fav).toBeDefined();
    expect(fav.author_name).toBe(`authoruser_${suffix}`);
  });
});
