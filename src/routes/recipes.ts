/**
 * Recipe management API endpoints
 * 
 * @group Recipes
 */

import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import '../plugins/types'; // Import type extensions

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
   * 
   * @example Success Response (200)
   * ```json
   * [
   *   {
   *     "id": "1",
   *     "name": "Spaghetti Carbonara",
   *     "ingredients": "Pasta, eggs, pecorino...",
   *     "steps": "1. Boil pasta...",
   *     "image": "https://..."
   *   }
   * ]
   * ```
   */
  server.get('/recipes', {
    onRequest: [server.authenticate],
    handler: async (request, reply) => {
      const recipes = await prisma.recipe.findMany({
        include: {
          savedBy: true,
          viewedBy: true
        }
      });
      return recipes;
    }
  });

  /**
   * Create a new recipe
   * 
   * @endpoint POST /recipes
   * @security bearer
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
   * 
   * @example Success Response (200)
   * ```json
   * {
   *   "id": "1",
   *   "name": "Spaghetti Carbonara",
   *   "ingredients": "Pasta, eggs, pecorino...",
   *   "steps": "1. Boil pasta...",
   *   "image": "https://..."
   * }
   * ```
   */
  server.post<{ Body: CreateRecipeRequest }>('/recipes', {
    onRequest: [server.authenticate],
    handler: async (request, reply) => {
      const { name, ingredients, steps, image } = request.body as { 
        name: string; 
        ingredients: string; 
        steps: string; 
        image: string; 
      };

      const recipe = await prisma.recipe.create({
        data: { 
          name, 
          ingredients, 
          steps, 
          image,
          authorId: request.user!.userId
        },
        include: {
          savedBy: true,
          viewedBy: true
        }
      });
      return recipe;
    }
  });

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

  server.put('/recipes/:id', {
    onRequest: [server.authenticate],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const userId = request.user!.userId;
      const { name, ingredients, steps, image } = request.body as {
        name?: string;
        ingredients?: string;
        steps?: string;
        image?: string;
      };

      const recipe = await prisma.recipe.findUnique({ where: { id } });
      if (!recipe) {
        return reply.status(404).send({ error: 'Recipe not found' });
      }

      if (recipe.authorId !== userId) {
        return reply.status(403).send({ error: 'Not authorized to update this recipe' });
      }

      const updatedRecipe = await prisma.recipe.update({
        where: { id },
        data: {
          name,
          ingredients,
          steps,
          image
        },
        include: {
          savedBy: true,
          viewedBy: true
        }
      });

      return updatedRecipe;
    }
  });

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
} 