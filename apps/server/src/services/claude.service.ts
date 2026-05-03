import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { writeFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const execFileAsync = promisify(execFile);

export interface PlanRequest {
  trigger: "manual" | "auto" | "scheduled";
  input?: string;
  maxSongs?: number;
  withDj?: boolean;
  scene?: string;
}

export interface PlanItem {
  type: "song" | "tts" | "silence";
  songId?: string;
  query?: string;
  text?: string;
  reason?: string;
  audioUrl?: string;
  durationMs?: number;
}

export interface PlanResponse {
  summary: string;
  scene: string;
  items: PlanItem[];
}

export interface ClaudeService {
  generatePlan(request: PlanRequest, context: string): Promise<PlanResponse>;
}

export class MockClaudeService implements ClaudeService {
  async generatePlan(request: PlanRequest, _context: string): Promise<PlanResponse> {
    const songs = [
      { query: "轻音乐", reason: "适合当前放松场景" },
      { query: "钢琴曲", reason: "延续安静氛围" },
      { query: "爵士乐", reason: "增添一点情调" },
    ];

    const items: PlanItem[] = [];

    if (request.withDj) {
      items.push({
        type: "tts",
        text: "欢迎收听 AI 电台，接下来为你准备了几首好听的歌。",
        audioUrl: "",
      });
    }

    for (const song of songs.slice(0, request.maxSongs ?? 5)) {
      items.push({
        type: "song",
        query: song.query,
        reason: song.reason,
      });
    }

    return {
      summary: "已为你生成播放计划",
      scene: request.scene ?? "default",
      items,
    };
  }
}

interface ClaudeRawResponse {
  summary: string;
  scene: string;
  djLines?: Array<{ position: string; text: string }>;
  songs?: Array<{ query?: string; songId?: string; reason: string }>;
}

export class ClaudeApiService implements ClaudeService {
  private apiKey: string;
  private baseUrl: string;
  private model: string;
  private systemPrompt: string;

  constructor(config: { apiKey: string; baseUrl: string; model: string }, systemPrompt: string) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl;
    this.model = config.model;
    this.systemPrompt = systemPrompt;
  }

  async generatePlan(request: PlanRequest, context: string): Promise<PlanResponse> {
    const userMessage = this.buildUserMessage(request, context);

    let rawResponse: ClaudeRawResponse | null = null;

    // 尝试两次：第一次正常调用，第二次强制 JSON
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await this.callClaude(
          attempt === 0 ? userMessage : `${userMessage}\n\n请只返回 JSON，不要添加任何其他文字。`
        );
        console.log("[claude] Raw response:", response.substring(0, 200));
        rawResponse = this.extractJson(response);
        if (rawResponse) {
          console.log("[claude] Parsed JSON:", JSON.stringify(rawResponse).substring(0, 200));
          break;
        }
      } catch (err) {
        console.error("[claude] Attempt", attempt, "failed:", err);
        if (attempt === 1) break;
      }
    }

    if (!rawResponse) {
      return {
        summary: "AI 生成失败，使用默认计划",
        scene: request.scene ?? "default",
        items: this.fallbackItems(request),
      };
    }

    return this.transformResponse(rawResponse, request);
  }

  private buildUserMessage(request: PlanRequest, context: string): string {
    const parts = [context];
    if (request.input) parts.push(`用户输入：${request.input}`);
    if (request.scene) parts.push(`当前场景：${request.scene}`);
    parts.push(`需要歌曲数量：${request.maxSongs ?? 8}`);
    parts.push(`是否需要 DJ 串词：${request.withDj ? "是" : "否"}`);
    return parts.join("\n\n");
  }

  private async callClaude(userMessage: string): Promise<string> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const bodyStr = JSON.stringify({
          model: this.model,
          max_tokens: 4096,
          system: this.systemPrompt,
          messages: [{ role: "user", content: userMessage }],
        });

        // Write body to temp file to avoid ByteString encoding issues with Chinese chars
        const tmpFile = join(tmpdir(), `claude-body-${Date.now()}-${attempt}.json`);
        await writeFile(tmpFile, bodyStr, "utf-8");

        try {
          const url = `${this.baseUrl}/v1/messages`;
          console.log(`[claude] Attempt ${attempt + 1}: POST ${url}, key=${this.apiKey.substring(0, 8)}...`);
          const { stdout, stderr } = await execFileAsync("/usr/bin/curl", [
            "-s",
            "-X", "POST",
            url,
            "-H", "Content-Type: application/json",
            "-H", `x-api-key: ${this.apiKey}`,
            "-H", "anthropic-version: 2023-06-01",
            "-d", `@${tmpFile}`,
            "--connect-timeout", "10",
            "--max-time", "60",
          ], { timeout: 65000, encoding: "utf-8", env: { ...process.env } });

          if (stderr) {
            console.error("[claude] curl stderr:", stderr.substring(0, 500));
          }
          console.log("[claude] curl stdout length:", stdout.length, "preview:", stdout.substring(0, 200));

          const parsed = JSON.parse(stdout) as { content?: Array<{ type?: string; text?: string }> };
          const textContent = parsed?.content?.find((c) => c.type === "text" || !c.type);
          return textContent?.text ?? "";
        } finally {
          await unlink(tmpFile).catch(() => {});
        }
      } catch (err) {
        lastError = err as Error;
        console.error(`[claude] Attempt ${attempt + 1}/${maxRetries} failed:`, (err as Error).message);
        if (attempt < maxRetries - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }
    }

    throw lastError || new Error("Claude API failed after all retries");
  }

  private extractJson(text: string): ClaudeRawResponse | null {
    // 尝试直接解析
    try {
      return JSON.parse(text) as ClaudeRawResponse;
    } catch {}

    // 尝试从 markdown code block 中提取
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match?.[1]) {
      try {
        return JSON.parse(match[1].trim()) as ClaudeRawResponse;
      } catch {}
    }

    // 尝试找到第一个 { 和最后一个 }
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1)) as ClaudeRawResponse;
      } catch {}
    }

    return null;
  }

  private transformResponse(raw: ClaudeRawResponse, request: PlanRequest): PlanResponse {
    const items: PlanItem[] = [];

    if (request.withDj && raw.djLines) {
      for (const line of raw.djLines) {
        items.push({
          type: "tts",
          text: line.text,
        });
      }
    }

    if (raw.songs) {
      for (const song of raw.songs.slice(0, request.maxSongs ?? 8)) {
        items.push({
          type: "song",
          query: song.query,
          reason: song.reason,
        });
      }
    }

    return {
      summary: raw.summary ?? "已生成播放计划",
      scene: raw.scene ?? request.scene ?? "default",
      items,
    };
  }

  private fallbackItems(request: PlanRequest): PlanItem[] {
    const items: PlanItem[] = [];
    if (request.withDj) {
      items.push({ type: "tts", text: "欢迎收听 AI 电台" });
    }
    items.push({ type: "song", query: "轻音乐", reason: "默认推荐" });
    items.push({ type: "song", query: "钢琴曲", reason: "默认推荐" });
    return items;
  }
}
