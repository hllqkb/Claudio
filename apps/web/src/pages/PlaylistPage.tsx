import { useEffect, useState, useCallback } from "react";
import { api, type NcmPlaylistSummary, type NcmTrack, type QueueItem, type Playlist, type FavoriteItem } from "../api/client";
import { usePlayerStore } from "../stores/playerStore";
import { useI18n } from "../i18n/context";
import type { TranslationKey } from "../i18n/translations";

type View = "list" | "detail";
type Tab = "favorites" | "local" | "ncm";

export default function PlaylistPage() {
  const [ncmPlaylists, setNcmPlaylists] = useState<NcmPlaylistSummary[]>([]);
  const [localPlaylists, setLocalPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("list");
  const [tab, setTab] = useState<Tab>("favorites");
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [favoritesLoading, setFavoritesLoading] = useState(true);
  const [selected, setSelected] = useState<NcmPlaylistSummary | null>(null);
  const [selectedLocal, setSelectedLocal] = useState<Playlist | null>(null);
  const [tracks, setTracks] = useState<NcmTrack[]>([]);
  const [tracksLoading, setTracksLoading] = useState(false);
  const { t } = useI18n();
  const playItem = usePlayerStore((s) => s.playItem);

  const fetchPlaylists = useCallback(async () => {
    try {
      const [ncmData, localData, favData] = await Promise.all([
        api.getNcmPlaylists().catch(() => ({ playlists: [] })),
        api.getPlaylists().catch(() => ({ playlists: [] })),
        api.getFavorites().catch(() => ({ favorites: [] })),
      ]);
      setNcmPlaylists(ncmData.playlists);
      setLocalPlaylists(localData.playlists);
      setFavorites(favData.favorites);
    } catch (err) {
      console.error("Failed to fetch playlists:", err);
    } finally {
      setLoading(false);
      setFavoritesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlaylists();
  }, [fetchPlaylists]);

  const openNcmPlaylist = async (pl: NcmPlaylistSummary) => {
    setSelected(pl);
    setSelectedLocal(null);
    setView("detail");
    setTracksLoading(true);
    try {
      const data = await api.getNcmPlaylistDetail(pl.id);
      setTracks(data.tracks);
    } catch (err) {
      console.error("Failed to fetch playlist tracks:", err);
      setTracks([]);
    } finally {
      setTracksLoading(false);
    }
  };

  const openLocalPlaylist = (pl: Playlist) => {
    setSelectedLocal(pl);
    setSelected(null);
    setView("detail");
  };

  const goBack = () => {
    setView("list");
    setSelected(null);
    setSelectedLocal(null);
    setTracks([]);
  };

  const handlePlayTrack = (track: NcmTrack, index: number) => {
    const queueItems: QueueItem[] = tracks.map((t, i) => ({
      id: `ncm_${t.id}_${i}`,
      type: "song" as const,
      songId: t.id,
      title: t.title,
      artist: t.artist,
      coverUrl: t.coverUrl,
      audioUrl: `/api/audio?id=${encodeURIComponent(t.id)}&title=${encodeURIComponent(t.title)}&artist=${encodeURIComponent(t.artist)}`,
      status: i === index ? ("playing" as const) : ("pending" as const),
    }));
    usePlayerStore.setState({ queue: queueItems });
    playItem(queueItems[index]);
  };

  const handlePlayAll = () => {
    if (tracks.length > 0) {
      handlePlayTrack(tracks[0], 0);
    }
  };

  const formatDuration = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="pl-page">
        <div className="pl-loading">
          <div className="pl-loading-spinner" />
        </div>
      </div>
    );
  }

  return (
    <div className="pl-page">
      <div className="ambient-mesh">
        <div className="ambient-blob ambient-blob-1" />
        <div className="ambient-blob ambient-blob-2" />
        <div className="ambient-blob ambient-blob-3" />
      </div>
      {view === "list" ? (
        <>
          <div className="pl-tabs">
            <button className={`pl-tab ${tab === "favorites" ? "active" : ""}`} onClick={() => setTab("favorites")}>
              {t("favoritesTab")}
            </button>
            <button className={`pl-tab ${tab === "local" ? "active" : ""}`} onClick={() => setTab("local")}>
              {t("localPlaylists")}
            </button>
            <button className={`pl-tab ${tab === "ncm" ? "active" : ""}`} onClick={() => setTab("ncm")}>
              {t("ncmPlaylists")}
            </button>
          </div>
          {tab === "favorites" ? (
            <FavoritesList
              favorites={favorites}
              loading={favoritesLoading}
              onRemove={(songId) => setFavorites((prev) => prev.filter((f) => f.songId !== songId))}
              t={t}
            />
          ) : tab === "local" ? (
            <LocalPlaylistList playlists={localPlaylists} onSelect={openLocalPlaylist} t={t} />
          ) : (
            <PlaylistList playlists={ncmPlaylists} onSelect={openNcmPlaylist} t={t} />
          )}
        </>
      ) : selectedLocal ? (
        <LocalPlaylistDetail
          playlist={selectedLocal}
          onBack={goBack}
          formatDuration={formatDuration}
          t={t}
        />
      ) : (
        <PlaylistDetail
          playlist={selected!}
          tracks={tracks}
          loading={tracksLoading}
          onBack={goBack}
          onPlayTrack={handlePlayTrack}
          onPlayAll={handlePlayAll}
          formatDuration={formatDuration}
          t={t}
        />
      )}
    </div>
  );
}

