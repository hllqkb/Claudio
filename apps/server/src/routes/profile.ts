import type { FastifyInstance } from "fastify";

export async function profileRoutes(app: FastifyInstance) {
  app.get("/api/profile", async () => {
    return {
      topArtists: [
        { name: "周杰伦", count: 42 },
        { name: "陈奕迅", count: 35 },
        { name: "Radiohead", count: 28 },
      ],
      decadeDistribution: { "2000s": 30, "2010s": 45, "2020s": 25 },
      languageDistribution: { zh: 60, en: 30, ja: 10 },
      moodPreference: { 安静: 35, 怀旧: 25, 燃: 20, 电子: 20 },
      recentThemes: ["写代码", "放松", "早晨"],
    };
  });
}
