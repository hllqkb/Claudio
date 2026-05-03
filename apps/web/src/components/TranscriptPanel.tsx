import { useI18n } from "../i18n/context";

interface TranscriptLine {
  id: string;
  name: string;
  time: string;
  text: string;
  isCurrent?: boolean;
  keywords?: string[];
}

interface Props {
  lines?: TranscriptLine[];
}

const demoLines: TranscriptLine[] = [
  { id: "1", name: "Claudio", time: "0:05", text: "Back in 1971, David Gates picked up a nylon-string guitar...", isCurrent: false, keywords: ["1971"] },
  { id: "2", name: "Claudio", time: "0:18", text: "The opening notes of If feel like a conversation with yourself at 2am.", isCurrent: false, keywords: ["2am"] },
  { id: "3", name: "Claudio", time: "0:32", text: "This is Bread at their most honest — no irony, no filter.", isCurrent: true, keywords: ["Bread", "honest"] },
];

function highlightText(text: string, keywords: string[] = []) {
  if (keywords.length === 0) return text;
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;
  for (const kw of keywords) {
    const idx = remaining.indexOf(kw);
    if (idx === -1) continue;
    if (idx > 0) parts.push(<span key={key++}>{remaining.slice(0, idx)}</span>);
    parts.push(<span key={key++} className="highlight">{kw}</span>);
    remaining = remaining.slice(idx + kw.length);
  }
  if (remaining) parts.push(<span key={key++}>{remaining}</span>);
  return parts.length > 0 ? parts : text;
}

export default function TranscriptPanel({ lines }: Props) {
  const { t } = useI18n();
  const items = lines ?? demoLines;

  if (items.length === 0) return null;

  return (
    <div className="transcript-panel">
      {items.map((line) => (
        <div
          key={line.id}
          className={`transcript-line ${line.isCurrent ? "current" : "past"}`}
        >
          <div className="transcript-meta">
            <div className="transcript-name">{t("djPrefix")} {line.name}</div>
            <div className="transcript-time">{line.time}</div>
          </div>
          <div className="transcript-text">
            {highlightText(line.text, line.keywords)}
          </div>
        </div>
      ))}
    </div>
  );
}
