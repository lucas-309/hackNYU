import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import '../plugins/types';

export default async function userRoutes(server: FastifyInstance, prisma: PrismaClient) {
  server.post('/recipes/:id/save', {
    onRequest: [server.authenticate],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const userId = request.user!.userId;

      const recipe = await prisma.recipe.findUnique({ where: { id } });
      if (!recipe) {
        return reply.status(404).send({ error: 'Recipe not found' });
      }

      await prisma.recipe.update({
        where: { id },
        data: {
          savedBy: {
            connect: { id: userId }
          }
        }
      });

      return { message: 'Recipe saved successfully' };
    }
  });

  server.get('/user/saved-recipes', {
    onRequest: [server.authenticate],
    handler: async (request, reply) => {
      const userId = request.user!.userId;

      const savedRecipes = await prisma.recipe.findMany({
        where: {
          savedBy: {
            id: userId
          }
        },
        include: {
          savedBy: true,
          viewedBy: true
        }
      });

      return savedRecipes;
    }
  });

  server.get('/user/recipe-history', {
    onRequest: [server.authenticate],
    handler: async (request, reply) => {
      const userId = request.user!.userId;

      const recipeHistory = await prisma.recipe.findMany({
        where: {
          viewedBy: {
            id: userId
          }
        },
        include: {
          savedBy: true,
          viewedBy: true
        },
        orderBy: {
          updatedAt: 'desc'
        }
      });

      return recipeHistory;
    }
  });
} 