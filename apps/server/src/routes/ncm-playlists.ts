import type { FastifyInstance } from "fastify";

export async function ncmPlaylistRoutes(app: FastifyInstance) {
  // Get user's NCM playlists
  app.get("/api/ncm/playlists", async () => {
    const { ncm } = app.services;
    const playlists = await ncm.getUserPlaylists();
    return { playlists };
  });

  // Get NCM playlist detail (tracks)
  app.get<{ Params: { id: string } }>("/api/ncm/playlists/:id", async (request) => {
    const { ncm } = app.services;
    const tracks = await ncm.getPlaylistDetail(request.params.id);
    return { tracks };
  });
}
