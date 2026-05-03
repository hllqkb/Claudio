import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { usePlayerStore } from "../stores/playerStore";
import { useI18n } from "../i18n/context";
import AudioSpectrum from "../components/AudioSpectrum";
import KaraokeLyrics from "../components/KaraokeLyrics";
import WaveformBar from "../components/WaveformBar";
import IntentInput from "../components/IntentInput";
import ChatArea from "../components/ChatArea";
import QueueList from "../components/QueueList";
import AudioVisualizer from "../components/AudioVisualizer";
import SearchPanel from "../components/SearchPanel";
import { api } from "../api/client";
import { wsClient } from "../api/ws";

const VISUAL_MODES = [
  { name: "Glob", key: "Glob" },
  { name: "Flower", key: "Flower" },
  { name: "Arcs", key: "Arcs" },
  { name: "Circles", key: "Circles" },
  { name: "Wave", key: "Wave" },
  { name: "Shine", key: "Shine" },
] as const;

type ModeKey = (typeof VISUAL_MODES)[number]["key"];

export default function PlayerPage() {
  const {
    nowPlaying, queue, scene, djStatus, isPlaying, needsUserAction, progressMs, durationMs,
    fetchNow, playItem, userActionPlay,
    shuffle, repeatMode, toggleShuffle, cycleRepeat,
    lastError, clearError,
  } = usePlayerStore();
  const { t } = useI18n();

  const [visualMode, setVisualMode] = useState<ModeKey>("Glob");
  const [showExtras, setShowExtras] = useState(false);

  const [showSearch, setShowSearch] = useState(false);

  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [playlistName, setPlaylistName] = useState("");
  const [playlistDesc, setPlaylistDesc] = useState("");
  const [saving, setSaving] = useState(false);

  const [dragging, setDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState(0);
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNow();
    wsClient.connect();
    return () => wsClient.disconnect();
  }, [fetchNow]);

  const statusText =
    djStatus === "idle" ? t("idle")
    : djStatus === "thinking" ? t("thinking")
    : djStatus === "speaking" ? t("speaking")
    : djStatus;

  const broadcastTime = useMemo(() => {
    const s = Math.floor(progressMs / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }, [progressMs]);

  const getSeekMs = useCallback((clientX: number) => {
    const el = progressRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return ratio * usePlayerStore.getState().durationMs;
  }, []);

  const handleProgressMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);
    setDragProgress(getSeekMs(e.clientX));
  }, [getSeekMs]);

  useEffect(() => {
    if (!dragging) return;
    const handleMouseMove = (e: MouseEvent) => setDragProgress(getSeekMs(e.clientX));
    const handleMouseUp = (e: MouseEvent) => {
      usePlayerStore.getState().setProgress(getSeekMs(e.clientX));
      setDragging(false);
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging, getSeekMs]);

  const displayProgressMs = dragging ? dragProgress : progressMs;

  const handleSavePlaylist = async () => {
    if (!playlistName.trim()) return;
    setSaving(true);
    try {
      const items = queue
        .filter((item) => item.type === "song")
        .map(({ id, type, songId, title, artist, coverUrl, audioUrl, text, reason }) => ({
          id, type, songId, title, artist, coverUrl, audioUrl, text, reason,
        }));
      await api.createPlaylist({ name: playlistName.trim(), description: playlistDesc.trim() || undefined, items });
      setShowSaveDialog(false);
      setPlaylistName("");
      setPlaylistDesc("");
    } catch (err) {
      console.error("Failed to save playlist:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="main-inner">
      {/* Music-reactive background */}
      <AudioVisualizer mode={visualMode} />

      {/* Player Card - Always Visible */}
      <div className="player-card">
        <div className="player-upper">
          <div
            style={{
              position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none",
            }}
          >
            <div
              style={{
                position: "absolute", width: "120%", height: "120%", left: "-10%", top: "-10%",
                background: `radial-gradient(ellipse at 30% 40%, rgba(94,232,197,0.06) 0%, transparent 50%),
                             radial-gradient(ellipse at 70% 60%, rgba(100,100,220,0.04) 0%, transparent 50%)`,
                filter: "blur(40px)",
              }}
            />
          </div>

          <div className="dj-header">
            <div className="dj-avatar"><span style={{ fontSize: 18 }}>🎧</span></div>
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

        <div className="player-lower">
          <div className="song-title">{nowPlaying?.title ?? t("notPlaying")}</div>
          <div className="song-artist">{nowPlaying?.artist ?? (scene ? `${scene}` : "")}</div>

          {needsUserAction && (
            <button className="autoplay-banner" onClick={userActionPlay}>
              ▶ Tap to Play
            </button>
          )}

          <div className="progress-row">
            <span className="progress-time">{formatTime(displayProgressMs)}</span>
            <div
              ref={progressRef}
              className={`progress-track ${dragging ? "dragging" : ""}`}
              onMouseDown={handleProgressMouseDown}
            >
              <div
                className="progress-fill"
                style={{ width: durationMs > 0 ? `${(displayProgressMs / durationMs) * 100}%` : "0%" }}
              />
            </div>
            <span className="progress-time right">{formatTime(durationMs)}</span>
          </div>

          {lastError && (
            <div className="error-banner" onClick={clearError}>
              <span className="error-banner-text">{lastError}</span>
              <span className="error-banner-dismiss">✕</span>
            </div>
          )}

          <div className="controls-row">
            <button
              className={`ctrl-btn ${shuffle ? "active-mode" : ""}`}
              onClick={toggleShuffle}
              title={`Shuffle: ${shuffle ? "On" : "Off"}`}
            >
              🔀
            </button>
            <button className="ctrl-btn" onClick={() => usePlayerStore.getState().previous()}>⏮</button>
            <button className="ctrl-btn play-btn" onClick={() => usePlayerStore.getState().togglePlay()}>
              {isPlaying ? "⏸" : "▶"}
            </button>
            <button className="ctrl-btn" onClick={() => usePlayerStore.getState().next()}>⏭</button>
            <button
              className={`ctrl-btn ${repeatMode !== "off" ? "active-mode" : ""}`}
              onClick={cycleRepeat}
              title={`Repeat: ${repeatMode}`}
            >
              {repeatMode === "one" ? "🔂" : "🔁"}
            </button>
          </div>

          <KaraokeLyrics songId={nowPlaying?.songId} currentTimeMs={progressMs} />
        </div>

        <WaveformBar barCount={60} />
      </div>

      {/* Chat / AI Conversation */}
      <div className="chat-section">
        <ChatArea />
        <IntentInput />
      </div>

      {/* Search Panel */}
      <div className="search-toggle">
        <button className="extras-btn" onClick={() => setShowSearch(!showSearch)}>
          {showSearch ? "▲ Hide Search" : "🔍 Search Songs"}
        </button>
      </div>

      {showSearch && (
        <SearchPanel onSelectSong={(item) => {
          usePlayerStore.getState().playItem(item);
          setShowSearch(false);
        }} />
      )}

      {/* Extras Toggle: Theme + Queue */}
      <div className="extras-toggle">
        <button className="extras-btn" onClick={() => setShowExtras(!showExtras)}>
          {showExtras ? "▲ Hide" : "▼ Theme & Queue"}
        </button>
      </div>

      {showExtras && (
        <div className="extras-panel">
          {/* Theme Switcher */}
          <div className="theme-section">
            <div className="section-label">VISUAL MODE</div>
            <div className="theme-grid">
              {VISUAL_MODES.map((m) => (
                <button
                  key={m.key}
                  className={`theme-btn ${visualMode === m.key ? "active" : ""}`}
                  onClick={() => setVisualMode(m.key)}
                >
                  {m.name}
                </button>
              ))}
            </div>
          </div>

          {/* Queue */}
          {queue.length > 0 && (
            <div className="queue-section">
              <div className="queue-header">
                <div className="section-label">{t("queueTitle")} ({queue.length})</div>
                <button className="btn-save-playlist" onClick={() => setShowSaveDialog(true)}>
                  {t("saveAsPlaylist")}
                </button>
              </div>
              <QueueList items={queue} onItemClick={playItem} />
            </div>
          )}
        </div>
      )}

      {/* Save Playlist Dialog */}
      {showSaveDialog && (
        <div className="dialog-overlay" onClick={() => setShowSaveDialog(false)}>
          <div className="dialog-box" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-title">{t("saveAsPlaylist")}</div>
            <input className="dialog-input" placeholder={t("playlistName")} value={playlistName} onChange={(e) => setPlaylistName(e.target.value)} autoFocus />
            <input className="dialog-input" placeholder={t("playlistDesc")} value={playlistDesc} onChange={(e) => setPlaylistDesc(e.target.value)} />
            <div className="dialog-actions">
              <button className="dialog-btn cancel" onClick={() => setShowSaveDialog(false)}>{t("cancel")}</button>
              <button className="dialog-btn confirm" onClick={handleSavePlaylist} disabled={!playlistName.trim() || saving}>
                {saving ? t("sending") : t("savePlaylist")}
              </button>
            </div>
          </div>
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
