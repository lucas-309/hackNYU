import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { authenticateRequest, JWTPayload } from '../auth';


// Extend FastifyRequest to include user information
declare module 'fastify' {
  interface FastifyRequest {
    user?: JWTPayload;
  }
}

const authPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = await authenticateRequest(request);
      request.user = user;
    } catch (err) {
      reply.status(401).send({ error: 'Unauthorized' });
    }
  });
};

export default fp(authPlugin); 