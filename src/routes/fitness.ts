/**
 * Fitness goals API endpoints
 * 
 * @group Fitness
 */

import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { Fitness } from "../types/api";

export default async function fitnessRoutes(server: FastifyInstance, prisma: PrismaClient) {
  /**
   * Create or update fitness goals
   * 
   * @endpoint POST /fitness/goals
   * @security bearer
   * @request {@link Fitness.GoalsRequest}
   * @response {@link Fitness.GoalsResponse}
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
   */
  server.post<{
    Body: Fitness.GoalsRequest;
    Reply: Fitness.GoalsResponse;
  }>('/fitness/goals', {
    onRequest: [server.authenticate],
    handler: async (request, reply) => {
      const userId = request.user!.userId;
      const goals = request.body;

      const existingGoals = await prisma.fitnessGoals.findFirst({
        where: { userId }
      });

      if (existingGoals) {
        return await prisma.fitnessGoals.update({
          where: { id: existingGoals.id },
          data: goals
        });
      }

      return await prisma.fitnessGoals.create({
        data: {
          ...goals,
          userId,
          User: { connect: { id: userId } }
        }
      });
    }
  });

  /**
   * Get user's fitness goals
   * 
   * @endpoint GET /fitness/goals
   * @security bearer
   * @response {@link Fitness.GoalsResponse}
   * 
   * @example Error Response (404)
   * ```json
   * {
   *   "error": "No fitness goals found"
   * }
   * ```
   */
  server.get<{
    Reply: Fitness.GoalsResponse | { error: string };
  }>('/fitness/goals', {
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