import { build } from '../app';
import { prismaMock } from './setup';
import { FastifyInstance } from 'fastify';
import supertest from 'supertest';

describe('Auth Routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = build();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/register', () => {
    it('should register a new user', async () => {
      const newUser = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      };

      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue({
        id: '1',
        email: newUser.email,
        name: newUser.name,
        password: expect.any(String),
        salt: expect.any(String),
        createdAt: new Date(),
        updatedAt: new Date(),
        fitnessGoalId: null
      });

      const response = await supertest(app.server)
        .post('/auth/register')
        .send(newUser);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
    });

    it('should not register an existing user', async () => {
      const existingUser = {
        email: 'existing@example.com',
        password: 'password123'
      };

      prismaMock.user.findUnique.mockResolvedValue({
        id: '1',
        email: existingUser.email,
        password: 'hashedPassword',
        salt: 'salt',
        createdAt: new Date(),
        updatedAt: new Date(),
        name: null,
        fitnessGoalId: null
      });

      const response = await supertest(app.server)
        .post('/auth/register')
        .send(existingUser);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Email already registered');
    });
  });
}); 