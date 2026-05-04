export interface AppConfig {
  port: number;
  databaseUrl: string;
  claude: {
    apiKey: string;
    baseUrl: string;
    model: string;
  };
  ncm: {
    apiBaseUrl: string;
    uid: string;
  };
  fishAudio: {
    apiKey: string;
    voiceId: string;
  };
  openWeather: {
    apiKey: string;
    city: string;
  };
  feishu: {
    appId: string;
    appSecret: string;
  };
}

function env(key: string, fallback = ""): string {
  return process.env[key] ?? fallback;
}

export function loadConfig(): AppConfig {
  return {
    port: Number(env("SERVER_PORT", "8080")),
    databaseUrl: env("DATABASE_URL", "file:./data/ai-radio.sqlite"),
    claude: {
      apiKey: env("CLAUDE_API_KEY"),
      baseUrl: env("CLAUDE_BASE_URL", "https://api.anthropic.com"),
      model: env("CLAUDE_MODEL", "claude-sonnet-4-20250514"),
    },
    ncm: {
      apiBaseUrl: env("NCM_API_BASE_URL", "http://localhost:3000"),
      uid: env("NCM_UID"),
    },
    fishAudio: {
      apiKey: env("FISH_AUDIO_API_KEY"),
      voiceId: env("FISH_AUDIO_VOICE_ID"),
    },
    openWeather: {
      apiKey: env("OPENWEATHER_API_KEY"),
      city: env("OPENWEATHER_CITY", "Jiangxi"),
    },
    feishu: {
      appId: env("FEISHU_APP_ID"),
      appSecret: env("FEISHU_APP_SECRET"),
    },
  };
}
