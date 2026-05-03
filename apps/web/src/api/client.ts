const BASE = "";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export interface NowResponse {
  nowPlaying: QueueItem | null;
  queue: QueueItem[];
  scene: string;
  djStatus: "idle" | "thinking" | "speaking" | "error";
}

export interface QueueItem {
  id: string;
  type: "song" | "tts";
  songId?: string;
  title?: string;
  artist?: string;
  coverUrl?: string;
  audioUrl?: string;
  text?: string;
  reason?: string;
  status: "pending" | "playing" | "played" | "skipped" | "failed";
}

export interface PlanResponse {
  planId: string;
  scene: string;
  items: QueueItem[];
}

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

export interface NcmPlaylistSummary {
  id: string;
  name: string;
  coverUrl: string;
  trackCount: number;
  creator: string;
  description: string;
}

export interface NcmTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  coverUrl: string;
  durationMs: number;
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  services: Record<string, string>;
}

export const api = {
  getHealth: () => request<HealthResponse>("/api/health"),
  getNow: () => request<NowResponse>("/api/now"),
  postPlan: (body: {
    trigger?: string;
    input?: string;
    maxSongs?: number;
    withDj?: boolean;
  }) =>
    request<PlanResponse>("/api/plan", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  postIntent: (text: string) =>
    request<{ intent: string; planId: string; scene: string; summary: string; message: string; items: QueueItem[] }>("/api/intent", {
      method: "POST",
      body: JSON.stringify({ text }),
    }),
  playerPlay: () => fetch("/api/player/play", { method: "POST" }),
  playerPause: () => fetch("/api/player/pause", { method: "POST" }),
  playerNext: () => fetch("/api/player/next", { method: "POST" }),
  playerPrevious: () => fetch("/api/player/previous", { method: "POST" }),
  getSettings: () => request<Record<string, string>>("/api/settings"),
  putSettings: (body: Record<string, string>) =>
    request<{ ok: boolean }>("/api/settings", {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  getProfile: () =>
    request<{
      topArtists: Array<{ name: string; count: number }>;
      decadeDistribution: Record<string, number>;
      languageDistribution: Record<string, number>;
      moodPreference: Record<string, number>;
      recentThemes: string[];
    }>("/api/profile"),
  getPlaylists: () => request<{ playlists: Playlist[] }>("/api/playlists"),
  getPlaylist: (id: string) => request<{ playlist: Playlist }>(`/api/playlists/${id}`),
  createPlaylist: (body: { name: string; description?: string; items: PlaylistItem[] }) =>
    request<{ playlist: Playlist }>("/api/playlists", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  deletePlaylist: (id: string) =>
    request<{ ok: boolean }>(`/api/playlists/${id}`, { method: "DELETE" }),
  getNcmPlaylists: () => request<{ playlists: NcmPlaylistSummary[] }>("/api/ncm/playlists"),
  getNcmPlaylistDetail: (id: string) => request<{ tracks: NcmTrack[] }>(`/api/ncm/playlists/${id}`),
  getLyric: (songId: string) => request<{ lrc: string; tlyric?: string; yrc?: string }>(`/api/lyric?id=${encodeURIComponent(songId)}`),
  reportPlay: (body: { songId?: string; title?: string; artist?: string; coverUrl?: string; durationMs?: number; scene?: string }) =>
    fetch("/api/plays/report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
};
