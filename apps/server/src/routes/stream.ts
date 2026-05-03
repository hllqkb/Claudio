import type { FastifyInstance } from "fastify";
import type { WebSocket } from "ws";

const clients = new Set<WebSocket>();

export function broadcast(type: string, payload: unknown) {
  const msg = JSON.stringify({ type, payload });
  for (const client of clients) {
    if (client.readyState === 1) {
      client.send(msg);
    }
  }
}

export async function streamRoutes(app: FastifyInstance) {
  app.get("/ws/stream", { websocket: true }, (socket) => {
    clients.add(socket);
    console.log(`[ws] client connected (total: ${clients.size})`);

    socket.on("message", (message: Buffer) => {
      console.log("[ws] received:", message.toString());
    });

    socket.on("close", () => {
      clients.delete(socket);
      console.log(`[ws] client disconnected (total: ${clients.size})`);
    });
  });
}
