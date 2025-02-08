import { build } from '../app';
import { prismaMock } from './setup';
import supertest from 'supertest';
import { generateToken } from '../auth';

describe('Recipe Routes', () => {
  const app = build();
  let authToken: string;

  beforeAll(async () => {
    await app.ready();
    // Create a test user and generate token
    const testUser = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      password: 'hashedPassword',
      salt: 'salt',
      createdAt: new Date(),
      updatedAt: new Date()
    };
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
          updatedAt: new Date()
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
        updatedAt: new Date()
      });

      const response = await supertest(app.server)
        .post('/recipes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newRecipe);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('name', newRecipe.name);
    });
  });
}); 