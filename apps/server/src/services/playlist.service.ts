import * as repo from "../db/playlist.repo.js";

export interface PlaylistItem {
  id: string;
  type: "song" | "tts";
  songId?: string;
  title?: string;
  artist?: string;
  coverUrl?: string;
  audioUrl?: string;
  text?: string;
  reason?: string;
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  items: PlaylistItem[];
  coverUrl?: string;
  createdAt: string;
  updatedAt: string;
}

function rowToItem(row: { id: string; type: string; song_id: string | null; title: string | null; artist: string | null; cover_url: string | null; audio_url: string | null; text_field: string | null; reason: string | null }): PlaylistItem {
  return {
    id: row.id,
    type: row.type as "song" | "tts",
    songId: row.song_id ?? undefined,
    title: row.title ?? undefined,
    artist: row.artist ?? undefined,
    coverUrl: row.cover_url ?? undefined,
    audioUrl: row.audio_url ?? undefined,
    text: row.text_field ?? undefined,
    reason: row.reason ?? undefined,
  };
}

function rowToPlaylist(row: { id: string; name: string; description: string; cover_url: string | null; created_at: string; updated_at: string }, items: PlaylistItem[]): Playlist {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    items,
    coverUrl: row.cover_url ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class PlaylistService {
  list(): Playlist[] {
    const rows = repo.listPlaylists();
    return rows.map((r) => {
      const items = repo.getPlaylistItems(r.id).map(rowToItem);
      return rowToPlaylist(r, items);
    });
  }

  get(id: string): Playlist | undefined {
    const row = repo.getPlaylist(id);
    if (!row) return undefined;
    const items = repo.getPlaylistItems(row.id).map(rowToItem);
    return rowToPlaylist(row, items);
  }

  create(data: { name: string; description?: string; items: PlaylistItem[] }): Playlist {
    const id = `pl_${Date.now()}`;
    const now = new Date().toISOString();
    const coverItem = data.items.find((i) => i.coverUrl);

    repo.insertPlaylist({
      id,
      name: data.name,
      description: data.description ?? "",
      cover_url: coverItem?.coverUrl ?? null,
      created_at: now,
      updated_at: now,
    });

    for (let i = 0; i < data.items.length; i++) {
      const item = data.items[i];
      repo.insertPlaylistItem({
        id: item.id || `${id}_${i}`,
        playlist_id: id,
        type: item.type,
        song_id: item.songId ?? null,
        title: item.title ?? null,
        artist: item.artist ?? null,
        cover_url: item.coverUrl ?? null,
        audio_url: item.audioUrl ?? null,
        text_field: item.text ?? null,
        reason: item.reason ?? null,
        sort_order: i,
      });
    }

    return this.get(id)!;
  }

  update(id: string, data: Partial<Pick<Playlist, "name" | "description" | "items">>): Playlist | undefined {
    const existing = repo.getPlaylist(id);
    if (!existing) return undefined;

    const updateData: { name?: string; description?: string; cover_url?: string } = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.items) {
      const coverItem = data.items.find((i) => i.coverUrl);
      if (coverItem) updateData.cover_url = coverItem.coverUrl;

      repo.deletePlaylistItems(id);
      for (let i = 0; i < data.items.length; i++) {
        const item = data.items[i];
        repo.insertPlaylistItem({
          id: item.id || `${id}_${i}`,
          playlist_id: id,
          type: item.type,
          song_id: item.songId ?? null,
          title: item.title ?? null,
          artist: item.artist ?? null,
          cover_url: item.coverUrl ?? null,
          audio_url: item.audioUrl ?? null,
          text_field: item.text ?? null,
          reason: item.reason ?? null,
          sort_order: i,
        });
      }
    }

    repo.updatePlaylist(id, updateData);
    return this.get(id);
  }

  delete(id: string): boolean {
    return repo.deletePlaylist(id);
  }
}
