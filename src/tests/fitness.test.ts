import { build } from '../app';
import { prismaMock } from './setup';
import { FastifyInstance } from 'fastify';
import supertest from 'supertest';
import { generateToken } from '../auth';

describe('Fitness Routes', () => {
  let app: FastifyInstance;
  let authToken: string;

  const testUser = {
    id: '1',
    email: 'test@example.com',
    name: 'Test User',
    password: 'hashedPassword',
    salt: 'salt',
    createdAt: new Date(),
    updatedAt: new Date(),
    fitnessGoalId: null
  };

  beforeAll(async () => {
    app = build();
    await app.ready();
    authToken = generateToken(testUser);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /fitness/goals', () => {
    it('should create new fitness goals', async () => {
      const newGoals = {
        calories: 2000,
        protein: 150,
        carbs: 200,
        fat: 70,
        water: 2000,
        allergies: ['peanuts', 'shellfish']
      };

      prismaMock.fitnessGoals.findFirst.mockResolvedValue(null);
      prismaMock.fitnessGoals.create.mockResolvedValue({
        id: '1',
        userId: testUser.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...newGoals
      });

      const response = await supertest(app.server)
        .post('/fitness/goals')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newGoals);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject(newGoals);
    });

    it('should update existing fitness goals', async () => {
      const existingGoals = {
        id: '1',
        userId: testUser.id,
        calories: 2000,
        protein: 150,
        carbs: 200,
        fat: 70,
        water: 2000,
        allergies: ['peanuts'],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const updatedGoals = {
        calories: 2200,
        protein: 160,
        carbs: 220,
        fat: 75,
        water: 2500,
        allergies: ['peanuts', 'shellfish']
      };

      prismaMock.fitnessGoals.findFirst.mockResolvedValue(existingGoals);
      prismaMock.fitnessGoals.update.mockResolvedValue({
        ...existingGoals,
        ...updatedGoals,
        updatedAt: new Date()
      });

      const response = await supertest(app.server)
        .post('/fitness/goals')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updatedGoals);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject(updatedGoals);
    });
  });

  describe('GET /fitness/goals', () => {
    it('should return user fitness goals', async () => {
      const goals = {
        id: '1',
        userId: testUser.id,
        calories: 2000,
        protein: 150,
        carbs: 200,
        fat: 70,
        water: 2000,
        allergies: ['peanuts'],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      prismaMock.fitnessGoals.findFirst.mockResolvedValue(goals);

      const response = await supertest(app.server)
        .get('/fitness/goals')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        calories: goals.calories,
        protein: goals.protein,
        carbs: goals.carbs,
        fat: goals.fat,
        water: goals.water,
        allergies: goals.allergies
      });
    });

    it('should return 404 when no goals exist', async () => {
      prismaMock.fitnessGoals.findFirst.mockResolvedValue(null);

      const response = await supertest(app.server)
        .get('/fitness/goals')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'No fitness goals found');
    });
  });
}); 