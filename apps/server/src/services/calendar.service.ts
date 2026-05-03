export interface CalendarEvent {
  title: string;
  startTime: string;
  endTime: string;
}

export interface CalendarService {
  getTodayEvents(): Promise<CalendarEvent[]>;
}

export class MockCalendarService implements CalendarService {
  async getTodayEvents(): Promise<CalendarEvent[]> {
    return [{ title: "工作", startTime: "09:00", endTime: "18:00" }];
  }
}

export class FeishuCalendarService implements CalendarService {
  private appId: string;
  private appSecret: string;
  private tokenCache: { token: string; expiresAt: number } | null = null;

  constructor(config: { appId: string; appSecret: string }) {
    this.appId = config.appId;
    this.appSecret = config.appSecret;
  }

  private async getToken(): Promise<string> {
    if (this.tokenCache && Date.now() < this.tokenCache.expiresAt) {
      return this.tokenCache.token;
    }

    const res = await fetch("https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ app_id: this.appId, app_secret: this.appSecret }),
    });

    if (!res.ok) {
      throw new Error(`Feishu auth failed: ${res.status}`);
    }

    const data = (await res.json()) as { tenant_access_token?: string; expire?: number };
    const token = data.tenant_access_token ?? "";
    const expire = data.expire ?? 7200;

    this.tokenCache = {
      token,
      expiresAt: Date.now() + (expire - 300) * 1000,
    };

    return token;
  }

  async getTodayEvents(): Promise<CalendarEvent[]> {
    try {
      const token = await this.getToken();
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDay = new Date(startOfDay.getTime() + 86400000);

      const url = `https://open.feishu.cn/open-apis/calendar/v4/calendars/primary/events?start_time=${Math.floor(startOfDay.getTime() / 1000)}&end_time=${Math.floor(endOfDay.getTime() / 1000)}`;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!res.ok) {
        throw new Error(`Feishu calendar API ${res.status}`);
      }

      const data = (await res.json()) as {
        data?: { items?: Array<{ summary?: string; start?: { timestamp?: string }; end?: { timestamp?: string } }> };
      };

      const events = data.data?.items ?? [];
      return events.map((e) => {
        const startTs = e.start?.timestamp ? Number(e.start.timestamp) * 1000 : 0;
        const endTs = e.end?.timestamp ? Number(e.end.timestamp) * 1000 : 0;
        const startDate = new Date(startTs);
        const endDate = new Date(endTs);
        return {
          title: e.summary ?? "未命名事件",
          startTime: `${String(startDate.getHours()).padStart(2, "0")}:${String(startDate.getMinutes()).padStart(2, "0")}`,
          endTime: `${String(endDate.getHours()).padStart(2, "0")}:${String(endDate.getMinutes()).padStart(2, "0")}`,
        };
      });
    } catch (err) {
      console.error("[calendar] Feishu failed:", err);
      return [];
    }
  }
}
