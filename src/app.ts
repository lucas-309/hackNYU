/**
 * Main application setup and configuration
 * @module app
 */

import fastify from "fastify";
import { PrismaClient } from "@prisma/client";
import authPlugin from "./plugins/auth";
import authRoutes from "./routes/auth";
import recipeRoutes from "./routes/recipes";
import userRoutes from "./routes/user";
import fitnessRoutes from "./routes/fitness";
import { prismaMock } from "./tests/setup";

/**
 * Builds and configures the Fastify application
 * @returns {FastifyInstance} The configured Fastify instance
 */
export function build() {
  const server = fastify({
    logger: false // Disable logging during tests
  });
  
  const prisma = process.env.NODE_ENV === 'test' ? prismaMock : new PrismaClient();

  // Register plugins
  server.register(authPlugin);

  // Register routes
  server.register(async (instance) => {
    await authRoutes(instance, prisma);
    await recipeRoutes(instance, prisma);
    await userRoutes(instance, prisma);
    await fitnessRoutes(instance, prisma);
  });

  return server;
} 