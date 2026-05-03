import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = join(__dirname, "../../cache/tts");

export interface TtsService {
  synthesize(text: string): Promise<string>;
}

export class MockTtsService implements TtsService {
  constructor() {
    mkdirSync(CACHE_DIR, { recursive: true });
  }

  async synthesize(text: string): Promise<string> {
    const hash = createHash("sha256").update(text).digest("hex").slice(0, 16);
    const filename = `${hash}.mp3`;
    const filepath = join(CACHE_DIR, filename);

    if (existsSync(filepath)) {
      return `/api/media/tts/${hash}`;
    }

    writeFileSync(filepath, Buffer.alloc(0));
    return `/api/media/tts/${hash}`;
  }
}

export class FishTtsService implements TtsService {
  private apiKey: string;
  private voiceId: string;
  private cacheDir: string;

  constructor(config: { apiKey: string; voiceId: string }) {
    this.apiKey = config.apiKey;
    this.voiceId = config.voiceId;
    this.cacheDir = CACHE_DIR;
    mkdirSync(this.cacheDir, { recursive: true });
  }

  async synthesize(text: string): Promise<string> {
    if (text.length > 200) {
      text = text.slice(0, 200);
    }

    const hash = createHash("sha256").update(text).digest("hex").slice(0, 16);
    const filename = `${hash}.mp3`;
    const filepath = join(this.cacheDir, filename);

    if (existsSync(filepath) && readFileSync(filepath).length > 0) {
      return `/api/media/tts/${hash}`;
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10000);

      const body: Record<string, string> = { text };
      if (this.voiceId) body.reference_id = this.voiceId;

      const res = await fetch("https://api.fish.audio/v1/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!res.ok) {
        throw new Error(`Fish Audio API ${res.status}: ${res.statusText}`);
      }

      const buffer = Buffer.from(await res.arrayBuffer());
      writeFileSync(filepath, buffer);
      return `/api/media/tts/${hash}`;
    } catch (err) {
      console.error("[tts] Fish Audio failed:", err);
      return "";
    }
  }
}
