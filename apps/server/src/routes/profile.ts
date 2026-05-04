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

  // Full profile: stats + user preferences + recommendation history
  app.get("/api/profile/full", async () => {
    const { profile } = app.services;
    await profile.load();

    const topArtists = getTopArtists(20);
    const recentThemes = getRecentThemes(5);
    const moodPreference = getMoodPreference();
    const stats = getPlayStats();
    const totalMinutes = getTotalMinutes();
    const favoriteCount = getFavoriteCount();
    const prefs = profile.getPreferences();
    const fullProfile = profile.getProfile();

    return {
      stats: {
        totalPlays: stats.totalPlays,
        totalMinutes,
        favoriteCount,
        topArtists,
        decadeDistribution: getDecadeDistribution(),
        languageDistribution: getLanguageDistribution(),
        moodPreference,
        recentThemes,
      },
      preferences: prefs,
      dailyRecommendations: fullProfile.dailyRecommendations.slice(-7),
    };
  });

  // Update user preferences
  app.put("/api/profile/preferences", async (request) => {
    const { profile } = app.services;
    const body = request.body as {
      favoriteGenres?: string[];
      dislikedGenres?: string[];
      preferredScenes?: string[];
      preferredMoods?: string[];
      userNote?: string;
    };
    await profile.updatePreferences(body);
    return { ok: true };
  });
}
