import type { FastifyInstance } from "fastify";
import { getCurrentItem, getQueueItems } from "../db/queue.repo.js";

export function getCurrentState() {
  return {
    nowPlaying: getCurrentItem() ?? null,
    queue: getQueueItems(),
    scene: "default",
    djStatus: "idle" as const,
  };
}

export async function nowRoutes(app: FastifyInstance) {
  app.get("/api/now", async () => {
    return getCurrentState();
  });
}
