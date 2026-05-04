type EventHandler = (data: unknown) => void;

class WebSocketClient {
  private ws: WebSocket | null = null;
  private handlers = new Map<string, EventHandler[]>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  connect() {
    const protocol = location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${protocol}//${location.host}/ws/stream`;

    this.ws = new WebSocket(url);

    this.ws.onopen = () => console.log("[ws] connected");

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        const type = msg.type as string;
        const handlers = this.handlers.get(type) ?? [];
        handlers.forEach((fn) => fn(msg.payload));
      } catch (err) {
        console.error("[ws] parse error:", err);
      }
    };

    this.ws.onclose = () => {
      console.log("[ws] disconnected, reconnecting in 3s...");
      this.reconnectTimer = setTimeout(() => this.connect(), 3000);
    };

    this.ws.onerror = (err) => console.error("[ws] error:", err);
  }

  on(type: string, handler: EventHandler) {
    const list = this.handlers.get(type) ?? [];
    list.push(handler);
    this.handlers.set(type, list);
  }

  off(type: string, handler: EventHandler) {
    const list = this.handlers.get(type) ?? [];
    this.handlers.set(type, list.filter((fn) => fn !== handler));
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
  }
}

export const wsClient = new WebSocketClient();
