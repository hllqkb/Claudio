import { create } from "zustand";
import type { QueueItem } from "../api/client";
import { api } from "../api/client";
import { audioPlayer } from "../audio/AudioPlayer";
import { wsClient } from "../api/ws";

interface PlayerState {
  nowPlaying: QueueItem | null;
  queue: QueueItem[];
  isPlaying: boolean;
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
}

export const usePlayerStore = create<PlayerState>((set, get) => {
  audioPlayer.onPlay(() => set({ isPlaying: true }));
  audioPlayer.onPause(() => set({ isPlaying: false }));
  audioPlayer.onTimeUpdate((current, duration) => {
    set({ progressMs: current, durationMs: duration });
  });
  audioPlayer.onEnded(() => {
    get().next();
  });

  wsClient.on("now_changed", (payload) => {
    const data = payload as { nowPlaying: QueueItem | null; queue: QueueItem[]; scene: string; djStatus: string };
    set({
      nowPlaying: data.nowPlaying,
      queue: data.queue,
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
    isPlaying: false,
    progressMs: 0,
    durationMs: 0,
    scene: null,
    djStatus: "idle",

    fetchNow: async () => {
      try {
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
      }
      set({ nowPlaying: item, progressMs: 0 });
      api.playerPlay();
    },

    togglePlay: () => {
      const { isPlaying, nowPlaying } = get();
      if (isPlaying) {
        audioPlayer.pause();
        api.playerPause();
      } else {
        if (nowPlaying?.audioUrl) {
          audioPlayer.play();
        }
        api.playerPlay();
      }
    },

    next: () => {
      const { queue, nowPlaying } = get();
      const idx = queue.findIndex((item) => item.id === nowPlaying?.id);
      const nextItem = queue[idx + 1] ?? queue[0] ?? null;
      if (nextItem) {
        get().playItem(nextItem);
      }
      api.playerNext();
    },

    previous: () => {
      const { queue, nowPlaying } = get();
      const idx = queue.findIndex((item) => item.id === nowPlaying?.id);
      const prevItem = queue[idx - 1] ?? queue[queue.length - 1] ?? null;
      if (prevItem) {
        get().playItem(prevItem);
      }
      api.playerPrevious();
    },

    setProgress: (ms: number) => {
      audioPlayer.seek(ms);
      set({ progressMs: ms });
    },
  };
});
