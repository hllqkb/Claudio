import type { WeatherService } from "./weather.service.js";
import type { CalendarService } from "./calendar.service.js";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { getDb } from "../db/db.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

interface PlayRecord {
  item_id: string;
  item_type: string;
  action: string;
  scene: string | null;
  created_at: string;
}

export class ContextService {
  constructor(
    private weather: WeatherService,
    private calendar: CalendarService
  ) {}

  async buildContext(input?: string, scene?: string): Promise<string> {
    const now = new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" });
    const parts: string[] = [`当前时间：${now}（北京时间）`];

    if (scene) {
      parts.push(`当前场景：${scene}`);
    }

    try {
      const weather = await this.weather.getCurrent();
      parts.push(`天气：${weather.temp}°C ${weather.description}`);
    } catch {
      parts.push("天气：获取失败");
    }

    try {
      const events = await this.calendar.getTodayEvents();
      const summary = events.map((e) => `${e.startTime}-${e.endTime} ${e.title}`).join("；");
      parts.push(`今日日程：${summary || "无"}`);
    } catch {
      parts.push("今日日程：获取失败");
    }

    try {
      const db = getDb();
      const recentPlays = db
        .prepare("SELECT item_id, item_type, action, scene, created_at FROM plays ORDER BY created_at DESC LIMIT 10")
        .all() as PlayRecord[];
      if (recentPlays.length > 0) {
        const summary = recentPlays.map((p) => `${p.item_type}:${p.action}`).join("、");
        parts.push(`最近播放：${summary}`);
      }
    } catch {}

    try {
      const db = getDb();
      const skips = db
        .prepare("SELECT item_id FROM plays WHERE action = 'skipped' ORDER BY created_at DESC LIMIT 5")
        .all() as Array<{ item_id: string }>;
      if (skips.length > 0) {
        parts.push(`最近跳过：${skips.map((s) => s.item_id).join("、")}`);
      }
    } catch {}

    for (const file of ["taste.md", "routines.md", "mood-rules.md"]) {
      try {
        const content = readFileSync(join(__dirname, `../../../user/${file}`), "utf-8");
        parts.push(`${file}：\n${content}`);
      } catch {
        // file not found, skip
      }
    }

    if (input) {
      parts.push(`用户输入：${input}`);
    }

    return parts.join("\n\n");
  }
}
