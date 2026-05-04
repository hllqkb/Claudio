import { usePlayerStore } from "../stores/playerStore";

export default function PlayerControls() {
  const {
    nowPlaying, isPlaying, togglePlay, next, previous,
    progressMs, durationMs, setProgress,
    volume, isMuted, setVolume, toggleMute,
  } = usePlayerStore();

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const volumeIcon = isMuted || volume === 0 ? "&#128263;" : volume < 0.5 ? "&#128265;" : "&#128266;";

  return (
    <div className="player-bar-inner">
      <div className="player-bar-left">
        <div className="player-bar-cover">
          {nowPlaying?.coverUrl ? (
            <img src={nowPlaying.coverUrl} alt={nowPlaying.title} />
          ) : (
            <div className="player-bar-cover-placeholder">&#9835;</div>
          )}
        </div>
        <div className="player-bar-info">
          <div className="player-bar-title">
            {nowPlaying?.title ?? nowPlaying?.text ?? "Not Playing"}
          </div>
          <div className="player-bar-artist">{nowPlaying?.artist ?? ""}</div>
        </div>
      </div>

      <div className="player-bar-center">
        <div className="player-bar-controls">
          <button className="ctrl-btn" onClick={previous} title="Previous">
            &#9198;
          </button>
          <button
            className="ctrl-btn play-btn"
            onClick={togglePlay}
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? "&#9646;&#9646;" : "&#9654;"}
          </button>
          <button className="ctrl-btn" onClick={next} title="Next">
            &#9197;
          </button>
        </div>
        <div className="player-bar-progress">
          <span className="progress-time">{formatTime(progressMs)}</span>
          <input
            type="range"
            className="progress-input"
            min={0}
            max={durationMs || 100}
            value={progressMs}
            onChange={(e) => setProgress(Number(e.target.value))}
          />
          <span className="progress-time">{formatTime(durationMs)}</span>
        </div>
      </div>

      <div className="player-bar-right">
        <button className="volume-btn" onClick={toggleMute} title={isMuted ? "Unmute" : "Mute"}>
          <span dangerouslySetInnerHTML={{ __html: volumeIcon }} />
        </button>
        <input
          type="range"
          className="volume-slider"
          min={0}
          max={1}
          step={0.01}
          value={isMuted ? 0 : volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
        />
      </div>
    </div>
  );
}
