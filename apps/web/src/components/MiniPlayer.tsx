import { usePlayerStore } from "../stores/playerStore";

interface Props {
  onExpand: () => void;
}

export default function MiniPlayer({ onExpand }: Props) {
  const nowPlaying = usePlayerStore((s) => s.nowPlaying);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const progressMs = usePlayerStore((s) => s.progressMs);
  const durationMs = usePlayerStore((s) => s.durationMs);
  const togglePlay = usePlayerStore((s) => s.togglePlay);

  const progressRatio = durationMs > 0 ? progressMs / durationMs : 0;

  return (
    <div className="mini-player" onClick={onExpand}>
      {/* Progress bar at top */}
      <div className="mini-progress">
        <div className="mini-progress-fill" style={{ width: `${progressRatio * 100}%` }} />
      </div>

      <div className="mini-content">
        {/* Cover */}
        <div className="mini-cover">
          {nowPlaying?.coverUrl ? (
            <img src={nowPlaying.coverUrl} alt="" />
          ) : (
            <div className="mini-cover-fallback">&#9835;</div>
          )}
        </div>

        {/* Info */}
        <div className="mini-info">
          <div className="mini-title">{nowPlaying?.title ?? "Not Playing"}</div>
          <div className="mini-artist">{nowPlaying?.artist ?? ""}</div>
        </div>

        {/* Controls */}
        <div className="mini-controls">
          <button
            className="mini-btn"
            onClick={(e) => {
              e.stopPropagation();
              togglePlay();
            }}
          >
            {isPlaying ? "⏸" : "▶"}
          </button>
        </div>
      </div>
    </div>
  );
}
