import { useMemo } from "react";
import { usePlayerStore } from "../stores/playerStore";
import { useI18n } from "../i18n/context";

interface Props {
  barCount?: number;
}

export default function WaveformBar({ barCount = 60 }: Props) {
  const { isPlaying, progressMs, durationMs, togglePlay } = usePlayerStore();
  const { t } = useI18n();

  const progress = durationMs > 0 ? progressMs / durationMs : 0;

  const bars = useMemo(
    () =>
      Array.from({ length: barCount }, (_, i) => {
        const center = barCount / 2;
        const dist = Math.abs(i - center) / center;
        const base = 4 + (1 - dist) * 20;
        const jitter = Math.random() * 8;
        return base + jitter;
      }),
    [barCount]
  );

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="waveform-section">
      <span className="waveform-time">{formatTime(progressMs)}</span>
      <div className="waveform">
        {bars.map((height, i) => {
          const barProgress = i / barCount;
          const isPlayed = barProgress <= progress;
          const isActive = isPlaying && Math.abs(barProgress - progress) < 0.02;
          return (
            <div
              key={i}
              className={`waveform-bar ${isPlayed ? "played" : ""} ${isActive ? "active" : ""}`}
              style={{ height: `${height}px` }}
            />
          );
        })}
      </div>
      <button
        className="waveform-play-btn"
        onClick={togglePlay}
        title={isPlaying ? t("idle") : t("onAir")}
      >
        {isPlaying ? "⏸" : "▶"}
      </button>
    </div>
  );
}
