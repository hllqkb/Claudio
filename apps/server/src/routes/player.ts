import type { FastifyInstance } from "fastify";
import { broadcast } from "./stream.js";
import { getCurrentState } from "./now.js";
import {
  getCurrentItem,
  getQueueItems,
  setCurrentPlaying,
  skipToNext,
  skipToPrevious,
} from "../db/queue.repo.js";
import {
  recordPlay,
  upsertSong,
  getRecentPlays,
  getFavorites,
  addFavorite,
  removeFavorite,
} from "../db/plays.repo.js";

let isPlaying = true;

export async function playerRoutes(app: FastifyInstance) {
  app.post("/api/player/play", async () => {
    isPlaying = true;
    const current = getCurrentItem();
    if (current) {
      setCurrentPlaying(current.id);
    }
    broadcast("now_changed", getCurrentState());
    return { ok: true, isPlaying };
  });

  app.post("/api/player/pause", async () => {
    isPlaying = false;
    broadcast("now_changed", getCurrentState());
    return { ok: true, isPlaying };
  });

  app.post("/api/player/next", async () => {
    const prev = getCurrentItem();
    const next = skipToNext();

    if (prev && prev.song_id) {
      recordPlay({
        id: `play_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        itemId: prev.song_id,
        itemType: "song",
        songId: prev.song_id,
        action: "play",
      });
    }

    const state = getCurrentState();
    broadcast("now_changed", state);
    broadcast("queue_updated", getQueueItems());
    return { ok: true, message: "已切换到下一首", next: next ?? null };
  });

  app.post("/api/player/previous", async () => {
    const prev = skipToPrevious();
    const state = getCurrentState();
    broadcast("now_changed", state);
    broadcast("queue_updated", getQueueItems());
    return { ok: true, message: "已切换到上一首", previous: prev ?? null };
  });

  app.post("/api/player/seek", async (request) => {
    const { positionMs } = request.body as { positionMs: number };
    broadcast("now_changed", getCurrentState());
    return { ok: true, positionMs };
  });

  app.post("/api/plays/report", async (request) => {
    const body = request.body as {
      songId?: string;
      title?: string;
      artist?: string;
      coverUrl?: string;
      durationMs?: number;
      scene?: string;
    };

    if (body.songId) {
      upsertSong({
        id: body.songId,
        title: body.title ?? "Unknown",
        artist: body.artist,
        coverUrl: body.coverUrl,
        durationMs: body.durationMs,
      });

      recordPlay({
        id: `play_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        itemId: body.songId,
        itemType: "song",
        songId: body.songId,
        action: "play",
        scene: body.scene,
      });
    }

    return { ok: true };
  });

  // Play history
  app.get("/api/plays/recent", async (request) => {
    const { limit } = request.query as { limit?: string };
    const plays = getRecentPlays(limit ? parseInt(limit, 10) : 50);
    return { plays };
  });

  // Favorites
  app.get("/api/favorites", async () => {
    const favorites = getFavorites();
    return { favorites };
  });

  app.post("/api/favorites", async (request) => {
    const body = request.body as { songId: string; title?: string; artist?: string; coverUrl?: string };
    if (!body.songId) {
      return { ok: false, error: "songId is required" };
    }
    addFavorite(body.songId, body.title, body.artist, body.coverUrl);
    return { ok: true };
  });

  app.delete("/api/favorites/:songId", async (request) => {
    const { songId } = request.params as { songId: string };
    const removed = removeFavorite(songId);
    return { ok: removed };
  });
}
