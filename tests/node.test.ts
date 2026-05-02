import request from 'supertest';
import express from 'express';
import cors from 'cors';
import router from '../server/routes';
import { initDatabase } from '../server/db/database';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', router);

describe('Node API', () => {
  let token: string;
  let otherToken: string;
  let storyId: number;
  let branchAId: number;
  let branchBId: number;
  let childOfBranchA: number;

  beforeAll(async () => {
    await initDatabase();

    await request(app)
      .post('/api/users/register')
      .send({ username: 'nodeauthor', password: 'testpass' });

    const loginResponse = await request(app)
      .post('/api/users/login')
      .send({ username: 'nodeauthor', password: 'testpass' });
    token = loginResponse.body.token;

    await request(app)
      .post('/api/users/register')
      .send({ username: 'nodeother', password: 'testpass' });

    const otherLogin = await request(app)
      .post('/api/users/login')
      .send({ username: 'nodeother', password: 'testpass' });
    otherToken = otherLogin.body.token;

    const storyResponse = await request(app)
      .post('/api/stories')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Node Select Story', summary: 'Test for node selection', content: 'Beginning...', mode: 'free', max_nodes: 2 });
    storyId = storyResponse.body.id;

    await request(app)
      .put(`/api/stories/${storyId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Node Select Story', summary: 'Test for node selection', status: 'ongoing' });
  });

  it('should add branch A (low coins)', async () => {
    const response = await request(app)
      .post('/api/nodes')
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ story_id: storyId, content: 'Branch A - low coins' });
    expect(response.status).toBe(201);
    branchAId = response.body.id;
  });

  it('should add branch B (high coins via coin action)', async () => {
    const response = await request(app)
      .post('/api/nodes')
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ story_id: storyId, content: 'Branch B - high coins' });
    expect(response.status).toBe(201);
    branchBId = response.body.id;

    await request(app)
      .post('/api/users/check-in')
      .set('Authorization', `Bearer ${token}`);

    const coinRes = await request(app)
      .post(`/api/nodes/${branchBId}/coin`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 3 });
    expect(coinRes.status).toBe(200);
  });

  it('should auto-select branch B with higher coins after coin action', async () => {
    const storyRes = await request(app).get(`/api/stories/${storyId}`);
    const nodes = storyRes.body.nodes as any[];
    const branchA = nodes.find((n: any) => n.id === branchAId);
    const branchB = nodes.find((n: any) => n.id === branchBId);
    expect(branchB.coins).toBe(3);
    expect(branchB.is_selected).toBeTruthy();
    expect(branchA.is_selected).toBeFalsy();
  });

  it('should get all nodes for story', async () => {
    const response = await request(app).get(`/api/nodes/${storyId}`);
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThanOrEqual(3);
  });

  it('should fail to select node by non-author', async () => {
    const response = await request(app)
      .put(`/api/nodes/${branchAId}/select`)
      .set('Authorization', `Bearer ${otherToken}`);

    expect(response.status).toBe(403);
    expect(response.body.message).toBe('Only story author can select nodes');
  });

  it('should add child under branch A and reach max nodes', async () => {
    const response = await request(app)
      .post('/api/nodes')
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ story_id: storyId, parent_id: branchAId, content: 'Child of A...' });
    expect(response.status).toBe(201);
    childOfBranchA = response.body.id;
  });

  it('should fail to add node when story is maxed', async () => {
    const response = await request(app)
      .post('/api/nodes')
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ story_id: storyId, content: 'Should fail...' });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Story has reached maximum nodes');
  });

  it('should manually select branch A by author, overriding coin-based selection', async () => {
    const response = await request(app)
      .put(`/api/nodes/${branchAId}/select`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Node selected successfully');
  });

  it('should mark branch A as selected and is_manual_selected', async () => {
    const storyRes = await request(app).get(`/api/stories/${storyId}`);
    const nodes = storyRes.body.nodes as any[];
    const branchA = nodes.find((n: any) => n.id === branchAId);
    const branchB = nodes.find((n: any) => n.id === branchBId);

    expect(branchA.is_selected).toBeTruthy();
    expect(branchA.is_manual_selected).toBeTruthy();
    expect(branchB.is_selected).toBeFalsy();
  });

  it('should continue chain from manually selected branch A to its child', async () => {
    const storyRes = await request(app).get(`/api/stories/${storyId}`);
    const nodes = storyRes.body.nodes as any[];
    const childA = nodes.find((n: any) => n.id === childOfBranchA);
    expect(childA.is_selected).toBeTruthy();
  });

  it('should show correct timeline with manual override', async () => {
    const timelineRes = await request(app).get(`/api/stories/${storyId}/timeline`);
    expect(timelineRes.body.node_count).toBe(3);
    expect(timelineRes.body.nodes[1].id).toBe(branchAId);
    expect(timelineRes.body.nodes[2].id).toBe(childOfBranchA);
  });

  it('should change story status to completed when max nodes reached', async () => {
    const storyResponse = await request(app).get(`/api/stories/${storyId}`);
    expect(storyResponse.body.status).toBe('completed');
  });
});
