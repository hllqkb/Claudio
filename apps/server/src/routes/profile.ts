import type { FastifyInstance } from "fastify";
import { getTopArtists, getRecentThemes, getMoodPreference, getPlayStats } from "../db/plays.repo.js";

export async function profileRoutes(app: FastifyInstance) {
  app.get("/api/profile", async () => {
    const topArtists = getTopArtists(10);
    const recentThemes = getRecentThemes(5);
    const moodPreference = getMoodPreference();
    const stats = getPlayStats();

    return {
      topArtists: topArtists.length > 0 ? topArtists : [{ name: "暂无数据", count: 0 }],
      decadeDistribution: { "2020s": stats.totalPlays > 0 ? 100 : 0 },
      languageDistribution: { zh: stats.totalPlays > 0 ? 100 : 0 },
      moodPreference: Object.keys(moodPreference).length > 0 ? moodPreference : { 暂无: 1 },
      recentThemes: recentThemes.length > 0 ? recentThemes : ["暂无播放记录"],
    };
  });
}
