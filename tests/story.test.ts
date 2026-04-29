import request from 'supertest';
import express from 'express';
import cors from 'cors';
import router from '../server/routes';
import { initDatabase } from '../server/db/database';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', router);

describe('Story API', () => {
  let token: string;
  let storyId: number;

  beforeAll(async () => {
    await initDatabase();
    
    await request(app)
      .post('/api/users/register')
      .send({ username: 'storyuser', password: 'testpass' });
    
    const loginResponse = await request(app)
      .post('/api/users/login')
      .send({ username: 'storyuser', password: 'testpass' });
    
    token = loginResponse.body.token;
  });

  it('should create a story', async () => {
    const response = await request(app)
      .post('/api/stories')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Test Story',
        summary: 'A test story summary',
        content: 'Once upon a time...',
        mode: 'free',
        max_nodes: 5,
      });
    
    expect(response.status).toBe(201);
    storyId = response.body.id;
  });

  it('should get all stories', async () => {
    const response = await request(app).get('/api/stories');
    
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it('should get story by id', async () => {
    const response = await request(app).get(`/api/stories/${storyId}`);
    
    expect(response.status).toBe(200);
    expect(response.body.title).toBe('Test Story');
    expect(response.body).toHaveProperty('nodes');
  });

  it('should add a node to story', async () => {
    await request(app)
      .put(`/api/stories/${storyId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Test Story', summary: 'A test story summary', status: 'ongoing' });
    
    const response = await request(app)
      .post('/api/nodes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        story_id: storyId,
        content: 'Continuation of the story...',
      });
    
    expect(response.status).toBe(201);
  });

  it('should like a story', async () => {
    const response = await request(app)
      .post(`/api/stories/${storyId}/like`)
      .set('Authorization', `Bearer ${token}`);
    
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Like added');
  });

  it('should favorite a story', async () => {
    const response = await request(app)
      .post(`/api/stories/${storyId}/favorite`)
      .set('Authorization', `Bearer ${token}`);
    
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Favorite added');
  });
});
