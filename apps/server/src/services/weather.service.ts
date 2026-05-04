export interface WeatherData {
  temp: number;
  description: string;
  city: string;
}

export interface WeatherService {
  getCurrent(city?: string): Promise<WeatherData>;
}

export class MockWeatherService implements WeatherService {
  async getCurrent(city = "Beijing"): Promise<WeatherData> {
    return { temp: 22, description: "晴", city };
  }
}

export class WttrInService implements WeatherService {
  private defaultCity: string;

  constructor(config: { city: string }) {
    this.defaultCity = config.city;
  }

  async getCurrent(city?: string): Promise<WeatherData> {
    const targetCity = city ?? this.defaultCity;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);

      const url = `https://wttr.in/${encodeURIComponent(targetCity)}?format=j1`;
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { "Accept-Language": "zh-CN" },
      });
      clearTimeout(timer);

      if (!res.ok) {
        throw new Error(`wttr.in API ${res.status}: ${res.statusText}`);
      }

      const data = (await res.json()) as {
        current_condition?: Array<{ temp_C?: string; weatherDesc?: Array<{ value?: string }> }>;
        nearest_area?: Array<{ areaName?: Array<{ value?: string }> }>;
      };

      const current = data.current_condition?.[0];
      return {
        temp: Math.round(Number(current?.temp_C ?? "0")),
        description: current?.weatherDesc?.[0]?.value ?? "未知",
        city: data.nearest_area?.[0]?.areaName?.[0]?.value ?? targetCity,
      };
    } catch (err) {
      console.error("[weather] wttr.in failed:", err);
      return { temp: 0, description: "获取失败", city: targetCity };
    }
  }
}

export class OpenWeatherService implements WeatherService {
  private apiKey: string;
  private defaultCity: string;

  constructor(config: { apiKey: string; city: string }) {
    this.apiKey = config.apiKey;
    this.defaultCity = config.city;
  }

  async getCurrent(city?: string): Promise<WeatherData> {
    const targetCity = city ?? this.defaultCity;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);

      const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(targetCity)}&appid=${this.apiKey}&units=metric&lang=zh_cn`;
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);

      if (!res.ok) {
        throw new Error(`OpenWeather API ${res.status}: ${res.statusText}`);
      }

      const data = (await res.json()) as {
        main?: { temp?: number };
        weather?: Array<{ description?: string }>;
        name?: string;
      };

      return {
        temp: Math.round(data.main?.temp ?? 0),
        description: data.weather?.[0]?.description ?? "未知",
        city: data.name ?? targetCity,
      };
    } catch (err) {
      console.error("[weather] OpenWeather failed:", err);
      return { temp: 0, description: "获取失败", city: targetCity };
    }
  }
}
