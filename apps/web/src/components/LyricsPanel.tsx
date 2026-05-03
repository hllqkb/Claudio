import { useEffect, useState, useCallback } from "react";
import { Lrc } from "react-lrc";
import { api } from "../api/client";

interface Props {
  songId?: string;
  currentTimeMs: number;
}

export default function LyricsPanel({ songId, currentTimeMs }: Props) {
  const [lrc, setLrc] = useState("");
  const [translatedLrc, setTranslatedLrc] = useState("");

  const fetchLyric = useCallback(async (id: string) => {
    try {
      const data = await api.getLyric(id);
      setLrc(data.lrc ?? "");
      setTranslatedLrc(data.tlyric ?? "");
    } catch {
      setLrc("");
      setTranslatedLrc("");
    }
  }, []);

  useEffect(() => {
    if (songId) {
      fetchLyric(songId);
    } else {
      setLrc("");
      setTranslatedLrc("");
    }
  }, [songId, fetchLyric]);

  if (!lrc || !songId) {
    return (
      <div className="lyrics-empty">
        <span className="lyrics-empty-text">暂无歌词</span>
      </div>
    );
  }

  return (
    <div className="lyrics-panel">
      <Lrc
        lrc={lrc}
        currentMillisecond={currentTimeMs}
        verticalSpace
        recoverAutoScrollInterval={3000}
        style={{ height: "100%", overflow: "auto" }}
        lineRenderer={({ index, active, line }) => (
          <div className={`lyrics-line ${active ? "active" : ""}`}>
            <span className="lyrics-text">{line.content}</span>
          </div>
        )}
      />
    </div>
  );
}
