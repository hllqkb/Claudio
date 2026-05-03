type Listener = () => void;
type TimeListener = (current: number, duration: number) => void;

class AudioPlayerManager {
  private audio: HTMLAudioElement;
  private onPlayListeners: Listener[] = [];
  private onPauseListeners: Listener[] = [];
  private onEndedListeners: Listener[] = [];
  private onTimeListeners: TimeListener[] = [];

  constructor() {
    this.audio = new Audio();
    this.audio.addEventListener("play", () => this.onPlayListeners.forEach((fn) => fn()));
    this.audio.addEventListener("pause", () => this.onPauseListeners.forEach((fn) => fn()));
    this.audio.addEventListener("ended", () => this.onEndedListeners.forEach((fn) => fn()));
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
      await this.audio.play();
    } catch (err) {
      console.error("Audio play failed:", err);
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

  get currentTimeMs() {
    return this.audio.currentTime * 1000;
  }

  get durationMs() {
    return (this.audio.duration || 0) * 1000;
  }

  onPlay(fn: Listener) { this.onPlayListeners.push(fn); }
  onPause(fn: Listener) { this.onPauseListeners.push(fn); }
  onEnded(fn: Listener) { this.onEndedListeners.push(fn); }
  onTimeUpdate(fn: TimeListener) { this.onTimeListeners.push(fn); }
}

export const audioPlayer = new AudioPlayerManager();
