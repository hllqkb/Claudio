import type { FastifyInstance } from "fastify";

export async function audioRoutes(app: FastifyInstance) {
  const ncmBaseUrl = process.env.NCM_API_BASE_URL || "http://localhost:3000";

  app.get("/api/audio", async (request, reply) => {
    const { id, title, artist, br } = request.query as {
      id?: string;
      title?: string;
      artist?: string;
      br?: string;
    };

    if (!id) {
      return reply.code(400).send({ error: "Missing song id" });
    }

    const params = new URLSearchParams({ id });
    if (title) params.set("title", title);
    if (artist) params.set("artist", artist);
    if (br) params.set("br", br);

    try {
      const ncmRes = await fetch(`${ncmBaseUrl}/audio?${params.toString()}`, {
        signal: AbortSignal.timeout(30000),
      });

      if (!ncmRes.ok) {
        return reply.code(ncmRes.status).send({ error: `NCM returned ${ncmRes.status}` });
      }

      // Forward headers
      reply.header("Content-Type", ncmRes.headers.get("content-type") || "audio/mpeg");
      reply.header("Access-Control-Allow-Origin", "*");
      reply.header("Accept-Ranges", "bytes");

      const contentLength = ncmRes.headers.get("content-length");
      if (contentLength) {
        reply.header("Content-Length", contentLength);
      }

      // Stream audio
      if (ncmRes.body) {
        return reply.send(ncmRes.body);
      }
      return reply.send(Buffer.alloc(0));
    } catch (err) {
      request.log.error(err, "Audio proxy error");
      return reply.code(500).send({ error: "Audio proxy failed" });
    }
  });
}
