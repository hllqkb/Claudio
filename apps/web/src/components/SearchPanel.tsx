import { useState, useCallback, useRef } from "react";
import { api, type QueueItem } from "../api/client";

interface Props {
  onSelectSong: (item: QueueItem) => void;
}

export default function SearchPanel({ onSelectSong }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<{ id: string; title: string; artist: string; album: string; coverUrl: string; durationMs: number }>>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const data = await api.searchSongs(q.trim(), 10);
      setResults(data.results);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInput = useCallback((value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 400);
  }, [doSearch]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      doSearch(query);
    }
  }, [query, doSearch]);

  const formatDuration = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="search-panel">
      <div className="search-input-row">
        <input
          className="search-input"
          type="text"
          placeholder="Search songs..."
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
        />
      </div>

      {loading && <div className="search-loading">Searching...</div>}

      {!loading && searched && results.length === 0 && (
        <div className="search-empty">No results found</div>
      )}

      {results.length > 0 && (
        <ul className="search-results">
          {results.map((song) => (
            <li
              key={song.id}
              className="search-result-item"
              onClick={() => onSelectSong({
                id: `search_${song.id}`,
                type: "song",
                songId: song.id,
                title: song.title,
                artist: song.artist,
                coverUrl: song.coverUrl,
                audioUrl: "",
                status: "pending",
              })}
            >
              <div className="search-result-cover">
                {song.coverUrl ? (
                  <img src={song.coverUrl} alt={song.title} />
                ) : (
                  <div className="search-result-cover-fallback">♫</div>
                )}
              </div>
              <div className="search-result-info">
                <div className="search-result-title">{song.title}</div>
                <div className="search-result-meta">{song.artist} · {song.album}</div>
              </div>
              <div className="search-result-duration">{formatDuration(song.durationMs)}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
