/**
 * Authentication API endpoints
 * 
 * @group Authentication
 */

import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { generateSalt, hashPassword, generateToken } from "../auth";
import { Auth } from "../types/api";

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
  token: string;
  user: {
    id: string;
    email: string;
    name?: string;
  };
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
   * @request {@link Auth.RegisterRequest}
   * @response {@link Auth.AuthResponse}
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
   *   "token": "eyJhbGciOiJIUzI1NiIs...",
   *   "user": {
   *     "id": "1",
   *     "email": "user@example.com",
   *     "name": "John Doe"
   *   }
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
  server.post<{
    Body: Auth.RegisterRequest;
    Reply: AuthResponse | { error: string };
  }>('/auth/register', async (request, reply) => {
    server.log.info('Registration attempt', { email: request.body.email });
    
    try {
      const { email, password, name } = request.body;

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
      
      // Return both token and user data
      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        }
      };
    } catch (err) {
      server.log.error('Registration failed:', err);
      return reply.status(500).send({ error: 'Registration failed' });
    }
  });

  /**
   * Login to existing account
   * 
   * @endpoint POST /auth/login
   * @security none
   * @request {@link Auth.LoginRequest}
   * @response {@link Auth.AuthResponse}
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
   *   "token": "eyJhbGciOiJIUzI1NiIs...",
   *   "user": {
   *     "id": "1",
   *     "email": "user@example.com",
   *     "name": "John Doe"
   *   }
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
  server.post<{
    Body: Auth.LoginRequest;
    Reply: AuthResponse | { error: string };
  }>('/auth/login', async (request, reply) => {
    try {
      const { email, password } = request.body;

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return reply.status(401).send({ error: 'Invalid credentials' });
      }

      const hashedPassword = hashPassword(password, user.salt);
      if (hashedPassword !== user.password) {
        return reply.status(401).send({ error: 'Invalid credentials' });
      }

      const token = generateToken(user);
      
      // Return both token and user data
      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        }
      };
    } catch (err) {
      server.log.error('Login failed:', err);
      return reply.status(500).send({ error: 'Login failed' });
    }
  });
} 