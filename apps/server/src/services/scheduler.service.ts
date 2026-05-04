import cron, { type ScheduledTask } from "node-cron";
import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import type { ClaudeService } from "./claude.service.js";
import type { ContextService } from "./context.service.js";

export interface SchedulerService {
  start(): void;
  stop(): void;
}

export class MockSchedulerService implements SchedulerService {
  start(): void {
    console.log("[scheduler] mock scheduler started");
  }

  stop(): void {
    console.log("[scheduler] mock scheduler stopped");
  }
}

export class CronSchedulerService implements SchedulerService {
  private tasks: ScheduledTask[] = [];
  private claude: ClaudeService;
  private context: ContextService;

  constructor(deps: { claude: ClaudeService; context: ContextService }) {
    this.claude = deps.claude;
    this.context = deps.context;
  }

  start(): void {
    // 07:00 生成早间计划
    this.tasks.push(
      cron.schedule("0 7 * * *", async () => {
        console.log("[scheduler] generating morning plan...");
        try {
          const contextStr = await this.context.buildContext("生成早晨播放计划", "morning");
          const plan = await this.claude.generatePlan(
            { trigger: "scheduled", maxSongs: 8, withDj: true, scene: "morning" },
            contextStr
          );
          console.log(`[scheduler] morning plan generated: ${plan.summary}`);
        } catch (err) {
          console.error("[scheduler] morning plan failed:", err);
        }
      })
    );

    // 09:00 刷新天气和日程
    this.tasks.push(
      cron.schedule("0 9 * * *", async () => {
        console.log("[scheduler] refreshing weather and calendar...");
        try {
          await this.context.buildContext();
          console.log("[scheduler] context refreshed");
        } catch (err) {
          console.error("[scheduler] context refresh failed:", err);
        }
      })
    );

    // 每小时检查缓存大小
    const CACHE_THRESHOLD_MB = 500;
    this.tasks.push(
      cron.schedule("0 * * * *", async () => {
        console.log("[scheduler] checking cache size...");
        try {
          const cacheDir = join(process.cwd(), "cache");
          let totalBytes = 0;
          const entries = await readdir(cacheDir, { withFileTypes: true });
          for (const entry of entries) {
            if (entry.isFile()) {
              const s = await stat(join(cacheDir, entry.name));
              totalBytes += s.size;
            } else if (entry.isDirectory()) {
              const subEntries = await readdir(join(cacheDir, entry.name));
              for (const sub of subEntries) {
                const s = await stat(join(cacheDir, entry.name, sub));
                if (s.isFile()) totalBytes += s.size;
              }
            }
          }
          const sizeMB = Math.round(totalBytes / 1024 / 1024);
          if (sizeMB > CACHE_THRESHOLD_MB) {
            console.warn(`[scheduler] cache size ${sizeMB}MB exceeds threshold ${CACHE_THRESHOLD_MB}MB`);
          } else {
            console.log(`[scheduler] cache size: ${sizeMB}MB`);
          }
        } catch (err) {
          console.error("[scheduler] cache check failed:", err);
        }
      })
    );

    // 每天凌晨整理播放历史
    this.tasks.push(
      cron.schedule("0 0 * * *", () => {
        console.log("[scheduler] consolidating play history...");
      })
    );

    console.log("[scheduler] cron scheduler started with 4 jobs");
  }

  stop(): void {
    for (const task of this.tasks) {
      task.stop();
    }
    this.tasks = [];
    console.log("[scheduler] cron scheduler stopped");
  }
}
