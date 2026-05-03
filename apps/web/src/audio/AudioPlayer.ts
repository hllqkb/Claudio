type Listener = () => void;
type TimeListener = (current: number, duration: number) => void;

class AudioPlayerManager {
  private audio: HTMLAudioElement;
  private onPlayListeners: Listener[] = [];
  private onPauseListeners: Listener[] = [];
  private onEndedListeners: Listener[] = [];
  private onErrorListeners: Listener[] = [];
  private onTimeListeners: TimeListener[] = [];
  private pendingPlay = false;

  constructor() {
    this.audio = new Audio();
    this.audio.crossOrigin = "anonymous";
    this.audio.preload = "auto";
    this.audio.addEventListener("play", () => {
      this.pendingPlay = false;
      this.onPlayListeners.forEach((fn) => fn());
    });
    this.audio.addEventListener("pause", () => this.onPauseListeners.forEach((fn) => fn()));
    this.audio.addEventListener("ended", () => this.onEndedListeners.forEach((fn) => fn()));
    this.audio.addEventListener("error", () => {
      console.warn("[audio] Error event:", this.audio.error);
      this.onErrorListeners.forEach((fn) => fn());
    });
    this.audio.addEventListener("timeupdate", () => {
      this.onTimeListeners.forEach((fn) => fn(this.audio.currentTime * 1000, this.audio.duration * 1000 || 0));
    });
  }

  load(url: string) {
    this.audio.src = url;
    this.audio.load();
  }

  async play() {
    try {
      this.pendingPlay = true;
      await this.audio.play();
    } catch (err) {
      console.warn("[audio] Play failed (autoplay blocked?):", err);
      this.pendingPlay = false;
    }
  }

  /** Retry play - called from user gesture context */
  retryPlay() {
    if (this.pendingPlay || this.audio.paused) {
      this.audio.play().catch((err) => {
        console.error("[audio] Retry play failed:", err);
      });
    }
  }

  pause() {
    this.audio.pause();
  }

  seek(ms: number) {
    this.audio.currentTime = ms / 1000;
  }

  setVolume(v: number) {
    this.audio.volume = Math.max(0, Math.min(1, v));
  }

  get isPlaying() {
    return !this.audio.paused;
  }

  get isPending() {
    return this.pendingPlay;
  }

  get audioElement() {
    return this.audio;
  }

  get currentTimeMs() {
    return this.audio.currentTime * 1000;
  }

  get durationMs() {
    return (this.audio.duration || 0) * 1000;
  }

  onPlay(fn: Listener) { this.onPlayListeners.push(fn); }
  onPause(fn: Listener) { this.onPauseListeners.push(fn); }
  onEnded(fn: Listener) { this.onEndedListeners.push(fn); }
  onError(fn: Listener) { this.onErrorListeners.push(fn); }
  onTimeUpdate(fn: TimeListener) { this.onTimeListeners.push(fn); }
}

export const audioPlayer = new AudioPlayerManager();
