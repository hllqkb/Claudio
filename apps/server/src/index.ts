import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import { loadConfig } from "./config.js";
import { getDb, closeDb } from "./db/db.js";
import { getSetting } from "./db/settings.repo.js";
import { nowRoutes } from "./routes/now.js";
import { planRoutes } from "./routes/plan.js";
import { playerRoutes } from "./routes/player.js";
import { settingsRoutes } from "./routes/settings.js";
import { profileRoutes } from "./routes/profile.js";
import { intentRoutes } from "./routes/intent.js";
import { streamRoutes } from "./routes/stream.js";
import { mediaRoutes } from "./routes/media.js";
import { audioRoutes } from "./routes/audio.js";
import { playlistRoutes } from "./routes/playlist.js";
import { ncmPlaylistRoutes } from "./routes/ncm-playlists.js";
import { lyricRoutes } from "./routes/lyric.js";
import { coverRoutes } from "./routes/cover.js";
import { searchRoutes } from "./routes/search.js";
import { queueRoutes } from "./routes/queue.js";
import { chatRoutes } from "./routes/chat.js";
import { MockNcmService, NeteaseNcmService } from "./services/ncm.service.js";
import { MockClaudeService, ClaudeApiService } from "./services/claude.service.js";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { MockTtsService, FishTtsService } from "./services/tts.service.js";
import { MockWeatherService, OpenWeatherService, WttrInService } from "./services/weather.service.js";
import { MockCalendarService, FeishuCalendarService } from "./services/calendar.service.js";
import { MockUpnpService } from "./services/upnp.service.js";
import { MockSchedulerService, CronSchedulerService } from "./services/scheduler.service.js";
import { ContextService } from "./services/context.service.js";
import { PlaylistService } from "./services/playlist.service.js";
import fastifyStatic from "@fastify/static";
import { existsSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const config = loadConfig();

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });
await app.register(websocket);

getDb();

const ncmCookie = getSetting("ncm_cookie") ?? "";
const ncmUid = getSetting("ncm_uid") ?? config.ncm.uid;
const ncm = config.ncm.apiBaseUrl
  ? new NeteaseNcmService(config.ncm.apiBaseUrl, ncmCookie || undefined, ncmUid || undefined)
  : new MockNcmService();
const claudeApiKey = getSetting("claude_api_key") ?? config.claude.apiKey;
const claude = claudeApiKey
  ? (() => {
      const systemPrompt = readFileSync(join(__dirname, "prompts/plan-system.md"), "utf-8");
      return new ClaudeApiService(
        { apiKey: claudeApiKey, baseUrl: config.claude.baseUrl, model: config.claude.model },
        systemPrompt
      );
    })()
  : new MockClaudeService();
const fishApiKey = getSetting("fish_audio_api_key") ?? config.fishAudio.apiKey;
const tts = fishApiKey
  ? new FishTtsService({ apiKey: fishApiKey, voiceId: config.fishAudio.voiceId })
  : new MockTtsService();
const weatherApiKey = getSetting("openweather_api_key") ?? config.openWeather.apiKey;
const weather = weatherApiKey
  ? new OpenWeatherService({ apiKey: weatherApiKey, city: config.openWeather.city })
  : new WttrInService({ city: config.openWeather.city });

const feishuAppId = getSetting("feishu_app_id") ?? config.feishu.appId;
const feishuAppSecret = getSetting("feishu_app_secret") ?? config.feishu.appSecret;
const calendar = feishuAppId && feishuAppSecret
  ? new FeishuCalendarService({ appId: feishuAppId, appSecret: feishuAppSecret })
  : new MockCalendarService();

const upnp = new MockUpnpService();
const context = new ContextService(weather, calendar);
const playlist = new PlaylistService();

// 调度器需要 claude 和 context，所以在它们之后创建
const scheduler = claudeApiKey
  ? new CronSchedulerService({ claude, context })
  : new MockSchedulerService();

app.decorate("services", { ncm, claude, tts, weather, calendar, upnp, scheduler, context, playlist });

app.get("/api/health", async () => ({
  status: "ok",
  timestamp: new Date().toISOString(),
  services: {
    ncm: config.ncm.apiBaseUrl ? "connected" : "mock",
    claude: claudeApiKey ? "connected" : "mock",
    tts: fishApiKey ? "connected" : "mock",
    weather: weatherApiKey ? "connected" : "wttr.in",
    calendar: feishuAppId ? "connected" : "mock",
  },
}));

await app.register(nowRoutes);
await app.register(planRoutes);
await app.register(playerRoutes);
await app.register(settingsRoutes);
await app.register(profileRoutes);
await app.register(intentRoutes);
await app.register(streamRoutes);
await app.register(mediaRoutes);
await app.register(audioRoutes);
await app.register(playlistRoutes);
await app.register(ncmPlaylistRoutes);
await app.register(lyricRoutes);
await app.register(coverRoutes);
await app.register(searchRoutes);
await app.register(queueRoutes);
await app.register(chatRoutes);

// Serve frontend static files (SPA fallback)
const webDist = join(__dirname, "../../web/dist");
if (existsSync(webDist)) {
  await app.register(fastifyStatic, {
    root: webDist,
    prefix: "/",
    decorateReply: false,
  });
  // SPA fallback: any non-API GET that doesn't match a static file returns index.html
  app.setNotFoundHandler((req, reply) => {
    if (req.method === "GET" && !req.url.startsWith("/api/") && !req.url.startsWith("/ws/")) {
      return reply.type("text/html").sendFile("index.html");
    }
    reply.status(404).send({ message: "Route " + req.method + ":" + req.url + " not found", error: "Not Found", statusCode: 404 });
  });
  console.log(`[server] serving frontend from ${webDist}`);
}

async function start() {
  try {
    await app.listen({ port: config.port, host: "0.0.0.0" });
    console.log(`[server] listening on http://localhost:${config.port}`);
    scheduler.start();
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

process.on("SIGINT", () => {
  scheduler.stop();
  closeDb();
  app.close().then(() => process.exit(0));
});

start();
