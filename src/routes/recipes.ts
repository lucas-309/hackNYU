/**
 * Recipe management API endpoints
 * 
 * @group Recipes
 */

import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { Recipe } from "../types/api";
import { generateRecipe } from "../utils/recipeAI";

export interface CreateRecipeRequest {
  /** Recipe name */
  name: string;
  /** List of ingredients */
  ingredients: string;
  /** Cooking steps */
  steps: string;
  /** Recipe image URL */
  image: string;
}

export interface UpdateRecipeRequest {
  /** Recipe name */
  name?: string;
  /** List of ingredients */
  ingredients?: string;
  /** Cooking steps */
  steps?: string;
  /** Recipe image URL */
  image?: string;
}

// Add new interface for AI generation request
export interface GenerateRecipeRequest {
  ingredients: string[];
  skillLevel?: 1 | 2 | 3;
}

/**
 * Register recipe routes
 * @param {FastifyInstance} server - The Fastify instance
 * @param {PrismaClient} prisma - The Prisma client instance
 */
export default async function recipeRoutes(server: FastifyInstance, prisma: PrismaClient) {
  /**
   * Get all recipes
   * 
   * @endpoint GET /recipes
   * @security bearer
   * @response {@link Recipe.RecipeResponse[]}
   * 
   * @example Success Response (200)
   * ```json
   * [
   *   {
   *     "id": "1",
   *     "name": "Spaghetti Carbonara",
   *     "ingredients": "Pasta, eggs, pecorino...",
   *     "steps": "1. Boil pasta...",
   *     "image": "https://...",
   *     "authorId": "user123"
   *   }
   * ]
   * ```
   */
  server.get<{
    Reply: Recipe.RecipeResponse[];
  }>('/recipes', {
    onRequest: [server.authenticate],
    handler: async (request, reply) => {
      const recipes = await prisma.recipe.findMany();
      return recipes;
    }
  });

  /**
   * Create a new recipe
   * 
   * @endpoint POST /recipes
   * @security bearer
   * @request {@link Recipe.CreateRequest}
   * @response {@link Recipe.RecipeResponse}
   * 
   * @example Request
   * ```json
   * {
   *   "name": "Spaghetti Carbonara",
   *   "ingredients": "Pasta, eggs, pecorino...",
   *   "steps": "1. Boil pasta...",
   *   "image": "https://..."
   * }
   * ```
   */
  server.post<{
    Body: Recipe.CreateRequest;
    Reply: Recipe.RecipeResponse;
  }>('/recipes', {
    onRequest: [server.authenticate],
    handler: async (request, reply) => {
      const { name, ingredients, steps, image } = request.body;
      return await prisma.recipe.create({
        data: {
          name,
          ingredients,
          steps,
          image,
          authorId: request.user!.userId
        }
      });
    }
  });

  /**
   * Get a specific recipe by ID and add to user's view history
   * 
   * @endpoint GET /recipes/:id
   * @security bearer
   * @response {@link Recipe.RecipeResponse}
   * 
   * @example Success Response (200)
   * ```json
   * {
   *   "id": "1",
   *   "name": "Spaghetti Carbonara",
   *   "ingredients": "Pasta, eggs, pecorino...",
   *   "steps": "1. Boil pasta...",
   *   "image": "https://...",
   *   "authorId": "user123"
   * }
   * ```
   */
  server.get('/recipes/:id', {
    onRequest: [server.authenticate],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const userId = request.user!.userId;

      const recipe = await prisma.recipe.findUnique({
        where: { id },
        include: {
          savedBy: true,
          viewedBy: true
        }
      });

      if (!recipe) {
        return reply.status(404).send({ error: 'Recipe not found' });
      }

      // Add to user's recipe history
      await prisma.recipe.update({
        where: { id },
        data: {
          viewedBy: {
            connect: { id: userId }
          }
        }
      });

      return recipe;
    }
  });

  /**
   * Update an existing recipe
   * 
   * @endpoint PUT /recipes/:id
   * @security bearer
   * @request {@link Recipe.UpdateRequest}
   * @response {@link Recipe.RecipeResponse}
   * 
   * @example Error Response (403)
   * ```json
   * {
   *   "error": "Not authorized to update this recipe"
   * }
   * ```
   */
  server.put<{
    Params: { id: string };
    Body: Recipe.UpdateRequest;
    Reply: Recipe.RecipeResponse | { error: string };
  }>('/recipes/:id', {
    onRequest: [server.authenticate],
    handler: async (request, reply) => {
      const { id } = request.params;
      const { name, ingredients, steps, image } = request.body;

      const recipe = await prisma.recipe.findUnique({ where: { id } });
      if (!recipe) {
        return reply.status(404).send({ error: 'Recipe not found' });
      }

      if (recipe.authorId !== request.user!.userId) {
        return reply.status(403).send({ error: 'Not authorized to update this recipe' });
      }

      return await prisma.recipe.update({
        where: { id },
        data: { name, ingredients, steps, image }
      });
    }
  });

  /**
   * Delete a recipe
   * 
   * @endpoint DELETE /recipes/:id
   * @security bearer
   * @response {@link Recipe.DeleteResponse}
   * 
   * @example Success Response (200)
   * ```json
   * {
   *   "message": "Recipe deleted successfully"
   * }
   * ```
   */
  server.delete('/recipes/:id', {
    onRequest: [server.authenticate],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const userId = request.user!.userId;

      const recipe = await prisma.recipe.findUnique({ where: { id } });
      if (!recipe) {
        return reply.status(404).send({ error: 'Recipe not found' });
      }

      if (recipe.authorId !== userId) {
        return reply.status(403).send({ error: 'Not authorized to delete this recipe' });
      }

      await prisma.recipe.delete({ where: { id } });
      return { message: 'Recipe deleted successfully' };
    }
  });

  /**
   * Generate a recipe using AI based on user preferences and fitness goals
   * 
   * @endpoint POST /recipes/generate
   * @security bearer
   * @request {@link Recipe.GenerateRequest}
   * @response {@link Recipe.RecipeResponse}
   * 
   * @example Request
   * ```json
   * {
   *   "ingredients": ["Pasta", "eggs", "pecorino"],
   *   "skillLevel": 2,
   *   "preferences": "vegetarian",
   *   "maxCookingTime": 30
   * }
   * ```
   */
  server.post<{
    Body: Recipe.GenerateRequest;
    Reply: Recipe.RecipeResponse | { error: string };
  }>('/recipes/generate', {
    onRequest: [server.authenticate],
    handler: async (request, reply) => {
      const userId = request.user!.userId;
      const { 
        ingredients,          // Required ingredients to use
        skillLevel = 2,      // Cooking skill level (1-3, default: 2)
        preferences,         // Dietary preferences (vegetarian, vegan, etc.)
        maxCookingTime      // Maximum cooking time in minutes
      } = request.body;

      // Ensure user has set fitness goals
      const fitnessGoals = await prisma.fitnessGoals.findFirst({
        where: { userId }
      });

      if (!fitnessGoals) {
        return reply.status(400).send({ 
          error: 'Please set your fitness goals before generating recipes' 
        });
      }

      // Get user profile for additional preferences
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      try {
        // Generate recipe using AI
        const recipeData = await generateRecipe(
          user, 
          fitnessGoals, 
          ingredients,
          skillLevel,
          preferences,
          maxCookingTime
        );
        
        // Save generated recipe to database
        const recipe = await prisma.recipe.create({
          data: {
            ...recipeData,
            authorId: userId
          }
        });

        return recipe;
      } catch (error) {
        console.error('Recipe generation error:', error);
        return reply.status(500).send({ 
          error: 'Failed to generate recipe' 
        });
      }
    }
  });
} 