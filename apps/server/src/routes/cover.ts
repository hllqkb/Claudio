import type { FastifyInstance } from "fastify";

export async function coverRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { url: string } }>("/api/cover", async (request, reply) => {
    const { url } = request.query;
    if (!url || !url.startsWith("http")) {
      reply.code(400);
      return { error: "missing or invalid url" };
    }

    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Referer: "https://music.163.com/",
        },
      });
      if (!res.ok) {
        reply.code(res.status);
        return { error: `upstream ${res.status}` };
      }

      reply.header("Content-Type", res.headers.get("content-type") || "image/jpeg");
      reply.header("Cache-Control", "public, max-age=86400");
      reply.header("Access-Control-Allow-Origin", "*");

      const buffer = Buffer.from(await res.arrayBuffer());
      return reply.send(buffer);
    } catch (e: any) {
      reply.code(500);
      return { error: e.message };
    }
  });
}
