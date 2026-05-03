import { create } from "zustand";
import type { QueueItem } from "../api/client";
import { api } from "../api/client";
import { audioPlayer } from "../audio/AudioPlayer";
import { wsClient } from "../api/ws";

export interface DjMessage {
  id: string;
  text: string;
  ts: number;
}

interface PlayerState {
  nowPlaying: QueueItem | null;
  queue: QueueItem[];
  djMessages: DjMessage[];
  isPlaying: boolean;
  needsUserAction: boolean;
  progressMs: number;
  durationMs: number;
  scene: string | null;
  djStatus: "idle" | "thinking" | "speaking" | "error";

  fetchNow: () => Promise<void>;
  togglePlay: () => void;
  next: () => void;
  previous: () => void;
  setProgress: (ms: number) => void;
  playItem: (item: QueueItem) => void;
  setQueue: (items: QueueItem[]) => void;
  enqueueItems: (items: QueueItem[]) => void;
  addDjMessage: (text: string) => void;
  clearDjMessages: () => void;
  userActionPlay: () => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => {
  let consecutiveErrors = 0;

  audioPlayer.onPlay(() => {
    consecutiveErrors = 0;
    set({ isPlaying: true, needsUserAction: false });
  });
  audioPlayer.onPause(() => set({ isPlaying: false }));
  audioPlayer.onTimeUpdate((current, duration) => {
    set({ progressMs: current, durationMs: duration });
  });
  audioPlayer.onEnded(() => {
    get().next();
  });
  audioPlayer.onError(() => {
    consecutiveErrors++;
    const { nowPlaying } = get();
    console.warn(`[player] Audio error for: ${nowPlaying?.title} (consecutive: ${consecutiveErrors})`);
    if (consecutiveErrors > 3) {
      console.error("[player] Too many consecutive errors, stopping auto-skip.");
      consecutiveErrors = 0;
      return;
    }
    get().next();
  });

  wsClient.on("now_changed", (payload) => {
    const data = payload as { nowPlaying: QueueItem | null; queue: QueueItem[]; scene: string; djStatus: string };
    // Only update scene/djStatus from server; don't overwrite client-managed queue
    // Server mock data has empty audioUrl which would break playback
    set({
      scene: data.scene,
      djStatus: data.djStatus as PlayerState["djStatus"],
    });
  });

  wsClient.on("queue_updated", (payload) => {
    set({ queue: payload as QueueItem[] });
  });

  return {
    nowPlaying: null,
    queue: [],
    djMessages: [],
    isPlaying: false,
    needsUserAction: false,
    progressMs: 0,
    durationMs: 0,
    scene: null,
    djStatus: "idle",

    fetchNow: async () => {
      try {
        // Don't overwrite state if user is already playing
        const { nowPlaying } = get();
        if (nowPlaying) return;

        const data = await api.getNow();
        set({
          nowPlaying: data.nowPlaying,
          queue: data.queue,
          scene: data.scene,
          djStatus: data.djStatus,
        });
        if (data.nowPlaying?.audioUrl) {
          audioPlayer.load(data.nowPlaying.audioUrl);
        }
      } catch (err) {
        console.error("Failed to fetch /api/now:", err);
      }
    },

    playItem: (item: QueueItem) => {
      if (item.audioUrl) {
        audioPlayer.load(item.audioUrl);
        audioPlayer.play();
        setTimeout(() => {
          if (audioPlayer.isPending && audioPlayer.audioElement.paused) {
            set({ needsUserAction: true });
          }
        }, 500);
      }
      set({ nowPlaying: item, progressMs: 0 });
      if (item.type === "song" && item.songId) {
        api.reportPlay({
          songId: item.songId,
          title: item.title,
          artist: item.artist,
          coverUrl: item.coverUrl,
        });
      }
    },

    togglePlay: () => {
      const { isPlaying, nowPlaying } = get();
      if (isPlaying) {
        audioPlayer.pause();
      } else {
        if (nowPlaying?.audioUrl) {
          audioPlayer.play();
        }
      }
    },

    next: () => {
      const { queue, nowPlaying } = get();
      const idx = queue.findIndex((item) => item.id === nowPlaying?.id);
      const nextItem = queue[idx + 1] ?? queue[0] ?? null;
      if (nextItem) {
        get().playItem(nextItem);
      }
    },

    previous: () => {
      const { queue, nowPlaying } = get();
      const idx = queue.findIndex((item) => item.id === nowPlaying?.id);
      const prevItem = queue[idx - 1] ?? queue[queue.length - 1] ?? null;
      if (prevItem) {
        get().playItem(prevItem);
      }
    },

    setProgress: (ms: number) => {
      audioPlayer.seek(ms);
      set({ progressMs: ms });
    },

    setQueue: (items: QueueItem[]) => {
      // Separate songs from TTS items
      const songs = items.filter((i) => i.type === "song");
      const ttsItems = items.filter((i) => i.type === "tts");
      const ttsTexts = ttsItems.filter((i) => i.text);

      // Add DJ messages for display
      if (ttsTexts.length > 0) {
        const msgs = ttsTexts.map((t) => ({
          id: t.id,
          text: t.text!,
          ts: Date.now(),
        }));
        set((s) => ({ djMessages: [...s.djMessages, ...msgs] }));
      }

      // Include TTS items with audioUrl in the queue (they play before songs)
      const playableTts = ttsItems.filter((i) => i.audioUrl);
      const queueItems = [...playableTts, ...songs];

      const first = queueItems[0] ?? null;
      set({ queue: queueItems, nowPlaying: first, progressMs: 0 });
      if (first?.audioUrl) {
        audioPlayer.load(first.audioUrl);
        audioPlayer.play();
        // If autoplay is blocked, show a prompt after a short delay
        setTimeout(() => {
          if (audioPlayer.isPending && audioPlayer.audioElement.paused) {
            set({ needsUserAction: true });
          }
        }, 500);
      }
    },

    enqueueItems: (items: QueueItem[]) => {
      const songs = items.filter((i) => i.type === "song");
      const ttsItems = items.filter((i) => i.type === "tts");
      const ttsTexts = ttsItems.filter((i) => i.text);

      if (ttsTexts.length > 0) {
        const msgs = ttsTexts.map((t) => ({
          id: t.id,
          text: t.text!,
          ts: Date.now(),
        }));
        set((s) => ({ djMessages: [...s.djMessages, ...msgs] }));
      }

      const playableTts = ttsItems.filter((i) => i.audioUrl);
      const newItems = [...playableTts, ...songs];

      const { queue, nowPlaying } = get();
      if (!nowPlaying && newItems.length > 0) {
        get().setQueue([...queue, ...newItems]);
      } else {
        set({ queue: [...queue, ...newItems] });
      }
    },

    addDjMessage: (text: string) => {
      set((s) => ({
        djMessages: [...s.djMessages, { id: `dj_${Date.now()}`, text, ts: Date.now() }],
      }));
    },

    clearDjMessages: () => set({ djMessages: [] }),

    userActionPlay: () => {
      audioPlayer.retryPlay();
      set({ needsUserAction: false });
    },
  };
});
