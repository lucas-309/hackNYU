/**
 * Authentication routes for user registration and login
 * 
 * @packageDocumentation
 * @module routes/auth
 * @preferred
 * 
 * @example
 * ```typescript
 * POST /auth/register
 * {
 *   "email": "user@example.com",
 *   "password": "password123",
 *   "name": "John Doe"
 * }
 * ```
 */

import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { generateSalt, hashPassword, generateToken } from "../auth";

/**
 * Register authentication routes
 * @param {FastifyInstance} server - The Fastify instance
 * @param {PrismaClient} prisma - The Prisma client instance
 */
export default async function authRoutes(server: FastifyInstance, prisma: PrismaClient) {
  /**
   * Register a new user
   * @route POST /auth/register
   * @param {object} request.body - User registration data
   * @param {string} request.body.email - User's email
   * @param {string} request.body.password - User's password
   * @param {string} [request.body.name] - User's name (optional)
   * @returns {object} Object containing JWT token
   */
  server.post('/auth/register', async (request, reply) => {
    const { email, password, name } = request.body as { email: string; password: string; name?: string };

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return reply.status(400).send({ error: 'Email already registered' });
    }

    const salt = generateSalt();
    const hashedPassword = hashPassword(password, salt);

    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        salt,
      },
    });

    const token = generateToken(user);
    return { token };
  });

  /**
   * Login existing user
   * @route POST /auth/login
   * @param {object} request.body - Login credentials
   * @param {string} request.body.email - User's email
   * @param {string} request.body.password - User's password
   * @returns {object} Object containing JWT token
   * @throws {401} If credentials are invalid
   */
  server.post('/auth/login', async (request, reply) => {
    const { email, password } = request.body as { email: string; password: string };

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    const hashedPassword = hashPassword(password, user.salt);
    if (hashedPassword !== user.password) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    const token = generateToken(user);
    return { token };
  });
} 