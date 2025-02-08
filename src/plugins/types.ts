import { FastifyInstance } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: any; // We'll improve this type later
  }
  interface FastifyRequest {
    user?: {
      userId: string;
      email: string;
    };
  }
} 