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
  let nodeId: number;

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

  it('should add multiple nodes', async () => {
    const response1 = await request(app)
      .post('/api/nodes')
      .set('Authorization', `Bearer ${token}`)
      .send({ story_id: storyId, content: 'First branch...' });
    expect(response1.status).toBe(201);
    nodeId = response1.body.id;

    const response2 = await request(app)
      .post('/api/nodes')
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ story_id: storyId, parent_id: nodeId, content: 'Second branch...' });
    expect(response2.status).toBe(201);
  });

  it('should get nodes for a story', async () => {
    const response = await request(app).get(`/api/nodes/${storyId}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThanOrEqual(3);
  });

  it('should fail to add node when story is maxed', async () => {
    const response = await request(app)
      .post('/api/nodes')
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ story_id: storyId, content: 'Should fail...' });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Story has reached maximum nodes');
  });

  describe('Select Node', () => {
    it('should fail to select node by non-author', async () => {
      const response = await request(app)
        .put(`/api/nodes/${nodeId}/select`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Only story author can select nodes');
    });

    it('should select a node by author', async () => {
      const response = await request(app)
        .put(`/api/nodes/${nodeId}/select`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Node selected successfully');
    });

    it('should mark node as selected', async () => {
      const storyResponse = await request(app).get(`/api/stories/${storyId}`);

      const selectedNode = storyResponse.body.nodes.find((n: any) => n.is_selected);
      expect(selectedNode).toBeDefined();
      expect(selectedNode.id).toBe(nodeId);
    });

    it('should change story status to completed when max nodes reached', async () => {
      const storyResponse = await request(app).get(`/api/stories/${storyId}`);
      expect(storyResponse.body.status).toBe('completed');
    });
  });
});
