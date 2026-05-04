import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getQueueItems, replaceQueue } from "../db/queue.repo.js";

const QueueItemSchema = z.object({
  id: z.string(),
  type: z.enum(["song", "tts"]),
  songId: z.string().optional(),
  title: z.string().optional(),
  artist: z.string().optional(),
  coverUrl: z.string().optional(),
  audioUrl: z.string().optional(),
  text: z.string().optional(),
  reason: z.string().optional(),
  status: z.string().optional(),
});

export async function queueRoutes(app: FastifyInstance) {
  app.get("/api/queue", async () => {
    const rows = getQueueItems();
    const items = rows.map((r) => ({
      id: r.id,
      type: r.type,
      songId: r.song_id ?? undefined,
      title: undefined,
      artist: undefined,
      coverUrl: undefined,
      audioUrl: r.audio_url ?? undefined,
      text: r.tts_text ?? undefined,
      reason: r.reason ?? undefined,
      status: r.status,
    }));
    return { items };
  });

  app.put("/api/queue", async (request) => {
    const body = z.object({ items: z.array(QueueItemSchema) }).parse(request.body);
    replaceQueue(body.items);
    return { ok: true };
  });
}
