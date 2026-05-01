import request from 'supertest';
import express from 'express';
import cors from 'cors';
import router from '../server/routes';
import { initDatabase, execute } from '../server/db/database';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', router);

describe('Interaction API', () => {
  let token: string;
  let storyId: number;
  let nodeId: number;
  let otherToken: string;
  let otherUserId: number;

  beforeAll(async () => {
    await initDatabase();

    await request(app)
      .post('/api/users/register')
      .send({ username: 'interactionuser', password: 'testpass' });

    const loginResponse = await request(app)
      .post('/api/users/login')
      .send({ username: 'interactionuser', password: 'testpass' });
    token = loginResponse.body.token;

    await request(app)
      .post('/api/users/register')
      .send({ username: 'otheruser', password: 'testpass' });

    const otherLogin = await request(app)
      .post('/api/users/login')
      .send({ username: 'otheruser', password: 'testpass' });
    otherToken = otherLogin.body.token;
    otherUserId = otherLogin.body.user.id;

    // Give the other user enough points for coin tests
    execute('UPDATE users SET points = 100 WHERE id = ?', [otherUserId]);

    const storyResponse = await request(app)
      .post('/api/stories')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Interaction Story', summary: 'Test for interactions', content: 'Start...', mode: 'free', max_nodes: 5 });
    storyId = storyResponse.body.id;

    await request(app)
      .put(`/api/stories/${storyId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Interaction Story', summary: 'Test for interactions', status: 'ongoing' });

    const nodeResponse = await request(app)
      .post('/api/nodes')
      .set('Authorization', `Bearer ${token}`)
      .send({ story_id: storyId, content: 'First continuation...' });
    nodeId = nodeResponse.body.id;
  });

  describe('Coin Node', () => {
    it('should coin a node successfully', async () => {
      const response = await request(app)
        .post(`/api/nodes/${nodeId}/coin`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ amount: 1 });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Coins added');
    });

    it('should fail to coin without authentication', async () => {
      const response = await request(app)
        .post(`/api/nodes/${nodeId}/coin`)
        .send({ amount: 1 });

      expect(response.status).toBe(401);
    });

    it('should fail with insufficient points', async () => {
      execute('UPDATE users SET points = 0 WHERE id = ?', [otherUserId]);

      const response = await request(app)
        .post(`/api/nodes/${nodeId}/coin`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ amount: 1 });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Insufficient points');

      execute('UPDATE users SET points = 100 WHERE id = ?', [otherUserId]);
    });

    it('should fail with invalid amount', async () => {
      const response = await request(app)
        .post(`/api/nodes/${nodeId}/coin`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ amount: -1 });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Amount must be a positive integer');
    });

    it('should accumulate coins on repeated coins', async () => {
      await request(app)
        .post(`/api/nodes/${nodeId}/coin`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ amount: 1 });

      const storyResponse = await request(app).get(`/api/stories/${storyId}`);
      const node = storyResponse.body.nodes.find((n: any) => n.id === nodeId);
      expect(node.coins).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Like Story', () => {
    it('should like a story', async () => {
      const response = await request(app)
        .post(`/api/stories/${storyId}/like`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Like added');
    });

    it('should toggle like (remove)', async () => {
      const response = await request(app)
        .post(`/api/stories/${storyId}/like`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Like removed');
    });
  });

  describe('Favorite Story', () => {
    it('should favorite a story', async () => {
      const response = await request(app)
        .post(`/api/stories/${storyId}/favorite`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Favorite added');
    });

    it('should toggle favorite (remove)', async () => {
      const response = await request(app)
        .post(`/api/stories/${storyId}/favorite`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Favorite removed');
    });

    it('should list user favorites', async () => {
      await request(app)
        .post(`/api/stories/${storyId}/favorite`)
        .set('Authorization', `Bearer ${otherToken}`);

      const response = await request(app)
        .get('/api/favorites')
        .set('Authorization', `Bearer ${otherToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
    });
  });
});
