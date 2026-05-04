import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { parse, parseEnhanced, LineType } from "clrc";
import type { EnhancedLyricLine, EnhancedWord, LyricLine } from "clrc";
import { api } from "../api/client";

interface Props {
  songId?: string;
  currentTimeMs: number;
}

type ParsedLine = {
  startMs: number;
  content: string;
  words: EnhancedWord[] | null;
  translation?: string;
};

export default function KaraokeLyrics({ songId, currentTimeMs }: Props) {
  const [lines, setLines] = useState<ParsedLine[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLDivElement>(null);
  const userScrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const fetchLyric = useCallback(async (id: string) => {
    try {
      const data = await api.getLyric(id);
      const parsedLines = parseLyrics(data.lrc, data.tlyric, data.yrc);
      setLines(parsedLines);
    } catch {
      setLines([]);
    }
  }, []);

  useEffect(() => {
    if (songId) {
      fetchLyric(songId);
    } else {
      setLines([]);
    }
  }, [songId, fetchLyric]);

  // Auto-scroll on user interaction
  const handleScroll = useCallback(() => {
    if (userScrollTimer.current) clearTimeout(userScrollTimer.current);
    setAutoScroll(false);
    userScrollTimer.current = setTimeout(() => setAutoScroll(true), 3000);
  }, []);

  // Scroll active line into view — only within the karaoke container, not the whole page
  useEffect(() => {
    if (autoScroll && activeRef.current && containerRef.current) {
      const container = containerRef.current;
      const active = activeRef.current;
      const containerRect = container.getBoundingClientRect();
      const activeRect = active.getBoundingClientRect();

      // Only scroll if the active line is not already visible in the container
      const isVisible =
        activeRect.top >= containerRect.top && activeRect.bottom <= containerRect.bottom;
      if (!isVisible) {
        const offsetTop = active.offsetTop - container.offsetTop;
        const targetScroll = offsetTop - container.clientHeight / 2 + active.clientHeight / 2;
        container.scrollTo({ top: targetScroll, behavior: "smooth" });
      }
    }
  }, [currentTimeMs, autoScroll]);

  // Find active line index
  const activeIndex = useMemo(() => {
    if (lines.length === 0) return -1;
    let idx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startMs <= currentTimeMs) {
        idx = i;
      } else {
        break;
      }
    }
    return idx;
  }, [lines, currentTimeMs]);

  if (lines.length === 0) {
    return (
      <div className="karaoke-panel">
        <div className="karaoke-empty">暂无歌词</div>
      </div>
    );
  }

  return (
    <div className="karaoke-panel" ref={containerRef} onScroll={handleScroll}>
      <div className="karaoke-spacer" />
      {lines.map((line, i) => {
        const isActive = i === activeIndex;
        const isPast = i < activeIndex;
        const className = `karaoke-line-wrapper ${isActive ? "active" : isPast ? "past" : "future"}`;

        return (
          <div
            key={`${songId}_${i}`}
            ref={isActive ? activeRef : undefined}
            className={className}
          >
            <div className="karaoke-text">
              {isActive ? (
                <ActiveLine
                  line={line}
                  currentTimeMs={currentTimeMs}
                  nextLineStartMs={lines[i + 1]?.startMs}
                />
              ) : (
                <span>{line.content}</span>
              )}
            </div>
            {line.translation && (
              <div className="karaoke-translation">{line.translation}</div>
            )}
          </div>
        );
      })}
      <div className="karaoke-spacer" />
    </div>
  );
}

function ActiveLine({
  line,
  currentTimeMs,
  nextLineStartMs,
}: {
  line: ParsedLine;
  currentTimeMs: number;
  nextLineStartMs?: number;
}) {
  if (line.words && line.words.length > 0) {
    return (
      <EnhancedLineRender
        words={line.words}
        currentTimeMs={currentTimeMs}
        nextLineStartMs={nextLineStartMs}
        lineStartMs={line.startMs}
      />
    );
  }
  return (
    <SimulatedLineRender
      content={line.content}
      lineStartMs={line.startMs}
      nextLineStartMs={nextLineStartMs}
      currentTimeMs={currentTimeMs}
    />
  );
}

function EnhancedLineRender({
  words,
  currentTimeMs,
  nextLineStartMs,
  lineStartMs,
}: {
  words: EnhancedWord[];
  currentTimeMs: number;
  nextLineStartMs?: number;
  lineStartMs: number;
}) {
  const chars: React.ReactNode[] = [];

  for (let w = 0; w < words.length; w++) {
    const word = words[w];
    const wordStart = word.startMillisecond;
    const wordEnd = words[w + 1]?.startMillisecond ?? nextLineStartMs ?? (lineStartMs + 30000);
    const wordDuration = Math.max(wordEnd - wordStart, 1);

    for (let c = 0; c < word.content.length; c++) {
      const charStart = wordStart + (wordDuration * c) / word.content.length;
      const isLit = currentTimeMs >= charStart;
      chars.push(
        <span
          key={`${w}_${c}`}
          className={`karaoke-char ${isLit ? "lit" : "unlit"}`}
        >
          {word.content[c]}
        </span>
      );
    }
  }

  return <>{chars}</>;
}

function SimulatedLineRender({
  content,
  lineStartMs,
  nextLineStartMs,
  currentTimeMs,
}: {
  content: string;
  lineStartMs: number;
  nextLineStartMs?: number;
  currentTimeMs: number;
}) {
  const lineDuration = Math.max((nextLineStartMs ?? (lineStartMs + 5000)) - lineStartMs, 1);
  const chars = Array.from(content);

  return (
    <>
      {chars.map((char, i) => {
        const charStart = lineStartMs + (lineDuration * i) / chars.length;
        const isLit = currentTimeMs >= charStart;
        return (
          <span
            key={i}
            className={`karaoke-char ${isLit ? "lit" : "unlit"}`}
          >
            {char}
          </span>
        );
      })}
    </>
  );
}

function parseLyrics(lrc: string, tlyric?: string, yrc?: string): ParsedLine[] {
  // Try enhanced LRC first (yrc has word-level timing)
  if (yrc) {
    try {
      const enhanced = parseEnhanced(yrc);
      const enhancedLines = enhanced.filter(
        (l): l is EnhancedLyricLine => l.type === LineType.ENHANCED_LYRIC
      );
      if (enhancedLines.length > 0) {
        const translationMap = parseTranslationMap(tlyric);
        return enhancedLines.map((line) => ({
          startMs: line.startMillisecond,
          content: line.content,
          words: line.words,
          translation: translationMap.get(line.startMillisecond),
        }));
      }
    } catch {
      // Fall through to standard LRC
    }
  }

  // Standard LRC fallback
  const parsed = parse(lrc);
  const lyricLines = parsed.filter(
    (l): l is LyricLine => l.type === LineType.LYRIC
  );

  const translationMap = parseTranslationMap(tlyric);

  return lyricLines.map((line) => ({
    startMs: line.startMillisecond,
    content: line.content,
    words: null,
    translation: translationMap.get(line.startMillisecond),
  }));
}

function parseTranslationMap(tlyric?: string): Map<number, string> {
  const map = new Map<number, string>();
  if (!tlyric) return map;

  try {
    const parsed = parse(tlyric);
    for (const line of parsed) {
      if (line.type === LineType.LYRIC) {
        map.set(line.startMillisecond, line.content);
      }
    }
  } catch {
    // Ignore parse errors
  }

  return map;
}
