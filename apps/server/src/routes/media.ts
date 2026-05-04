import type { FastifyInstance } from "fastify";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = join(__dirname, "../../cache/tts");

export async function mediaRoutes(app: FastifyInstance) {
  app.get("/api/media/tts/:hash", async (request, reply) => {
    const { hash } = request.params as { hash: string };

    if (!/^[a-f0-9]{16}$/.test(hash)) {
      return reply.code(400).send({ error: "Invalid hash" });
    }

    const filepath = join(CACHE_DIR, `${hash}.mp3`);

    if (!existsSync(filepath)) {
      return reply.code(404).send({ error: "File not found" });
    }

    const buffer = readFileSync(filepath);
    return reply
      .header("Content-Type", "audio/mpeg")
      .header("Cache-Control", "public, max-age=86400")
      .send(buffer);
  });
}
