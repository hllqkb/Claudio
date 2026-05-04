import { getDb } from "./db.js";

export interface ChatMessageRow {
  id: string;
  role: string;
  content: string;
  meta: string | null;
  created_at: string;
}

export function getRecentMessages(limit = 50): ChatMessageRow[] {
  return getDb()
    .prepare(
      "SELECT id, role, content, meta, created_at FROM messages ORDER BY created_at DESC LIMIT ?"
    )
    .all(limit) as ChatMessageRow[];
}

export function insertMessage(data: {
  id: string;
  role: string;
  content: string;
  meta?: string;
}): void {
  const now = new Date().toISOString();
  getDb()
    .prepare(
      "INSERT INTO messages (id, role, content, meta, created_at) VALUES (?, ?, ?, ?, ?)"
    )
    .run(data.id, data.role, data.content, data.meta ?? null, now);
}
