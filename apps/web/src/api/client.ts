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

export interface RecentPlay {
    id: string;
    songId: string | null;
    title: string | null;
    artist: string | null;
    coverUrl: string | null;
    scene: string | null;
    action: string;
    createdAt: string;
}

export interface FavoriteItem {
    songId: string;
    title: string | null;
    artist: string | null;
    coverUrl: string | null;
    createdAt: string;
}

export interface StreamChatCallbacks {
    onChunk?: (text: string) => void;
    onPlan?: (plan: { scene: string; summary: string; itemCount: number; songCount: number }) => void;
    onItem?: (item: QueueItem) => void;
    onDone?: (data: { planId: string; totalItems: number }) => void;
    onError?: (message: string) => void;
    onStatus?: (phase: string) => void;
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

    /**
     * Streaming chat: sends text, receives real-time SSE events.
     * Returns a function to abort the stream.
     */
    streamChat: (text: string, callbacks: StreamChatCallbacks): AbortController => {
        const controller = new AbortController();

        (async () => {
            try {
                const res = await fetch(`${BASE}/api/chat/stream`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ text }),
                    signal: controller.signal,
                });

                if (!res.ok) {
                    callbacks.onError?.(`Server error: ${res.status}`);
                    return;
                }

                const reader = res.body?.getReader();
                if (!reader) {
                    callbacks.onError?.("No response body");
                    return;
                }

                const decoder = new TextDecoder();
                let buffer = "";

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split("\n");
                    buffer = lines.pop() ?? "";

                    let currentEvent = "";

                    for (const line of lines) {
                        const trimmed = line.trim();

                        if (trimmed.startsWith("event:")) {
                            currentEvent = trimmed.slice(6).trim();
                            continue;
                        }

                        if (trimmed.startsWith("data:")) {
                            const jsonStr = trimmed.slice(5).trim();
                            try {
                                const data = JSON.parse(jsonStr);

                                switch (currentEvent) {
                                    case "chunk":
                                        callbacks.onChunk?.(data.text);
                                        break;
                                    case "plan":
                                        callbacks.onPlan?.(data);
                                        break;
                                    case "item":
                                        callbacks.onItem?.(data as QueueItem);
                                        break;
                                    case "done":
                                        callbacks.onDone?.(data);
                                        break;
                                    case "error":
                                        callbacks.onError?.(data.message);
                                        break;
                                    case "status":
                                        callbacks.onStatus?.(data.phase);
                                        break;
                                }
                            } catch {
                                // Skip unparseable
                            }
                        }
                    }
                }
            } catch (err) {
                if ((err as Error).name !== "AbortError") {
                    callbacks.onError?.((err as Error).message);
                }
            }
        })();

        return controller;
    },

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
            totalPlays: number;
            totalMinutes: number;
            favoriteCount: number;
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
    searchSongs: (q: string, limit = 10) =>
        request<{ results: Array<{ id: string; title: string; artist: string; album: string; coverUrl: string; durationMs: number }> }>(
            `/api/search?q=${encodeURIComponent(q)}&limit=${limit}`
        ),
    reportPlay: (body: { songId?: string; title?: string; artist?: string; coverUrl?: string; durationMs?: number; scene?: string }) =>
        fetch("/api/plays/report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),

    getRecentPlays: (limit?: number) =>
        request<{ plays: RecentPlay[] }>(`/api/plays/recent${limit ? `?limit=${limit}` : ""}`),
    getFavorites: () => request<{ favorites: FavoriteItem[] }>("/api/favorites"),
    addFavorite: (body: { songId: string; title?: string; artist?: string; coverUrl?: string }) =>
        request<{ ok: boolean }>("/api/favorites", { method: "POST", body: JSON.stringify(body) }),
    removeFavorite: (songId: string) =>
        request<{ ok: boolean }>(`/api/favorites/${encodeURIComponent(songId)}`, { method: "DELETE" }),
    getQueue: () =>
        request<{ items: QueueItem[] }>("/api/queue"),
    saveQueue: (items: QueueItem[]) =>
        request<{ ok: boolean }>("/api/queue", {
            method: "PUT",
            body: JSON.stringify({ items }),
        }),
    getChatMessages: (limit?: number) =>
        request<{ messages: Array<{ id: string; role: string; text: string; ts: number; songs?: unknown[] }> }>(
            `/api/chat/messages${limit ? `?limit=${limit}` : ""}`
        ),
    saveChatMessage: (body: { id: string; role: string; text: string; meta?: unknown }) =>
        request<{ ok: boolean }>("/api/chat/messages", {
            method: "POST",
            body: JSON.stringify(body),
        }),
    syncFavorites: (songs: Array<{ songId: string; title: string; artist: string; coverUrl?: string }>) =>
        request<{ ok: boolean; synced: number }>("/api/favorites/sync", {
            method: "POST",
            body: JSON.stringify({ songs }),
        }),
};
