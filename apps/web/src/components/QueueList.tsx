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
          onClick={() => onItemClick?.(item)}
        >
          <span className="queue-index">{idx + 1}</span>
          <span className="queue-type">
            {item.type === "tts" ? (
              <span style={{ color: "var(--mint)", fontSize: 10, fontWeight: 700 }}>
                {t("djPrefix")}
              </span>
            ) : (
              <span style={{ color: "var(--text-secondary)" }}>&#9835;</span>
            )}
          </span>
          <span className="queue-title">
            {item.type === "tts" ? item.text : item.title ?? "Unknown Track"}
          </span>
          {item.artist && <span className="queue-artist">{item.artist}</span>}
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
            {item.status}
          </span>
        </li>
      ))}
    </ul>
  );
}
