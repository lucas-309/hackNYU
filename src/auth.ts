import { User } from '@prisma/client';
import { FastifyRequest } from 'fastify';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'; // In production, always use environment variable

export interface JWTPayload {
  userId: string;
  email: string;
}

export function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

export function hashPassword(password: string, salt: string): string {
  return crypto
    .pbkdf2Sync(password, salt, 1000, 64, 'sha512')
    .toString('hex');
}

export function generateToken(user: User): string {
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

export function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, JWT_SECRET) as JWTPayload;
}

export async function authenticateRequest(request: FastifyRequest): Promise<JWTPayload> {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('No token provided');
  }

  const token = authHeader.split(' ')[1];
  return verifyToken(token);
} 