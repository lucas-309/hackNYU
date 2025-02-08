/**
 * Fitness goals management routes
 * @module routes/fitness
 */

import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";

/**
 * Register fitness routes
 * @param {FastifyInstance} server - The Fastify instance
 * @param {PrismaClient} prisma - The Prisma client instance
 */
export default async function fitnessRoutes(server: FastifyInstance, prisma: PrismaClient) {
  /**
   * Create or update fitness goals
   * @route POST /fitness/goals
   * @authentication Required
   * @param {object} request.body - Fitness goals data
   * @param {number} request.body.calories - Daily calorie target
   * @param {number} request.body.protein - Daily protein target (g)
   * @param {number} request.body.carbs - Daily carbs target (g)
   * @param {number} request.body.fat - Daily fat target (g)
   * @param {number} request.body.water - Daily water target (ml)
   * @param {string[]} request.body.allergies - List of allergies
   * @returns {FitnessGoals} Updated fitness goals
   */
  server.post('/fitness/goals', {
    onRequest: [server.authenticate],
    handler: async (request, reply) => {
      const userId = request.user!.userId;
      const { calories, protein, carbs, fat, water, allergies } = request.body as {
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
        water: number;
        allergies: string[];
      };

      // Find existing goals
      const existingGoals = await prisma.fitnessGoals.findFirst({
        where: { userId }
      });

      if (existingGoals) {
        // Update existing goals
        const updatedGoals = await prisma.fitnessGoals.update({
          where: { id: existingGoals.id },
          data: {
            calories,
            protein,
            carbs,
            fat,
            water,
            allergies
          }
        });
        return updatedGoals;
      }

      // Create new goals
      const newGoals = await prisma.fitnessGoals.create({
        data: {
          userId,
          calories,
          protein,
          carbs,
          fat,
          water,
          allergies,
          User: {
            connect: { id: userId }
          }
        }
      });

      return newGoals;
    }
  });

  // Get user's fitness goals
  server.get('/fitness/goals', {
    onRequest: [server.authenticate],
    handler: async (request, reply) => {
      const userId = request.user!.userId;

      const goals = await prisma.fitnessGoals.findFirst({
        where: { userId }
      });

      if (!goals) {
        return reply.status(404).send({ error: 'No fitness goals found' });
      }

      return goals;
    }
  });
} 