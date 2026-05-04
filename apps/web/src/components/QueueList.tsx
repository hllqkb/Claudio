import { useState } from "react";
import type { QueueItem } from "../api/client";
import { useI18n } from "../i18n/context";

interface Props {
  items: QueueItem[];
  onItemClick?: (item: QueueItem) => void;
}

export default function QueueList({ items, onItemClick }: Props) {
  const { t } = useI18n();

  if (items.length === 0) {
    return (
      <div className="queue-empty">
        <div style={{ fontSize: 28, marginBottom: 10, opacity: 0.3 }}>&#9835;</div>
        <div>{t("emptyQueue")}</div>
      </div>
    );
  }

  return (
    <ul className="queue-list">
      {items.map((item, idx) => (
        <li
          key={item.id}
          className={`queue-item ${item.status}`}
          style={{ animationDelay: `${Math.min(idx * 0.05, 0.5)}s` }}
          onClick={() => onItemClick?.(item)}
        >
          <span className="queue-index">{idx + 1}</span>
          <CoverImage url={item.coverUrl} />
          <div className="queue-info">
            <span className="queue-title">
              {item.type === "tts" ? item.text : item.title ?? "Unknown Track"}
            </span>
            {item.artist && <span className="queue-artist">{item.artist}</span>}
          </div>
          <span className="queue-status">
            {item.status === "playing" && (
              <span className="eq-bars">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="eq-bar"
                    style={{ "--delay": `${i * 0.15}s` } as React.CSSProperties}
                  />
                ))}
              </span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}

function CoverImage({ url }: { url?: string }) {
  const [error, setError] = useState(false);

  if (!url || error) {
    return (
      <div className="queue-cover">
        <div className="queue-cover-fallback">
          <span>&#9835;</span>
        </div>
      </div>
    );
  }

  return (
    <div className="queue-cover">
      <img src={url} alt="" loading="lazy" onError={() => setError(true)} />
    </div>
  );
}
