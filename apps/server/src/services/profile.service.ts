import { readFile, writeFile, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { existsSync } from "node:fs";

export interface UserProfile {
  listenHistory: Array<{
    songId: string;
    title: string;
    artist: string;
    ts: number;
    action: "played" | "skipped" | "liked";
  }>;
  inferredGenres: Record<string, number>;
  inferredArtists: Record<string, number>;
  moodHistory: Array<{ mood: string; ts: number }>;
  lastRecommendDate?: string;
  dailyRecommendations: Array<{ date: string; songIds: string[] }>;
  favoriteGenres: string[];
  dislikedGenres: string[];
  preferredScenes: string[];
  preferredMoods: string[];
  userNote: string;
}

const DEFAULT_PROFILE: UserProfile = {
  listenHistory: [],
  inferredGenres: {},
  inferredArtists: {},
  moodHistory: [],
  dailyRecommendations: [],
  favoriteGenres: [],
  dislikedGenres: [],
  preferredScenes: [],
  preferredMoods: [],
  userNote: "",
};

export class ProfileService {
  private profilePath: string;
  private profile: UserProfile = { ...DEFAULT_PROFILE };
  private loaded = false;

  constructor() {
    const dir = join(homedir(), ".hermes", "claudio");
    this.profilePath = join(dir, "profile.json");
    if (!existsSync(dir)) {
      import("node:fs").then((fs) => fs.mkdirSync(dir, { recursive: true }));
    }
  }

  async load(): Promise<UserProfile> {
    if (this.loaded) return this.profile;
    try {
      const data = await readFile(this.profilePath, "utf-8");
      this.profile = { ...DEFAULT_PROFILE, ...JSON.parse(data) };
      this.loaded = true;
    } catch {
      this.profile = { ...DEFAULT_PROFILE };
      this.loaded = true;
    }
    return this.profile;
  }

  async save(): Promise<void> {
    try {
      await writeFile(
        this.profilePath,
        JSON.stringify(this.profile, null, 2),
        "utf-8"
      );
    } catch (e) {
      console.error("[profile] save failed:", (e as Error).message);
    }
  }

  getProfile(): UserProfile {
    return this.profile;
  }

  async updatePreferences(prefs: {
    favoriteGenres?: string[];
    dislikedGenres?: string[];
    preferredScenes?: string[];
    preferredMoods?: string[];
    userNote?: string;
  }): Promise<void> {
    await this.load();
    if (prefs.favoriteGenres !== undefined) this.profile.favoriteGenres = prefs.favoriteGenres;
    if (prefs.dislikedGenres !== undefined) this.profile.dislikedGenres = prefs.dislikedGenres;
    if (prefs.preferredScenes !== undefined) this.profile.preferredScenes = prefs.preferredScenes;
    if (prefs.preferredMoods !== undefined) this.profile.preferredMoods = prefs.preferredMoods;
    if (prefs.userNote !== undefined) this.profile.userNote = prefs.userNote;
    await this.save();
  }

  getPreferences(): {
    favoriteGenres: string[];
    dislikedGenres: string[];
    preferredScenes: string[];
    preferredMoods: string[];
    userNote: string;
  } {
    return {
      favoriteGenres: this.profile.favoriteGenres,
      dislikedGenres: this.profile.dislikedGenres,
      preferredScenes: this.profile.preferredScenes,
      preferredMoods: this.profile.preferredMoods,
      userNote: this.profile.userNote,
    };
  }

  async recordListen(
    songId: string,
    title: string,
    artist: string,
    action: "played" | "skipped" | "liked"
  ) {
    await this.load();
    this.profile.listenHistory.push({
      songId,
      title,
      artist,
      ts: Date.now(),
      action,
    });
    if (this.profile.listenHistory.length > 200) {
      this.profile.listenHistory = this.profile.listenHistory.slice(-200);
    }
    if (action === "played" || action === "liked") {
      this.profile.inferredArtists[artist] =
        (this.profile.inferredArtists[artist] || 0) +
        (action === "liked" ? 3 : 1);
    }
    await this.save();
  }

  async recordMood(mood: string) {
    await this.load();
    this.profile.moodHistory.push({ mood, ts: Date.now() });
    if (this.profile.moodHistory.length > 50) {
      this.profile.moodHistory = this.profile.moodHistory.slice(-50);
    }
    await this.save();
  }

  async hasRecommendedToday(): Promise<boolean> {
    await this.load();
    const today = new Date().toISOString().slice(0, 10);
    return this.profile.lastRecommendDate === today;
  }

  async markRecommendedToday(songIds: string[]) {
    await this.load();
    const today = new Date().toISOString().slice(0, 10);
    this.profile.lastRecommendDate = today;
    this.profile.dailyRecommendations.push({ date: today, songIds });
    if (this.profile.dailyRecommendations.length > 30) {
      this.profile.dailyRecommendations =
        this.profile.dailyRecommendations.slice(-30);
    }
    await this.save();
  }

  getProfileSummary(): string {
    const p = this.profile;
    const parts: string[] = [];

    const topArtists = Object.entries(p.inferredArtists)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, weight]) => `${name}(${weight})`);
    if (topArtists.length > 0) {
      parts.push(`用户常听艺术家：${topArtists.join("、")}`);
    }

    const recent = p.listenHistory.slice(-5);
    if (recent.length > 0) {
      parts.push(
        `最近收听：${recent.map((r) => `${r.title}-${r.artist}`).join("、")}`
      );
    }

    const skips = p.listenHistory
      .filter((r) => r.action === "skipped")
      .slice(-3);
    if (skips.length > 0) {
      parts.push(
        `用户跳过的歌（不喜欢）：${skips.map((r) => `${r.title}-${r.artist}`).join("、")}`
      );
    }

    const recentMood = p.moodHistory.slice(-3);
    if (recentMood.length > 0) {
      parts.push(`最近情绪：${recentMood.map((m) => m.mood).join("→")}`);
    }

    if (p.favoriteGenres.length > 0) {
      parts.push(`用户喜欢的音乐风格：${p.favoriteGenres.join("、")}`);
    }
    if (p.dislikedGenres.length > 0) {
      parts.push(`用户不喜欢的风格：${p.dislikedGenres.join("、")}`);
    }
    if (p.userNote) {
      parts.push(`用户备注：${p.userNote}`);
    }

    return parts.join("\n");
  }
}
