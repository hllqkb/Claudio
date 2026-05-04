import { getDb } from "./db.js";

interface PlaylistRow {
  id: string;
  name: string;
  description: string;
  cover_url: string | null;
  created_at: string;
  updated_at: string;
}

interface PlaylistItemRow {
  id: string;
  playlist_id: string;
  type: string;
  song_id: string | null;
  title: string | null;
  artist: string | null;
  cover_url: string | null;
  audio_url: string | null;
  text_field: string | null;
  reason: string | null;
  sort_order: number;
}

export function listPlaylists(): PlaylistRow[] {
  return getDb()
    .prepare("SELECT * FROM playlists ORDER BY updated_at DESC")
    .all() as PlaylistRow[];
}

export function getPlaylist(id: string): PlaylistRow | undefined {
  return getDb()
    .prepare("SELECT * FROM playlists WHERE id = ?")
    .get(id) as PlaylistRow | undefined;
}

export function getPlaylistItems(playlistId: string): PlaylistItemRow[] {
  return getDb()
    .prepare("SELECT * FROM playlist_items WHERE playlist_id = ? ORDER BY sort_order")
    .all(playlistId) as PlaylistItemRow[];
}

export function insertPlaylist(row: PlaylistRow): void {
  getDb()
    .prepare(
      "INSERT INTO playlists (id, name, description, cover_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .run(row.id, row.name, row.description, row.cover_url, row.created_at, row.updated_at);
}

export function insertPlaylistItem(row: PlaylistItemRow): void {
  getDb()
    .prepare(
      "INSERT INTO playlist_items (id, playlist_id, type, song_id, title, artist, cover_url, audio_url, text_field, reason, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .run(
      row.id, row.playlist_id, row.type, row.song_id, row.title,
      row.artist, row.cover_url, row.audio_url, row.text_field, row.reason, row.sort_order
    );
}

export function updatePlaylist(id: string, data: { name?: string; description?: string; cover_url?: string }): void {
  const now = new Date().toISOString();
  const fields: string[] = ["updated_at = ?"];
  const values: (string | null)[] = [now];

  if (data.name !== undefined) { fields.push("name = ?"); values.push(data.name); }
  if (data.description !== undefined) { fields.push("description = ?"); values.push(data.description); }
  if (data.cover_url !== undefined) { fields.push("cover_url = ?"); values.push(data.cover_url); }

  values.push(id);
  getDb().prepare(`UPDATE playlists SET ${fields.join(", ")} WHERE id = ?`).run(...values);
}

export function deletePlaylistItems(playlistId: string): void {
  getDb().prepare("DELETE FROM playlist_items WHERE playlist_id = ?").run(playlistId);
}

export function deletePlaylist(id: string): boolean {
  const result = getDb().prepare("DELETE FROM playlists WHERE id = ?").run(id);
  return result.changes > 0;
}
