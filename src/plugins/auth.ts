/**
 * Authentication plugin for Fastify
 * @module plugins/auth
 */

import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { authenticateRequest, JWTPayload } from '../auth';


// Extend FastifyRequest to include user information
declare module 'fastify' {
  interface FastifyRequest {
    user?: JWTPayload;
  }
}

/**
 * Fastify plugin that adds authentication middleware
 * @param {FastifyInstance} fastify - The Fastify instance
 */
const authPlugin: FastifyPluginAsync = async (fastify) => {
  /**
   * Authentication middleware
   * @param {FastifyRequest} request - The incoming request
   * @param {FastifyReply} reply - The outgoing reply
   */
  fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = await authenticateRequest(request);
      request.user = user;
    } catch (err) {
      reply.status(401).send({ error: 'Unauthorized' });
    }
  });

  // Add error handler
  fastify.setErrorHandler((error, request, reply) => {
    fastify.log.error(error);
    reply.status(500).send({ error: 'Internal Server Error' });
  });
};

export default fp(authPlugin); 