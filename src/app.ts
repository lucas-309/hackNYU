import fastify from "fastify";
import { PrismaClient } from "@prisma/client";
import authPlugin from "./plugins/auth";
import authRoutes from "./routes/auth";
import recipeRoutes from "./routes/recipes";
import userRoutes from "./routes/user";

export function build() {
  const server = fastify();
  const prisma = new PrismaClient();

  // Register plugins
  server.register(authPlugin);

  // Register routes
  server.register(async (instance) => {
    await authRoutes(instance, prisma);
    await recipeRoutes(instance, prisma);
    await userRoutes(instance, prisma);
  });

  return server;
} 