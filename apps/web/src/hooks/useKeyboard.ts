import { useEffect, useState } from "react";
import { usePlayerStore } from "../stores/playerStore";

interface ShortcutHint {
  text: string;
  ts: number;
}

let hintListeners: Array<() => void> = [];
let currentHint: ShortcutHint | null = null;
let hintTimer: ReturnType<typeof setTimeout> | null = null;

function notifyListeners() {
  hintListeners.forEach((fn) => fn());
}

function showHint(text: string) {
  currentHint = { text, ts: Date.now() };
  notifyListeners();
  if (hintTimer) clearTimeout(hintTimer);
  hintTimer = setTimeout(() => {
    currentHint = null;
    notifyListeners();
  }, 1000);
}

export function useShortcutHint(): ShortcutHint | null {
  const [hint, setHint] = useState<ShortcutHint | null>(currentHint);

  useEffect(() => {
    const listener = () => setHint(currentHint);
    hintListeners.push(listener);
    return () => {
      hintListeners = hintListeners.filter((l) => l !== listener);
    };
  }, []);

  return hint;
}

export function useKeyboard() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement).isContentEditable) {
        return;
      }

      const store = usePlayerStore.getState();

      switch (e.key) {
        case " ":
          e.preventDefault();
          store.togglePlay();
          showHint(store.isPlaying ? "⏸ Paused" : "▶ Playing");
          break;
        case "ArrowLeft":
          e.preventDefault();
          store.setProgress(Math.max(0, store.progressMs - 5000));
          showHint("⏪ -5s");
          break;
        case "ArrowRight":
          e.preventDefault();
          store.setProgress(Math.min(store.durationMs, store.progressMs + 5000));
          showHint("⏩ +5s");
          break;
        case "ArrowUp":
          e.preventDefault();
          store.setVolume(store.volume + 0.05);
          showHint(`🔊 ${Math.round(store.volume * 100)}%`);
          break;
        case "ArrowDown":
          e.preventDefault();
          store.setVolume(store.volume - 0.05);
          showHint(`🔉 ${Math.round(store.volume * 100)}%`);
          break;
        case "m":
        case "M":
          store.toggleMute();
          showHint(store.isMuted ? "🔇 Muted" : "🔊 Unmuted");
          break;
        case "n":
        case "N":
          store.next();
          showHint("⏭ Next");
          break;
        case "p":
        case "P":
          store.previous();
          showHint("⏮ Previous");
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}
