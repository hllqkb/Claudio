import type { FastifyInstance } from "fastify";

const mockQueue = [
  {
    id: "queue_1",
    type: "song" as const,
    songId: "mock_1",
    title: "轻音乐 - 第一首",
    artist: "AI 电台",
    coverUrl: "",
    audioUrl: "",
    reason: "适合当前场景",
    status: "playing" as const,
  },
  {
    id: "queue_2",
    type: "song" as const,
    songId: "mock_2",
    title: "钢琴曲 - 第二首",
    artist: "AI 电台",
    coverUrl: "",
    audioUrl: "",
    reason: "延续安静氛围",
    status: "pending" as const,
  },
];

export async function nowRoutes(app: FastifyInstance) {
  app.get("/api/now", async () => {
    return {
      nowPlaying: mockQueue[0],
      queue: mockQueue,
      scene: "default",
      djStatus: "idle",
    };
  });
}
