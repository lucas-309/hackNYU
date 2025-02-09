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
import cors from '@fastify/cors';

// Only import prismaMock during testing
let prismaMock: any;
if (process.env.NODE_ENV === 'test') {
  const { prismaMock: mock } = require("./tests/setup");
  prismaMock = mock;
}

/**
 * Builds and configures the Fastify application
 * @returns {FastifyInstance} The configured Fastify instance
 */
export function build() {
  const server = fastify({
    logger: process.env.NODE_ENV !== 'test'
  });
  
  // Register CORS
  server.register(cors, {
    origin: ['http://localhost:3001'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  });

  // Use mock only during testing, real client otherwise
  const prisma = process.env.NODE_ENV === 'test' ? 
    prismaMock : 
    new PrismaClient();

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