/**
 * Authentication API endpoints
 * 
 * @group Authentication
 */

import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { generateSalt, hashPassword, generateToken } from "../auth";

export interface RegisterRequest {
  /** User's email address */
  email: string;
  /** User's password (will be hashed) */
  password: string;
  /** Optional user's display name */
  name?: string;
}

export interface LoginRequest {
  /** User's email address */
  email: string;
  /** User's password */
  password: string;
}

export interface AuthResponse {
  /** JWT token for authentication */
  token: string;
}

/**
 * Register authentication routes
 * @param {FastifyInstance} server - The Fastify instance
 * @param {PrismaClient} prisma - The Prisma client instance
 */
export default async function authRoutes(server: FastifyInstance, prisma: PrismaClient) {
  /**
   * Register a new user account
   * 
   * @endpoint POST /auth/register
   * @security none
   * 
   * @example Request
   * ```json
   * {
   *   "email": "user@example.com",
   *   "password": "secretpass123",
   *   "name": "John Doe"
   * }
   * ```
   * 
   * @example Success Response (200)
   * ```json
   * {
   *   "token": "eyJhbGciOiJIUzI1NiIs..."
   * }
   * ```
   * 
   * @example Error Response (400)
   * ```json
   * {
   *   "error": "Email already registered"
   * }
   * ```
   */
  server.post<{ Body: RegisterRequest }>('/auth/register', async (request, reply) => {
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
   * Login to existing account
   * 
   * @endpoint POST /auth/login
   * @security none
   * 
   * @example Request
   * ```json
   * {
   *   "email": "user@example.com",
   *   "password": "secretpass123"
   * }
   * ```
   * 
   * @example Success Response (200)
   * ```json
   * {
   *   "token": "eyJhbGciOiJIUzI1NiIs..."
   * }
   * ```
   * 
   * @example Error Response (401)
   * ```json
   * {
   *   "error": "Invalid credentials"
   * }
   * ```
   */
  server.post<{ Body: LoginRequest }>('/auth/login', async (request, reply) => {
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