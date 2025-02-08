import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { generateSalt, hashPassword, generateToken } from "../auth";

export default async function authRoutes(server: FastifyInstance, prisma: PrismaClient) {
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