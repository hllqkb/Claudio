import type { FastifyInstance } from "fastify";
import { broadcast } from "./stream.js";

let isPlaying = true;
let currentIndex = 0;

const mockQueue = [
  { id: "queue_1", type: "song", songId: "mock_1", title: "轻音乐 - 第一首", artist: "AI 电台", coverUrl: "", audioUrl: "", reason: "适合当前场景", status: "playing" },
  { id: "queue_2", type: "song", songId: "mock_2", title: "钢琴曲 - 第二首", artist: "AI 电台", coverUrl: "", audioUrl: "", reason: "延续安静氛围", status: "pending" },
  { id: "queue_3", type: "song", songId: "mock_3", title: "爵士乐 - 第三首", artist: "AI 电台", coverUrl: "", audioUrl: "", reason: "增添情调", status: "pending" },
];

function getCurrentState() {
  return {
    nowPlaying: mockQueue[currentIndex] ?? null,
    queue: mockQueue,
    scene: "default",
    djStatus: "idle" as const,
  };
}

export async function playerRoutes(app: FastifyInstance) {
  app.post("/api/player/play", async () => {
    isPlaying = true;
    if (mockQueue[currentIndex]) mockQueue[currentIndex].status = "playing";
    const state = getCurrentState();
    broadcast("now_changed", state);
    return { ok: true, isPlaying };
  });

  app.post("/api/player/pause", async () => {
    isPlaying = false;
    broadcast("now_changed", getCurrentState());
    return { ok: true, isPlaying };
  });

  app.post("/api/player/next", async () => {
    if (mockQueue[currentIndex]) mockQueue[currentIndex].status = "played";
    currentIndex = (currentIndex + 1) % mockQueue.length;
    if (mockQueue[currentIndex]) mockQueue[currentIndex].status = "playing";
    const state = getCurrentState();
    broadcast("now_changed", state);
    return { ok: true, message: "已切换到下一首" };
  });

  app.post("/api/player/previous", async () => {
    if (mockQueue[currentIndex]) mockQueue[currentIndex].status = "pending";
    currentIndex = (currentIndex - 1 + mockQueue.length) % mockQueue.length;
    if (mockQueue[currentIndex]) mockQueue[currentIndex].status = "playing";
    const state = getCurrentState();
    broadcast("now_changed", state);
    return { ok: true, message: "已切换到上一首" };
  });

  app.post("/api/player/seek", async (request) => {
    const { positionMs } = request.body as { positionMs: number };
    return { ok: true, positionMs };
  });
}