function PlaylistList({
  playlists,
  onSelect,
  t,
}: {
  playlists: NcmPlaylistSummary[];
  onSelect: (pl: NcmPlaylistSummary) => void;
  t: (key: TranslationKey) => string;
}) {
  return (
    <>
      <div className="pl-header">
        <h1 className="pl-title">{t("playlistsTitle")}</h1>
        <span className="pl-count">{playlists.length}</span>
      </div>

      {playlists.length === 0 ? (
        <div className="pl-empty">
          <div className="pl-empty-icon">&#9835;</div>
          <div className="pl-empty-text">{t("emptyPlaylists")}</div>
        </div>
      ) : (
        <div className="pl-grid">
          {playlists.map((pl, i) => (
            <div
              key={pl.id}
              className="pl-card"
              style={{ animationDelay: `${i * 0.04}s` }}
              onClick={() => onSelect(pl)}
            >
              <div className="pl-card-cover">
                {pl.coverUrl ? (
                  <img src={pl.coverUrl} alt={pl.name} loading="lazy" />
                ) : (
                  <div className="pl-card-cover-fallback">
                    <span>&#9835;</span>
                  </div>
                )}
                <div className="pl-card-play-overlay">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
              <div className="pl-card-info">
                <div className="pl-card-name">{pl.name}</div>
                <div className="pl-card-meta">
                  {pl.trackCount} {t("playlistSongs")}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function PlaylistDetail({
  playlist,
  tracks,
  loading,
  onBack,
  onPlayTrack,
  onPlayAll,
  formatDuration,
  t,
}: {
  playlist: NcmPlaylistSummary;
  tracks: NcmTrack[];
  loading: boolean;
  onBack: () => void;
  onPlayTrack: (track: NcmTrack, index: number) => void;
  onPlayAll: () => void;
  formatDuration: (ms: number) => string;
  t: (key: TranslationKey) => string;
}) {
  return (
    <>
      {/* Hero */}
      <div className="pl-detail-hero">
        <div className="pl-detail-cover">
          {playlist.coverUrl ? (
            <img src={playlist.coverUrl} alt={playlist.name} />
          ) : (
            <div className="pl-detail-cover-fallback">
              <span>&#9835;</span>
            </div>
          )}
        </div>
        <div className="pl-detail-meta">
          <div className="pl-detail-name">{playlist.name}</div>
          <div className="pl-detail-creator">{playlist.creator}</div>
          <div className="pl-detail-stats">
            {playlist.trackCount} {t("playlistSongs")}
          </div>
          {playlist.description && (
            <div className="pl-detail-desc">{playlist.description}</div>
          )}
          <div className="pl-detail-actions">
            <button className="pl-btn-back" onClick={onBack}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
            <button className="pl-btn-play-all" onClick={onPlayAll}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
              <span>{t("playAll")}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Track List */}
      <div className="pl-tracks">
        {loading ? (
          <div className="pl-loading">
            <div className="pl-loading-spinner" />
          </div>
        ) : tracks.length === 0 ? (
          <div className="pl-empty">
            <div className="pl-empty-text">{t("emptyPlaylists")}</div>
          </div>
        ) : (
          tracks.map((track, i) => (
            <div
              key={track.id}
              className="pl-track"
              style={{ animationDelay: `${i * 0.03}s` }}
              onClick={() => onPlayTrack(track, i)}
            >
              <span className="pl-track-num">{i + 1}</span>
              <div className="pl-track-cover">
                {track.coverUrl ? (
                  <img src={track.coverUrl} alt="" loading="lazy" />
                ) : (
                  <div className="pl-track-cover-fallback">
                    <span>&#9835;</span>
                  </div>
                )}
              </div>
              <div className="pl-track-info">
                <div className="pl-track-title">{track.title}</div>
                <div className="pl-track-artist">{track.artist}</div>
              </div>
              <span className="pl-track-duration">
                {formatDuration(track.durationMs)}
              </span>
            </div>
          ))
        )}
      </div>
    </>
  );
}

function LocalPlaylistList({
  playlists,
  onSelect,
  t,
}: {
  playlists: Playlist[];
  onSelect: (pl: Playlist) => void;
  t: (key: TranslationKey) => string;
}) {
  return (
    <>
      <div className="pl-header">
        <h1 className="pl-title">{t("localPlaylists")}</h1>
        <span className="pl-count">{playlists.length}</span>
      </div>

      {playlists.length === 0 ? (
        <div className="pl-empty">
          <div className="pl-empty-icon">&#9835;</div>
          <div className="pl-empty-text">{t("emptyPlaylists")}</div>
        </div>
      ) : (
        <div className="pl-grid">
          {playlists.map((pl, i) => (
            <div
              key={pl.id}
              className="pl-card"
              style={{ animationDelay: `${i * 0.04}s` }}
              onClick={() => onSelect(pl)}
            >
              <div className="pl-card-cover">
                {pl.coverUrl ? (
                  <img src={pl.coverUrl} alt={pl.name} loading="lazy" />
                ) : (
                  <div className="pl-card-cover-fallback">
                    <span>&#9835;</span>
                  </div>
                )}
                <div className="pl-card-play-overlay">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
              <div className="pl-card-info">
                <div className="pl-card-name">{pl.name}</div>
                <div className="pl-card-meta">
                  {pl.items.length} {t("playlistSongs")}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function LocalPlaylistDetail({
  playlist,
  onBack,
  formatDuration,
  t,
}: {
  playlist: Playlist;
  onBack: () => void;
  formatDuration: (ms: number) => string;
  t: (key: TranslationKey) => string;
}) {
  const playItem = usePlayerStore((s) => s.playItem);
  const songItems = playlist.items.filter((item) => item.type === "song");

  const handlePlayTrack = (index: number) => {
    const queueItems: QueueItem[] = songItems.map((item, i) => ({
      id: item.id,
      type: "song" as const,
      songId: item.songId,
      title: item.title,
      artist: item.artist,
      coverUrl: item.coverUrl,
      audioUrl: item.audioUrl || `/api/audio?id=${encodeURIComponent(item.songId ?? "")}&title=${encodeURIComponent(item.title ?? "")}&artist=${encodeURIComponent(item.artist ?? "")}`,
      status: i === index ? ("playing" as const) : ("pending" as const),
    }));
    usePlayerStore.setState({ queue: queueItems });
    playItem(queueItems[index]);
  };

  return (
    <>
      <div className="pl-detail-hero">
        <div className="pl-detail-cover">
          {playlist.coverUrl ? (
            <img src={playlist.coverUrl} alt={playlist.name} />
          ) : (
            <div className="pl-detail-cover-fallback">
              <span>&#9835;</span>
            </div>
          )}
        </div>
        <div className="pl-detail-meta">
          <div className="pl-detail-name">{playlist.name}</div>
          <div className="pl-detail-stats">
            {songItems.length} {t("playlistSongs")}
          </div>
          {playlist.description && (
            <div className="pl-detail-desc">{playlist.description}</div>
          )}
          <div className="pl-detail-actions">
            <button className="pl-btn-back" onClick={onBack}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
            {songItems.length > 0 && (
              <button className="pl-btn-play-all" onClick={() => handlePlayTrack(0)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
                <span>{t("playAll")}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="pl-tracks">
        {songItems.length === 0 ? (
          <div className="pl-empty">
            <div className="pl-empty-text">{t("emptyPlaylists")}</div>
          </div>
        ) : (
          songItems.map((item, i) => (
            <div
              key={item.id}
              className="pl-track"
              style={{ animationDelay: `${i * 0.03}s` }}
              onClick={() => handlePlayTrack(i)}
            >
              <span className="pl-track-num">{i + 1}</span>
              <div className="pl-track-cover">
                {item.coverUrl ? (
                  <img src={item.coverUrl} alt="" loading="lazy" />
                ) : (
                  <div className="pl-track-cover-fallback">
                    <span>&#9835;</span>
                  </div>
                )}
              </div>
              <div className="pl-track-info">
                <div className="pl-track-title">{item.title}</div>
                <div className="pl-track-artist">{item.artist}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}

function FavoritesList({
  favorites,
  loading,
  onRemove,
  t,
}: {
  favorites: FavoriteItem[];
  loading: boolean;
  onRemove: (songId: string) => void;
  t: (key: TranslationKey) => string;
}) {
  const playItem = usePlayerStore((s) => s.playItem);

  const handlePlayTrack = (index: number) => {
    const queueItems: QueueItem[] = favorites.map((f, i) => ({
      id: `fav_${f.songId}_${i}`,
      type: "song" as const,
      songId: f.songId,
      title: f.title ?? undefined,
      artist: f.artist ?? undefined,
      coverUrl: f.coverUrl ?? undefined,
      audioUrl: `/api/audio?id=${encodeURIComponent(f.songId)}&title=${encodeURIComponent(f.title ?? "")}&artist=${encodeURIComponent(f.artist ?? "")}`,
      status: i === index ? ("playing" as const) : ("pending" as const),
    }));
    usePlayerStore.setState({ queue: queueItems });
    playItem(queueItems[index]);
  };

  const handlePlayAll = () => {
    if (favorites.length > 0) handlePlayTrack(0);
  };

  const handleRemove = async (e: React.MouseEvent, songId: string) => {
    e.stopPropagation();
    try {
      await api.removeFavorite(songId);
      onRemove(songId);
    } catch (err) {
      console.error("Failed to remove favorite:", err);
    }
  };

  if (loading) {
    return (
      <div className="pl-loading">
        <div className="pl-loading-spinner" />
      </div>
    );
  }

  return (
    <>
      <div className="pl-header">
        <h1 className="pl-title">{t("favoritesTab")}</h1>
        <span className="pl-count">{favorites.length}</span>
      </div>

      {favorites.length === 0 ? (
        <div className="pl-empty">
          <div className="pl-empty-icon">&#10084;</div>
          <div className="pl-empty-text">{t("noFavorites")}</div>
        </div>
      ) : (
        <>
          <div className="pl-actions-bar">
            <button className="pl-btn-play-all" onClick={handlePlayAll}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
              <span>{t("playAll")}</span>
            </button>
          </div>
          <div className="pl-tracks">
            {favorites.map((fav, i) => (
              <div
                key={fav.songId}
                className="pl-track"
                style={{ animationDelay: `${i * 0.03}s` }}
                onClick={() => handlePlayTrack(i)}
              >
                <span className="pl-track-num">{i + 1}</span>
                <div className="pl-track-cover">
                  {fav.coverUrl ? (
                    <img src={fav.coverUrl} alt="" loading="lazy" />
                  ) : (
                    <div className="pl-track-cover-fallback">
                      <span>&#9835;</span>
                    </div>
                  )}
                </div>
                <div className="pl-track-info">
                  <div className="pl-track-title">{fav.title ?? "Unknown"}</div>
                  <div className="pl-track-artist">{fav.artist ?? ""}</div>
                </div>
                <button
                  className="pl-fav-remove-btn"
                  onClick={(e) => handleRemove(e, fav.songId)}
                  title={t("removeFavorite")}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
