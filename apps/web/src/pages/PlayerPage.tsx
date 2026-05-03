import { useEffect, useMemo } from "react";
import { usePlayerStore } from "../stores/playerStore";
import { useI18n } from "../i18n/context";
import AudioSpectrum from "../components/AudioSpectrum";
import TranscriptPanel from "../components/TranscriptPanel";
import WaveformBar from "../components/WaveformBar";
import IntentInput from "../components/IntentInput";
import QueueList from "../components/QueueList";
import { wsClient } from "../api/ws";

export default function PlayerPage() {
  const { nowPlaying, queue, scene, djStatus, isPlaying, progressMs, durationMs, fetchNow, playItem } =
    usePlayerStore();
  const { t } = useI18n();

  useEffect(() => {
    fetchNow();
    wsClient.connect();
    return () => wsClient.disconnect();
  }, [fetchNow]);

  const statusText =
    djStatus === "idle"
      ? t("idle")
      : djStatus === "thinking"
        ? t("thinking")
        : djStatus === "speaking"
          ? t("speaking")
          : djStatus;

  const broadcastTime = useMemo(() => {
    const s = Math.floor(progressMs / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }, [progressMs]);

  return (
    <div className="main-inner">
      {/* Player Card */}
      <div className="player-card">
        {/* Upper: DJ Status Area */}
        <div className="player-upper">
          {/* Fluid gradient background */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              overflow: "hidden",
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                position: "absolute",
                width: "120%",
                height: "120%",
                left: "-10%",
                top: "-10%",
                background: `radial-gradient(ellipse at 30% 40%, rgba(94,232,197,0.06) 0%, transparent 50%),
                             radial-gradient(ellipse at 70% 60%, rgba(100,100,220,0.04) 0%, transparent 50%)`,
                filter: "blur(40px)",
              }}
            />
          </div>

          <div className="dj-header">
            <div className="dj-avatar">
              <span style={{ fontSize: 18 }}>🎧</span>
            </div>
            <div className="dj-info">
              <div className="dj-name">CLAUDIO</div>
              <div className={`dj-status ${djStatus}`}>
                <span className="dj-status-dot" />
                {statusText}
              </div>
            </div>
            <div className="dj-time">{broadcastTime}</div>
          </div>

          <AudioSpectrum active={isPlaying} barCount={40} />
        </div>

        {/* Lower: Song Info Area */}
        <div className="player-lower">
          <div className="song-title">
            {nowPlaying?.title ?? t("notPlaying")}
          </div>
          <div className="song-artist">
            {nowPlaying?.artist ?? (scene ? `${scene}` : "")}
          </div>

          {/* Progress */}
          <div className="progress-row">
            <span className="progress-time">
              {formatTime(progressMs)}
            </span>
            <div
              className="progress-track"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const ratio = (e.clientX - rect.left) / rect.width;
                const store = usePlayerStore.getState();
                store.setProgress(ratio * store.durationMs);
              }}
            >
              <div
                className="progress-fill"
                style={{
                  width: durationMs > 0 ? `${(progressMs / durationMs) * 100}%` : "0%",
                }}
              />
            </div>
            <span className="progress-time right">
              {formatTime(durationMs)}
            </span>
          </div>

          {/* Controls */}
          <div className="controls-row">
            <button className="ctrl-btn" onClick={() => usePlayerStore.getState().previous()} title="Previous">
              ⏮
            </button>
            <button
              className="ctrl-btn play-btn"
              onClick={() => usePlayerStore.getState().togglePlay()}
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? "⏸" : "▶"}
            </button>
            <button className="ctrl-btn" onClick={() => usePlayerStore.getState().next()} title="Next">
              ⏭
            </button>
          </div>

          {/* Transcript */}
          <TranscriptPanel />
        </div>

        {/* Waveform */}
        <WaveformBar barCount={60} />
      </div>

      {/* Intent Input */}
      <div className="intent-section" style={{ marginTop: 24 }}>
        <IntentInput />
      </div>

      {/* Queue */}
      {queue.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div className="section-label">
            {t("queueTitle")} ({queue.length})
          </div>
          <QueueList items={queue} onItemClick={playItem} />
        </div>
      )}
    </div>
  );
}

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}
