import type { NcmService } from "./services/ncm.service.js";
import type { ClaudeService } from "./services/claude.service.js";
import type { TtsService } from "./services/tts.service.js";
import type { WeatherService } from "./services/weather.service.js";
import type { CalendarService } from "./services/calendar.service.js";
import type { UpnpService } from "./services/upnp.service.js";
import type { SchedulerService } from "./services/scheduler.service.js";
import type { ContextService } from "./services/context.service.js";

declare module "fastify" {
  interface FastifyInstance {
    services: {
      ncm: NcmService;
      claude: ClaudeService;
      tts: TtsService;
      weather: WeatherService;
      calendar: CalendarService;
      upnp: UpnpService;
      scheduler: SchedulerService;
      context: ContextService;
    };
  }
}
