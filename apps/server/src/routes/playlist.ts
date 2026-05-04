import type { FastifyInstance } from "fastify";
import { z } from "zod";

const CreatePlaylistSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  items: z.array(
    z.object({
      id: z.string(),
      type: z.enum(["song", "tts"]),
      songId: z.string().optional(),
      title: z.string().optional(),
      artist: z.string().optional(),
      coverUrl: z.string().optional(),
      audioUrl: z.string().optional(),
      text: z.string().optional(),
      reason: z.string().optional(),
    })
  ),
});

const UpdatePlaylistSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  items: z
    .array(
      z.object({
        id: z.string(),
        type: z.enum(["song", "tts"]),
        songId: z.string().optional(),
        title: z.string().optional(),
        artist: z.string().optional(),
        coverUrl: z.string().optional(),
        audioUrl: z.string().optional(),
        text: z.string().optional(),
        reason: z.string().optional(),
      })
    )
    .optional(),
});

export async function playlistRoutes(app: FastifyInstance) {
  // List all playlists
  app.get("/api/playlists", async () => {
    const { playlist } = app.services;
    return { playlists: playlist.list() };
  });

  // Get playlist detail
  app.get<{ Params: { id: string } }>("/api/playlists/:id", async (request, reply) => {
    const { playlist } = app.services;
    const pl = playlist.get(request.params.id);
    if (!pl) {
      reply.code(404);
      return { error: "Playlist not found" };
    }
    return { playlist: pl };
  });

  // Create playlist
  app.post("/api/playlists", async (request, reply) => {
    const { playlist } = app.services;
    const body = CreatePlaylistSchema.parse(request.body);
    const pl = playlist.create(body);
    reply.code(201);
    return { playlist: pl };
  });

  // Update playlist
  app.put<{ Params: { id: string } }>("/api/playlists/:id", async (request, reply) => {
    const { playlist } = app.services;
    const body = UpdatePlaylistSchema.parse(request.body);
    const pl = playlist.update(request.params.id, body);
    if (!pl) {
      reply.code(404);
      return { error: "Playlist not found" };
    }
    return { playlist: pl };
  });

  // Delete playlist
  app.delete<{ Params: { id: string } }>("/api/playlists/:id", async (request, reply) => {
    const { playlist } = app.services;
    const ok = playlist.delete(request.params.id);
    if (!ok) {
      reply.code(404);
      return { error: "Playlist not found" };
    }
    return { ok: true };
  });
}
