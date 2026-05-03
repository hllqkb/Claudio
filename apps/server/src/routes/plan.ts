import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { PlanItem } from "../services/claude.service.js";

const PlanRequestSchema = z.object({
  trigger: z.enum(["manual", "auto", "scheduled"]).default("manual"),
  input: z.string().optional(),
  maxSongs: z.number().int().min(1).max(20).default(8),
  withDj: z.boolean().default(true),
  scene: z.string().optional(),
});

export async function planRoutes(app: FastifyInstance) {
  app.post("/api/plan", async (request) => {
    const body = PlanRequestSchema.parse(request.body);
    const { claude, context } = app.services;

    const contextStr = await context.buildContext(body.input, body.scene);
    const plan = await claude.generatePlan(
      {
        trigger: body.trigger,
        input: body.input,
        maxSongs: body.maxSongs,
        withDj: body.withDj,
        scene: body.scene,
      },
      contextStr
    );

    const planId = `plan_${Date.now()}`;
    const { ncm } = app.services;

    const items = [];
    for (let i = 0; i < plan.items.length; i++) {
      const item = plan.items[i];
      const baseItem = {
        ...item,
        id: `${planId}_${i}`,
        audioUrl: item.audioUrl ?? "",
        status: "pending" as const,
      };

      if (item.type === "song" && item.query) {
        const songs = await ncm.search(item.query, 1);
        if (songs.length > 0) {
          const song = songs[0];
          baseItem.songId = song.id;
          baseItem.title = song.title;
          baseItem.artist = song.artist;
          baseItem.coverUrl = song.coverUrl;
          // Use audio proxy endpoint instead of direct CDN URL
          baseItem.audioUrl = `/api/audio?id=${encodeURIComponent(song.id)}&title=${encodeURIComponent(song.title)}&artist=${encodeURIComponent(song.artist)}`;
        }
      }

      items.push(baseItem);
    }

    return {
      planId,
      scene: plan.scene,
      summary: plan.summary,
      items,
    };
  });
}
