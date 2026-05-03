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
}

export interface NcmService {
  search(keyword: string, limit?: number): Promise<SongSearchResult[]>;
  getSongUrl(songId: string, title?: string, artist?: string): Promise<SongUrlResult>;
  getLyric(songId: string): Promise<LyricResult>;
  getPlaylistDetail(playlistId: string): Promise<SongSearchResult[]>;
  recommend(limit?: number): Promise<SongSearchResult[]>;
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
    return { lrc: "[00:00.00]暂无歌词" };
  }

  async getPlaylistDetail(playlistId: string): Promise<SongSearchResult[]> {
    return [];
  }

  async recommend(limit = 10): Promise<SongSearchResult[]> {
    return this.search("推荐", limit);
  }
}

export class NeteaseNcmService implements NcmService {
  constructor(
    private baseUrl: string,
    private cookie?: string
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
    return {
      id: String(raw.id),
      title: raw.name ?? raw.title ?? "",
      artist: artists.map((a: any) => a.name).join(", "),
      album: album.name ?? "",
      coverUrl: album.picUrl ?? album.pic_url ?? "",
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
      };
    } catch {
      return { lrc: "[00:00.00]暂无歌词" };
    }
  }

  async getPlaylistDetail(playlistId: string): Promise<SongSearchResult[]> {
    try {
      const data = await this.fetchJson<any>("/playlist/detail", { id: playlistId });
      const tracks = data?.playlist?.tracks ?? [];
      return tracks.map((t: any) => this.mapSong(t));
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
