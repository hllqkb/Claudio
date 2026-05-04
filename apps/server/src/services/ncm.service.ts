export interface SongSearchResult {
  id: string;
  title: string;
  artist: string;
  album: string;
  coverUrl: string;
  durationMs: number;
}

export interface SongUrlResult {
  url: string | null;
  br: number;
}

export interface LyricResult {
  lrc: string;
  tlyric?: string;
  yrc?: string;
}

export interface NcmService {
  search(keyword: string, limit?: number): Promise<SongSearchResult[]>;
  getSongUrl(songId: string, title?: string, artist?: string): Promise<SongUrlResult>;
  getLyric(songId: string): Promise<LyricResult>;
  getPlaylistDetail(playlistId: string): Promise<SongSearchResult[]>;
  getUserPlaylists(): Promise<PlaylistSummary[]>;
  recommend(limit?: number): Promise<SongSearchResult[]>;
}

export interface PlaylistSummary {
  id: string;
  name: string;
  coverUrl: string;
  trackCount: number;
  creator: string;
  description: string;
}

export class MockNcmService implements NcmService {
  async search(keyword: string, limit = 10): Promise<SongSearchResult[]> {
    const results: SongSearchResult[] = [];
    for (let i = 1; i <= Math.min(limit, 5); i++) {
      results.push({
        id: `mock_${keyword}_${i}`,
        title: `${keyword} - 歌曲${i}`,
        artist: `歌手${i}`,
        album: `专辑${i}`,
        coverUrl: "",
        durationMs: 200000 + i * 30000,
      });
    }
    return results;
  }

  async getSongUrl(songId: string, title?: string, artist?: string): Promise<SongUrlResult> {
    return { url: null, br: 128 };
  }

  async getLyric(songId: string): Promise<LyricResult> {
    return { lrc: "[00:00.00]暂无歌词", yrc: undefined };
  }

  async getPlaylistDetail(playlistId: string): Promise<SongSearchResult[]> {
    return [];
  }

  async recommend(limit = 10): Promise<SongSearchResult[]> {
    return this.search("推荐", limit);
  }

  async getUserPlaylists(): Promise<PlaylistSummary[]> {
    return [
      { id: "mock_pl_1", name: "深夜编程", coverUrl: "", trackCount: 12, creator: "Claudio", description: "适合编码时听的音乐" },
      { id: "mock_pl_2", name: "晨间冥想", coverUrl: "", trackCount: 8, creator: "Claudio", description: "安静的早晨旋律" },
      { id: "mock_pl_3", name: "通勤路上", coverUrl: "", trackCount: 15, creator: "Claudio", description: "充满活力的通勤歌单" },
    ];
  }
}

export class NeteaseNcmService implements NcmService {
  constructor(
    private baseUrl: string,
    private cookie?: string,
    private uid?: string
  ) {}

  private async fetchJson<T>(path: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(path, this.baseUrl);
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
    if (this.cookie) {
      url.searchParams.set("cookie", this.cookie);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    try {
      const res = await fetch(url.toString(), { signal: controller.signal });
      if (!res.ok) throw new Error(`NCM API ${res.status}: ${res.statusText}`);
      return (await res.json()) as T;
    } finally {
      clearTimeout(timer);
    }
  }

  private mapSong(raw: any): SongSearchResult {
    const artists = raw.artists ?? raw.ar ?? [];
    const album = raw.album ?? raw.al ?? {};
    const rawCover = album.picUrl ?? album.pic_url ?? "";
    const coverUrl = rawCover ? `/api/cover?url=${encodeURIComponent(rawCover)}` : "";
    return {
      id: String(raw.id),
      title: raw.name ?? raw.title ?? "",
      artist: artists.map((a: any) => a.name).join(", "),
      album: album.name ?? "",
      coverUrl,
      durationMs: raw.duration ?? raw.dt ?? 0,
    };
  }

  async search(keyword: string, limit = 10): Promise<SongSearchResult[]> {
    try {
      const data = await this.fetchJson<any>("/search", {
        keywords: keyword,
        limit: String(limit),
      });
      const songs = data?.result?.songs ?? data?.songs ?? [];
      return songs.map((s: any) => this.mapSong(s));
    } catch {
      return [];
    }
  }

  async getSongUrl(songId: string, title?: string, artist?: string): Promise<SongUrlResult> {
    try {
      const params: Record<string, string> = { id: songId };
      if (title) params.title = title;
      if (artist) params.artist = artist;
      const data = await this.fetchJson<any>("/song/url", params);
      const item = data?.data?.[0];
      return { url: item?.url ?? null, br: item?.br ?? 128 };
    } catch {
      return { url: null, br: 128 };
    }
  }

  async getLyric(songId: string): Promise<LyricResult> {
    try {
      const data = await this.fetchJson<any>("/lyric", { id: songId });
      return {
        lrc: data?.lrc?.lyric ?? "[00:00.00]暂无歌词",
        tlyric: data?.tlyric?.lyric,
        yrc: data?.yrc?.lyric,
      };
    } catch {
      return { lrc: "[00:00.00]暂无歌词" };
    }
  }

  async getPlaylistDetail(playlistId: string): Promise<SongSearchResult[]> {
    try {
      const data = await this.fetchJson<any>("/playlist/detail", { id: playlistId });
      const tracks = data?.playlist?.tracks ?? [];
      return tracks.map((t: any) => {
        // NCM server already mapped songs, just proxy the cover URL
        if (t.coverUrl !== undefined) {
          const rawCover = t.coverUrl ?? "";
          return {
            ...t,
            coverUrl: rawCover ? `/api/cover?url=${encodeURIComponent(rawCover)}` : "",
          };
        }
        return this.mapSong(t);
      });
    } catch {
      return [];
    }
  }

  async getUserPlaylists(): Promise<PlaylistSummary[]> {
    if (!this.uid) return [];
    try {
      const data = await this.fetchJson<any>("/user/playlist", {
        uid: this.uid,
        limit: "50",
      });
      const playlists = data?.playlist ?? [];
      return playlists.map((p: any) => {
        const rawCover = p.coverUrl ?? p.coverImgUrl ?? p.picUrl ?? "";
        const coverUrl = rawCover ? `/api/cover?url=${encodeURIComponent(rawCover)}` : "";
        return {
          id: String(p.id),
          name: p.name ?? "",
          coverUrl,
          trackCount: p.trackCount ?? 0,
          creator: p.creator?.nickname ?? p.creator ?? "",
          description: p.description ?? "",
        };
      });
    } catch {
      return [];
    }
  }

  async recommend(limit = 10): Promise<SongSearchResult[]> {
    try {
      const data = await this.fetchJson<any>("/recommend/songs");
      const songs = data?.data?.dailySongs ?? [];
      return songs.slice(0, limit).map((s: any) => this.mapSong(s));
    } catch {
      return [];
    }
  }
}
