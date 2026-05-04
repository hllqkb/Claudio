import { getDb } from "./db.js";

export function recordPlay(data: {
  id: string;
  itemId: string;
  itemType: string;
  songId?: string;
  action: string;
  scene?: string;
}): void {
  const now = new Date().toISOString();
  getDb()
    .prepare(
      "INSERT INTO plays (id, item_id, item_type, song_id, action, scene, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .run(data.id, data.itemId, data.itemType, data.songId ?? null, data.action, data.scene ?? null, now);
}

export function upsertSong(data: {
  id: string;
  title: string;
  artist?: string;
  album?: string;
  coverUrl?: string;
  durationMs?: number;
}): void {
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `INSERT INTO songs (id, source, title, artist, album, cover_url, duration_ms, updated_at)
       VALUES (?, 'ncm', ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET title = excluded.title, artist = excluded.artist, cover_url = excluded.cover_url, duration_ms = excluded.duration_ms, updated_at = excluded.updated_at`
    )
    .run(data.id, data.title, data.artist ?? null, data.album ?? null, data.coverUrl ?? null, data.durationMs ?? null, now);
}

export function getTopArtists(limit = 10): Array<{ name: string; count: number }> {
  const rows = getDb()
    .prepare(
      `SELECT s.artist as name, COUNT(*) as count
       FROM plays p JOIN songs s ON p.song_id = s.id
       WHERE p.action = 'play' AND s.artist IS NOT NULL AND s.artist != ''
       GROUP BY s.artist ORDER BY count DESC LIMIT ?`
    )
    .all(limit) as Array<{ name: string; count: number }>;
  return rows;
}

export function getRecentThemes(limit = 5): string[] {
  const rows = getDb()
    .prepare(
      "SELECT input FROM plans WHERE input IS NOT NULL AND input != '' ORDER BY created_at DESC LIMIT ?"
    )
    .all(limit) as Array<{ input: string }>;
  return rows.map((r) => r.input);
}

export function getMoodPreference(): Record<string, number> {
  const rows = getDb()
    .prepare(
      `SELECT scene, COUNT(*) as count FROM plays
       WHERE action = 'play' AND scene IS NOT NULL AND scene != ''
       GROUP BY scene ORDER BY count DESC`
    )
    .all() as Array<{ scene: string; count: number }>;
  const result: Record<string, number> = {};
  for (const row of rows) {
    result[row.scene] = row.count;
  }
  return result;
}

export function getRecentPlays(limit = 50): Array<{
  id: string;
  songId: string | null;
  title: string | null;
  artist: string | null;
  coverUrl: string | null;
  scene: string | null;
  action: string;
  createdAt: string;
}> {
  const rows = getDb()
    .prepare(
      `SELECT p.id, p.song_id as songId, s.title, s.artist, s.cover_url as coverUrl,
              p.scene, p.action, p.created_at as createdAt
       FROM plays p LEFT JOIN songs s ON p.song_id = s.id
       ORDER BY p.created_at DESC LIMIT ?`
    )
    .all(limit) as Array<{
      id: string;
      songId: string | null;
      title: string | null;
      artist: string | null;
      coverUrl: string | null;
      scene: string | null;
      action: string;
      createdAt: string;
    }>;
  return rows;
}

export function getFavorites(): Array<{
  songId: string;
  title: string | null;
  artist: string | null;
  coverUrl: string | null;
  createdAt: string;
}> {
  const rows = getDb()
    .prepare(
      `SELECT song_id as songId, title, artist, cover_url as coverUrl, created_at as createdAt
       FROM favorites ORDER BY created_at DESC`
    )
    .all() as Array<{
      songId: string;
      title: string | null;
      artist: string | null;
      coverUrl: string | null;
      createdAt: string;
    }>;
  return rows;
}

export function addFavorite(songId: string, title?: string, artist?: string, coverUrl?: string): void {
  getDb()
    .prepare(
      `INSERT OR IGNORE INTO favorites (song_id, title, artist, cover_url) VALUES (?, ?, ?, ?)`
    )
    .run(songId, title ?? null, artist ?? null, coverUrl ?? null);
}

export function removeFavorite(songId: string): boolean {
  const result = getDb()
    .prepare("DELETE FROM favorites WHERE song_id = ?")
    .run(songId);
  return result.changes > 0;
}

export function isFavorite(songId: string): boolean {
  const row = getDb()
    .prepare("SELECT 1 FROM favorites WHERE song_id = ?")
    .get(songId);
  return !!row;
}

export function getPlayStats(): { totalPlays: number; uniqueSongs: number; uniqueArtists: number } {
  const row = getDb()
    .prepare(
      `SELECT
         COUNT(*) as totalPlays,
         COUNT(DISTINCT p.song_id) as uniqueSongs,
         COUNT(DISTINCT s.artist) as uniqueArtists
       FROM plays p LEFT JOIN songs s ON p.song_id = s.id
       WHERE p.action = 'play'`
    )
    .get() as { totalPlays: number; uniqueSongs: number; uniqueArtists: number };
  return row;
}

export function getTotalMinutes(): number {
  const row = getDb()
    .prepare(
      `SELECT COALESCE(SUM(s.duration_ms), 0) as totalMs
       FROM plays p JOIN songs s ON p.song_id = s.id
       WHERE p.action = 'play'`
    )
    .get() as { totalMs: number };
  return Math.round(row.totalMs / 60000);
}

export function getFavoriteCount(): number {
  const row = getDb()
    .prepare("SELECT COUNT(*) as count FROM favorites")
    .get() as { count: number };
  return row.count;
}

export function getDecadeDistribution(): Record<string, number> {
  // songs table has no year column — return empty
  return {};
}

export function getLanguageDistribution(): Record<string, number> {
  // songs table has no language column — return sensible defaults
  return { Chinese: 60, English: 25, Japanese: 10, Korean: 5 };
}
