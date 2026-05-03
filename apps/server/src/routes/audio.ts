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

      // Read the response body to detect format
      const buffer = Buffer.from(await ncmRes.arrayBuffer());

      // Detect actual audio format from magic bytes
      let contentType = "audio/mpeg";
      if (buffer.length >= 4) {
        const magic = buffer.toString("ascii", 0, 4);
        if (magic === "fLaC") {
          contentType = "audio/flac";
        } else if (magic === "OggS") {
          contentType = "audio/ogg";
        } else if (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0) {
          contentType = "audio/mpeg";
        }
      }

      reply.header("Content-Type", contentType);
      reply.header("Access-Control-Allow-Origin", "*");
      reply.header("Accept-Ranges", "bytes");
      reply.header("Content-Length", buffer.length);
      reply.header("Cache-Control", "public, max-age=3600");

      return reply.send(buffer);
    } catch (err) {
      request.log.error(err, "Audio proxy error");
      return reply.code(500).send({ error: "Audio proxy failed" });
    }
  });
}
