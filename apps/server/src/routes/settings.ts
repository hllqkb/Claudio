import type { FastifyInstance } from "fastify";
import { getAllSettings, setSetting } from "../db/settings.repo.js";

const SENSITIVE_KEYS = [
  "claude_api_key",
  "fish_audio_api_key",
  "openweather_api_key",
  "feishu_app_secret",
  "ncm_cookie",
];

function maskSensitive(settings: Record<string, string>): Record<string, string> {
  const masked: Record<string, string> = {};
  for (const [key, value] of Object.entries(settings)) {
    if (SENSITIVE_KEYS.includes(key) && value) {
      masked[key] = "***已配置***";
    } else {
      masked[key] = value;
    }
  }
  return masked;
}

export async function settingsRoutes(app: FastifyInstance) {
  app.get("/api/settings", async () => {
    const settings = getAllSettings();
    return maskSensitive(settings);
  });

  app.put("/api/settings", async (request) => {
    const body = request.body as Record<string, string>;
    for (const [key, value] of Object.entries(body)) {
      if (typeof value === "string") {
        setSetting(key, value);
      }
    }
    return { ok: true };
  });
}
