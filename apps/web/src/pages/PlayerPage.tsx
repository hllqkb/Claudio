import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { usePlayerStore } from "../stores/playerStore";
import { useToastStore } from "../stores/toastStore";
import { useI18n } from "../i18n/context";
import AudioSpectrum from "../components/AudioSpectrum";
import KaraokeLyrics from "../components/KaraokeLyrics";
import WaveformBar from "../components/WaveformBar";
import IntentInput from "../components/IntentInput";
import ChatArea from "../components/ChatArea";
import QueueList from "../components/QueueList";
import AudioVisualizer from "../components/AudioVisualizer";
import FluidBlobs from "../components/FluidBlobs";

import SpectrumBars from "../components/SpectrumBars";
import SearchPanel from "../components/SearchPanel";
import DjPanel from "../components/DjPanel";
import UserPanel from "../components/UserPanel";
import { PlayerSkeleton } from "../components/Skeleton";
import { api } from "../api/client";
import { extractColors } from "../utils/colorExtractor";
import { burstParticles } from "../components/ParticleCanvas";

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
    playItem, userActionPlay,
    shuffle, repeatMode, toggleShuffle, cycleRepeat,
    lastError, clearError,
    favoriteIds, toggleFavorite,
    volume, isMuted, setVolume, toggleMute,
  } = usePlayerStore();
  const { t } = useI18n();

  const [visualMode, setVisualMode] = useState<ModeKey>("Arcs");
  const [bass, setBass] = useState(0);
  const [mid, setMid] = useState(0);

  const [showLeftSidebar, setShowLeftSidebar] = useState(false);
  const [showRightSidebar, setShowRightSidebar] = useState(false);
  const [showDjPanel, setShowDjPanel] = useState(false);
  const [showUserPanel, setShowUserPanel] = useState(false);
  const coverGlowRef = useRef<HTMLDivElement>(null);

  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [playlistName, setPlaylistName] = useState("");
  const [playlistDesc, setPlaylistDesc] = useState("");
  const [saving, setSaving] = useState(false);

  const [dragging, setDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState(0);
  const progressRef = useRef<HTMLDivElement>(null);

  // Extract dynamic colors from album art
  useEffect(() => {
    if (nowPlaying?.coverUrl) {
      extractColors(nowPlaying.coverUrl);
    }
  }, [nowPlaying?.coverUrl]);

  // Particle burst on song change
  useEffect(() => {
    if (nowPlaying?.songId) {
      burstParticles(window.innerWidth / 2, window.innerHeight / 2);
    }
  }, [nowPlaying?.songId]);

  // Cover glow animation
  useEffect(() => {
    const glow = coverGlowRef.current;
    if (!glow) return;
    let frame = 0;
    const animate = () => {
      const t = performance.now();
      if (isPlaying) {
        const shadow = 40 + bass * 80;
        const spread = 10 + bass * 25;
        glow.style.opacity = String(0.3 + bass * 0.5);
        glow.style.boxShadow = `0 0 ${shadow}px ${spread}px var(--color-primary, #5ee8c5)`;
      } else {
        const idle = 0.3 + 0.05 * Math.sin(t * 0.001);
        glow.style.opacity = String(idle);
        glow.style.boxShadow = `0 0 30px 8px var(--color-primary, #5ee8c5)`;
      }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [isPlaying, bass]);

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
      useToastStore.getState().addToast("歌单已保存", "success");
    } catch (err) {
      console.error("Failed to save playlist:", err);
      useToastStore.getState().addToast("保存失败", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleFrequencyData = useCallback((b: number, m: number) => {
    setBass(b);
    setMid(m);
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty("--audio-bass", String(bass));
  }, [bass]);

  return (
    <div className="main-inner">
      {/* Music-reactive background */}
      <AudioVisualizer mode={visualMode} onFrequencyData={handleFrequencyData} />

      {/* Fluid blob background */}
      <FluidBlobs bass={bass} mid={mid} />

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
            <div style={{ position: "relative" }}>
              <div ref={coverGlowRef} className="cover-glow" />
              <div className="dj-avatar clickable" onClick={() => setShowDjPanel(true)}><span style={{ fontSize: 18 }}>🎧</span></div>
            </div>
            <div className="dj-info">
              <div className="dj-name">CLAUDIO</div>
              <div className={`dj-status ${djStatus}`}>
                <span className="dj-status-dot" />
                {statusText}
              </div>
            </div>
            <div className="dj-time">{broadcastTime}</div>
            <button className="user-avatar-btn" onClick={() => setShowUserPanel(true)} title="Your Library">U</button>
          </div>

          <AudioSpectrum active={isPlaying} barCount={40} />
        </div>

        {/* Center: Player content */}
        <div className="player-lower">
            <div className="player-content">
              {/* Left: Cover disc */}
              <div className="cover-section">
                {nowPlaying?.coverUrl && (
                  <div className={`cover-disc ${isPlaying ? "spinning" : "paused"}`}>
                    <div className="cover-disc-glow" />
                    <img className="cover-disc-img" src={nowPlaying.coverUrl} alt={nowPlaying.title ?? "cover"} />
                  </div>
                )}
              </div>

              {/* Right: Lyrics + song info */}
              <div className="lyrics-section">
                <div className="lyrics-header">
                  <div className="lyrics-title-row">
                    <div className="song-title">{nowPlaying?.title ?? t("notPlaying")}</div>
                    {nowPlaying?.songId && (
                      <button
                        className={`fav-btn ${favoriteIds.includes(nowPlaying.songId) ? "active" : ""}`}
                        onClick={() => toggleFavorite(nowPlaying.songId!, nowPlaying.title, nowPlaying.artist, nowPlaying.coverUrl)}
                      >
                        {favoriteIds.includes(nowPlaying.songId) ? "❤️" : "🤍"}
                      </button>
                    )}
                  </div>
                  <div className="song-artist">{nowPlaying?.artist ?? (scene ? `${scene}` : "")}</div>
                </div>
                <div className="lyrics-body">
                  <KaraokeLyrics songId={nowPlaying?.songId} currentTimeMs={progressMs} />
                </div>
              </div>
            </div>

            {needsUserAction && (
              <button className="autoplay-banner" onClick={() => userActionPlay()}>
                ▶ Tap to Play
              </button>
            )}

            {lastError && (
              <div className="error-banner" onClick={() => clearError()}>
                <span className="error-banner-text">{lastError}</span>
                <span className="error-banner-dismiss">✕</span>
              </div>
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

            <div className="controls-row">
              <button
                className={`ctrl-btn ${shuffle ? "active-mode" : ""}`}
                onClick={toggleShuffle}
                title={`Shuffle: ${shuffle ? "On" : "Off"}`}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>
              </button>
              <button className="ctrl-btn" onClick={() => usePlayerStore.getState().previous()}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
              </button>
              <button className="ctrl-btn play-btn" onClick={() => usePlayerStore.getState().togglePlay()}>
                {isPlaying
                  ? <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>
                  : <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                }
              </button>
              <button className="ctrl-btn" onClick={() => usePlayerStore.getState().next()}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
              </button>
              <button
                className={`ctrl-btn ${repeatMode !== "off" ? "active-mode" : ""}`}
                onClick={cycleRepeat}
                title={`Repeat: ${repeatMode}`}
              >
                {repeatMode === "one"
                  ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/><text x="12" y="14" textAnchor="middle" fontSize="8" fill="currentColor" stroke="none" fontWeight="700">1</text></svg>
                  : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
                }
              </button>
              <div className="player-bar-right">
                <button className="volume-btn" onClick={toggleMute} title={isMuted ? "Unmute" : "Mute"}>
                  {isMuted
                    ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
                    : volume < 0.5
                      ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                      : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                  }
                </button>
                <input
                  className="volume-slider"
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
                />
              </div>
            </div>
          </div>

        <WaveformBar barCount={60} bass={bass} />
      </div>

      {/* Sidebars — MUST be outside .player-card (backdrop-filter creates containing block) */}
      {/* Left Sidebar - AI Chat */}
      <div className={`sidebar-left ${showLeftSidebar ? "open" : ""}`}>
        <div className="sidebar-header">
          <span>🤖</span> AI 对话
          <button className="sidebar-close-btn" onClick={() => setShowLeftSidebar(false)}>✕</button>
        </div>
        <div className="sidebar-content">
          <ChatArea />
        </div>
        <IntentInput />
      </div>

      {/* Left toggle button */}
      {!showLeftSidebar && (
        <button
          className="sidebar-float-btn left"
          onClick={() => setShowLeftSidebar(true)}
          title="AI 对话"
        >
          🤖
        </button>
      )}

      {/* Right toggle button */}
      {!showRightSidebar && (
        <button
          className="sidebar-float-btn right"
          onClick={() => setShowRightSidebar(true)}
          title="歌曲选择"
        >
          🎵
        </button>
      )}

      {/* Right Sidebar - Song Selection */}
      <div className={`sidebar-right ${showRightSidebar ? "open" : ""}`}>
        <div className="sidebar-header">
          <span>🎵</span> 歌曲选择
          <button className="sidebar-close-btn" onClick={() => setShowRightSidebar(false)}>✕</button>
        </div>
        <div className="sidebar-content">
          {/* Visual Mode Selector */}
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

          {/* Search */}
          <SearchPanel onSelectSong={(item) => { playItem(item); }} />

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
      </div>

      {/* Bottom spectrum bars */}
      <SpectrumBars active={isPlaying} />

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

      {/* DJ Info Panel */}
      <DjPanel visible={showDjPanel} onClose={() => setShowDjPanel(false)} />

      {/* User Library Panel */}
      <UserPanel visible={showUserPanel} onClose={() => setShowUserPanel(false)} />
    </div>
  );
}

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}
