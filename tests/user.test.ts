import request from 'supertest';
import express from 'express';
import cors from 'cors';
import router from '../server/routes';
import { initDatabase } from '../server/db/database';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', router);

describe('User API', () => {
  beforeAll(async () => {
    await initDatabase();
  });

  let token: string;
  const uniqueName = `testuser${Date.now()}`;

  it('should register a new user', async () => {
    const response = await request(app)
      .post('/api/users/register')
      .send({ username: uniqueName, password: 'testpass', email: 'test@test.com' });
    
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.username).toBe(uniqueName);
  });

  it('should not register duplicate username', async () => {
    const response = await request(app)
      .post('/api/users/register')
      .send({ username: uniqueName, password: 'testpass' });
    
    expect(response.status).toBe(400);
  });

  it('should login with correct credentials', async () => {
    const response = await request(app)
      .post('/api/users/login')
      .send({ username: uniqueName, password: 'testpass' });
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
    expect(response.body.user.username).toBe(uniqueName);
    token = response.body.token;
  });

  it('should not login with wrong password', async () => {
    const response = await request(app)
      .post('/api/users/login')
      .send({ username: uniqueName, password: 'wrongpass' });
    
    expect(response.status).toBe(401);
  });

  it('should get user profile', async () => {
    const response = await request(app)
      .get('/api/users/profile')
      .set('Authorization', `Bearer ${token}`);
    
    expect(response.status).toBe(200);
    expect(response.body.username).toBe(uniqueName);
  });

  it('should get user stats', async () => {
    const response = await request(app)
      .get('/api/users/stats')
      .set('Authorization', `Bearer ${token}`);
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('created_stories');
    expect(response.body).toHaveProperty('participated_stories');
    expect(response.body).toHaveProperty('received_coins');
  });

  it('should check in successfully', async () => {
    const response = await request(app)
      .post('/api/users/check-in')
      .set('Authorization', `Bearer ${token}`);
    
    expect(response.status).toBe(200);
    expect(response.body.points_awarded).toBe(10);
  });

  it('should reject duplicate check-in on same day', async () => {
    const response = await request(app)
      .post('/api/users/check-in')
      .set('Authorization', `Bearer ${token}`);
    
    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Already checked in today');
  });

  it('should reject registration with short password', async () => {
    const response = await request(app)
      .post('/api/users/register')
      .send({ username: `shortpass_${Date.now()}`, password: '123' });
    
    expect(response.status).toBe(400);
  });
});
