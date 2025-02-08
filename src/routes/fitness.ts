/**
 * Fitness goals API endpoints
 * 
 * @group Fitness
 */

import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";

export interface FitnessGoalsRequest {
  /** Daily calorie target */
  calories: number;
  /** Daily protein target in grams */
  protein: number;
  /** Daily carbs target in grams */
  carbs: number;
  /** Daily fat target in grams */
  fat: number;
  /** Daily water target in ml */
  water: number;
  /** List of food allergies */
  allergies: string[];
}

/**
 * Register fitness routes
 * @param {FastifyInstance} server - The Fastify instance
 * @param {PrismaClient} prisma - The Prisma client instance
 */
export default async function fitnessRoutes(server: FastifyInstance, prisma: PrismaClient) {
  /**
   * Create or update fitness goals
   * 
   * @endpoint POST /fitness/goals
   * @security bearer
   * 
   * @example Request
   * ```json
   * {
   *   "calories": 2000,
   *   "protein": 150,
   *   "carbs": 200,
   *   "fat": 70,
   *   "water": 2000,
   *   "allergies": ["peanuts", "shellfish"]
   * }
   * ```
   * 
   * @example Success Response (200)
   * ```json
   * {
   *   "id": "1",
   *   "calories": 2000,
   *   "protein": 150,
   *   "carbs": 200,
   *   "fat": 70,
   *   "water": 2000,
   *   "allergies": ["peanuts", "shellfish"]
   * }
   * ```
   */
  server.post<{ Body: FitnessGoalsRequest }>('/fitness/goals', {
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

  /**
   * Get user's fitness goals
   * 
   * @endpoint GET /fitness/goals
   * @security bearer
   * 
   * @example Success Response (200)
   * ```json
   * {
   *   "id": "1",
   *   "calories": 2000,
   *   "protein": 150,
   *   "carbs": 200,
   *   "fat": 70,
   *   "water": 2000,
   *   "allergies": ["peanuts", "shellfish"]
   * }
   * ```
   * 
   * @example Error Response (404)
   * ```json
   * {
   *   "error": "No fitness goals found"
   * }
   * ```
   */
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