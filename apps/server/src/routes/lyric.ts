import type { FastifyInstance } from "fastify";

export async function lyricRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { id: string } }>("/api/lyric", async (request, reply) => {
    const { id } = request.query;
    if (!id) {
      reply.code(400);
      return { error: "Missing song id" };
    }

    const { ncm } = app.services;
    const result = await ncm.getLyric(id);
    return result;
  });
}
