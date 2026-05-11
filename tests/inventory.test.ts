import request from 'supertest';
import express from 'express';
import cors from 'cors';
import router from '../server/routes';
import { initDatabase } from '../server/db/database';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', router);

describe('Inventory API', () => {
  let token: string;
  let storyId: number;

  beforeAll(async () => {
    await initDatabase();

    const uniqueName = `invuser${Date.now()}`;
    await request(app)
      .post('/api/users/register')
      .send({ username: uniqueName, password: 'testpass' });
    const loginResponse = await request(app)
      .post('/api/users/login')
      .send({ username: uniqueName, password: 'testpass' });
    token = loginResponse.body.token;

    const storyResponse = await request(app)
      .post('/api/stories')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Inventory Story', summary: 'Test inventory', content: 'Start...', mode: 'free', max_nodes: 3 });
    storyId = storyResponse.body.id;
  });

  describe('Exchange Points', () => {
    it('should fail with invalid item type', async () => {
      const response = await request(app)
        .post('/api/inventory/exchange')
        .set('Authorization', `Bearer ${token}`)
        .send({ item_type: 'invalid_item', quantity: 1 });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的道具类型');
    });

    it('should fail with insufficient points', async () => {
      const response = await request(app)
        .post('/api/inventory/exchange')
        .set('Authorization', `Bearer ${token}`)
        .send({ item_type: 'ai_polish', quantity: 2 });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('积分不足');
    });
  });

  describe('Get Inventory', () => {
    it('should return empty inventory for new user', async () => {
      const response = await request(app)
        .get('/api/inventory')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should fail without authentication', async () => {
      const response = await request(app).get('/api/inventory');

      expect(response.status).toBe(401);
    });
  });

  describe('Use Item', () => {
    it('should fail when item not available', async () => {
      const response = await request(app)
        .post('/api/inventory/use')
        .set('Authorization', `Bearer ${token}`)
        .send({ item_type: 'ai_polish', story_id: storyId });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('道具不足');
    });
  });
});
