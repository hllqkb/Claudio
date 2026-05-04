import type { FastifyInstance } from "fastify";

export async function searchRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { q: string; limit?: string } }>("/api/search", async (request, reply) => {
    const { q, limit } = request.query;
    if (!q || !q.trim()) {
      reply.code(400);
      return { error: "Missing search query" };
    }

    const { ncm } = app.services;
    const results = await ncm.search(q.trim(), limit ? Number(limit) : 10);
    return { results };
  });
}
