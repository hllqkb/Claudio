import type { FastifyInstance } from "fastify";
import { getTopArtists, getRecentThemes, getMoodPreference, getPlayStats, getTotalMinutes, getFavoriteCount, getDecadeDistribution, getLanguageDistribution } from "../db/plays.repo.js";

export async function profileRoutes(app: FastifyInstance) {
  app.get("/api/profile", async () => {
    const topArtists = getTopArtists(20);
    const recentThemes = getRecentThemes(5);
    const moodPreference = getMoodPreference();
    const stats = getPlayStats();
    const totalMinutes = getTotalMinutes();
    const favoriteCount = getFavoriteCount();

    return {
      totalPlays: stats.totalPlays,
      totalMinutes,
      favoriteCount,
      topArtists,
      decadeDistribution: getDecadeDistribution(),
      languageDistribution: getLanguageDistribution(),
      moodPreference,
      recentThemes,
    };
  });
}
