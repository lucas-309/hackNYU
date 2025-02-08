import { build } from '../app';
import { prismaMock } from './setup';
import { FastifyInstance } from 'fastify';
import supertest from 'supertest';
import { generateToken } from '../auth';
import { spawn } from 'child_process';

// Mock child_process
jest.mock('child_process', () => ({
  spawn: jest.fn()
}));

describe('Recipe Routes', () => {
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

  const testFitnessGoals = {
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

  beforeAll(async () => {
    app = build();
    await app.ready();
    authToken = generateToken(testUser);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /recipes', () => {
    it('should return all recipes', async () => {
      const mockRecipes = [
        {
          id: '1',
          name: 'Test Recipe',
          ingredients: 'Test ingredients',
          steps: 'Test steps',
          image: 'test.jpg',
          authorId: '1',
          createdAt: new Date(),
          updatedAt: new Date(),
          savedByUserId: null,
          viewedByUserId: null
        }
      ];

      prismaMock.recipe.findMany.mockResolvedValue(mockRecipes);

      const response = await supertest(app.server)
        .get('/recipes')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBeTruthy();
      expect(response.body[0]).toHaveProperty('name', 'Test Recipe');
    });
  });

  describe('POST /recipes', () => {
    it('should create a new recipe', async () => {
      const newRecipe = {
        name: 'New Recipe',
        ingredients: 'New ingredients',
        steps: 'New steps',
        image: 'new.jpg'
      };

      prismaMock.recipe.create.mockResolvedValue({
        ...newRecipe,
        id: '2',
        authorId: '1',
        createdAt: new Date(),
        updatedAt: new Date(),
        savedByUserId: null,
        viewedByUserId: null
      });

      const response = await supertest(app.server)
        .post('/recipes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newRecipe);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('name', newRecipe.name);
    });
  });

  describe('POST /recipes/generate', () => {
    it('should generate a recipe using AI', async () => {
      // Mock the Python process
      const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;
      mockSpawn.mockImplementation(() => {
        const mockProcess = {
          stdin: {
            write: jest.fn(),
            end: jest.fn()
          },
          stdout: {
            on: jest.fn((event, callback) => {
              if (event === 'data') {
                callback(JSON.stringify({
                  name: 'AI Generated Recipe',
                  ingredients: [
                    { item: 'chicken', quantity: '200g' },
                    { item: 'rice', quantity: '100g' }
                  ],
                  instructions: [
                    'Cook the chicken',
                    'Prepare the rice'
                  ],
                  cooking_time: 30,
                  difficulty: 'medium',
                  nutritional_info: {
                    calories: 500,
                    protein: 40,
                    carbs: 50,
                    fat: 15
                  }
                }));
              }
            })
          },
          stderr: {
            on: jest.fn()
          },
          on: jest.fn((event, callback) => {
            if (event === 'close') {
              callback(0);
            }
          })
        };
        return mockProcess as any;
      });

      // Mock Prisma responses
      prismaMock.fitnessGoals.findFirst.mockResolvedValue(testFitnessGoals);
      prismaMock.user.findUnique.mockResolvedValue(testUser);
      prismaMock.recipe.create.mockResolvedValue({
        id: '1',
        name: 'AI Generated Recipe',
        ingredients: JSON.stringify([
          { item: 'chicken', quantity: '200g' },
          { item: 'rice', quantity: '100g' }
        ]),
        steps: 'Cook the chicken\nPrepare the rice',
        image: '',
        authorId: testUser.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        savedByUserId: null,
        viewedByUserId: null
      });

      const response = await supertest(app.server)
        .post('/recipes/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ingredients: ['chicken', 'rice'],
          skillLevel: 2,
          preferences: {
            lowCarb: true,
            highProtein: true
          },
          maxCookingTime: 30
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        name: 'AI Generated Recipe',
        ingredients: expect.any(String),
        steps: expect.any(String)
      });
    });

    it('should return 400 if user has no fitness goals', async () => {
      prismaMock.fitnessGoals.findFirst.mockResolvedValue(null);

      const response = await supertest(app.server)
        .post('/recipes/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ingredients: ['chicken', 'rice']
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Please set your fitness goals before generating recipes');
    });

    it('should handle AI generation errors', async () => {
      prismaMock.fitnessGoals.findFirst.mockResolvedValue(testFitnessGoals);
      prismaMock.user.findUnique.mockResolvedValue(testUser);

      // Mock Python process error
      const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;
      mockSpawn.mockImplementation(() => {
        const mockProcess = {
          stdin: {
            write: jest.fn(),
            end: jest.fn()
          },
          stdout: {
            on: jest.fn()
          },
          stderr: {
            on: jest.fn((event, callback) => {
              if (event === 'data') {
                callback('AI generation error');
              }
            })
          },
          on: jest.fn((event, callback) => {
            if (event === 'close') {
              callback(1);
            }
          })
        };
        return mockProcess as any;
      });

      const response = await supertest(app.server)
        .post('/recipes/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ingredients: ['chicken', 'rice']
        });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Failed to generate recipe');
    });

    it('should validate request body', async () => {
      const response = await supertest(app.server)
        .post('/recipes/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // Missing required ingredients
          skillLevel: 4 // Invalid skill level
        });

      expect(response.status).toBe(400);
    });
  });
}); 