/**
 * Authentication utilities for JWT token generation and verification
 * @module auth
 */

import { User } from '@prisma/client';
import { FastifyRequest } from 'fastify';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'; // In production, always use environment variable

/**
 * Payload structure for JWT tokens
 */
export interface JWTPayload {
  userId: string;
  email: string;
}

/**
 * Generates a random salt for password hashing
 * @returns {string} A hexadecimal string representing the salt
 */
export function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Hashes a password with a given salt
 * @param {string} password - The plain text password to hash
 * @param {string} salt - The salt to use in hashing
 * @returns {string} The hashed password
 */
export function hashPassword(password: string, salt: string): string {
  return crypto
    .pbkdf2Sync(password, salt, 1000, 64, 'sha512')
    .toString('hex');
}

/**
 * Generates a JWT token for a user
 * @param {User} user - The user object to generate a token for
 * @returns {string} A JWT token
 */
export function generateToken(user: User): string {
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

/**
 * Verifies a JWT token
 * @param {string} token - The token to verify
 * @returns {JWTPayload} The decoded token payload
 * @throws {Error} If token is invalid
 */
export function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, JWT_SECRET) as JWTPayload;
}

/**
 * Authenticates a request by verifying its JWT token
 * @param {FastifyRequest} request - The incoming request
 * @returns {Promise<JWTPayload>} The decoded token payload
 * @throws {Error} If token is missing or invalid
 */
export async function authenticateRequest(request: FastifyRequest): Promise<JWTPayload> {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('No token provided');
  }

  const token = authHeader.split(' ')[1];
  return verifyToken(token);
} 