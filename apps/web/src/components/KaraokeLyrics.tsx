import { useEffect, useState, useRef, useCallback } from "react";
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

  // Time in ref — char highlighting uses rAF, NOT React re-renders
  const timeRef = useRef(currentTimeMs);
  timeRef.current = currentTimeMs;

  // Active line index — updated via interval(200ms), not per-frame useMemo
  const [activeIndex, setActiveIndex] = useState(-1);

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

  // Detect active line at 200ms intervals (not per-frame)
  useEffect(() => {
    if (lines.length === 0) { setActiveIndex(-1); return; }
    const iv = setInterval(() => {
      const t = timeRef.current;
      let idx = -1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startMs <= t) idx = i;
        else break;
      }
      setActiveIndex(idx);
    }, 200);
    return () => clearInterval(iv);
  }, [lines]);

  // Scroll active line into view
  const prevActiveRef = useRef<number>(-1);
  useEffect(() => {
    if (activeIndex !== prevActiveRef.current) {
      prevActiveRef.current = activeIndex;
      if (autoScroll && activeRef.current) {
        activeRef.current.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    }
  }, [activeIndex, autoScroll]);

  // User scroll pauses auto-scroll
  const handleScroll = useCallback(() => {
    if (userScrollTimer.current) clearTimeout(userScrollTimer.current);
    setAutoScroll(false);
    userScrollTimer.current = setTimeout(() => setAutoScroll(true), 5000);
  }, []);

  // rAF loop for char-level highlighting (direct DOM, zero React re-renders)
  useEffect(() => {
    let raf: number;
    const tick = () => {
      const t = timeRef.current;
      const container = containerRef.current;
      if (container) {
        const chars = container.querySelectorAll<HTMLElement>(".karaoke-char[data-start]");
        for (let i = 0; i < chars.length; i++) {
          const start = Number(chars[i].dataset.start);
          if (t >= start) {
            if (!chars[i].classList.contains("lit")) {
              chars[i].classList.add("lit");
              chars[i].classList.remove("unlit");
            }
          } else {
            if (!chars[i].classList.contains("unlit")) {
              chars[i].classList.add("unlit");
              chars[i].classList.remove("lit");
            }
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

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
              {isActive && line.words && line.words.length > 0 ? (
                <EnhancedLineStatic
                  words={line.words}
                  nextLineStartMs={lines[i + 1]?.startMs}
                  lineStartMs={line.startMs}
                />
              ) : isActive ? (
                <SimulatedLineStatic
                  content={line.content}
                  lineStartMs={line.startMs}
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

/**
 * Enhanced (word-level timed) lyrics — renders static spans with data-start.
 * The rAF loop in the parent toggles .lit/.unlit classes.
 * This component NEVER re-renders for time changes.
 */
function EnhancedLineStatic({
  words,
  nextLineStartMs,
  lineStartMs,
}: {
  words: EnhancedWord[];
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
      chars.push(
        <span
          key={`${w}_${c}`}
          className="karaoke-char unlit"
          data-start={charStart}
        >
          {word.content[c]}
        </span>
      );
    }
  }

  return <>{chars}</>;
}

/**
 * Simulated (no word-level timing) lyrics — evenly distributes time across chars.
 * Renders static spans with data-start. rAF loop handles highlighting.
 */
function SimulatedLineStatic({
  content,
  lineStartMs,
  nextLineStartMs,
}: {
  content: string;
  lineStartMs: number;
  nextLineStartMs?: number;
}) {
  const lineDuration = Math.max((nextLineStartMs ?? (lineStartMs + 5000)) - lineStartMs, 1);
  const chars = Array.from(content);

  return (
    <>
      {chars.map((char, i) => {
        const charStart = lineStartMs + (lineDuration * i) / chars.length;
        return (
          <span
            key={i}
            className="karaoke-char unlit"
            data-start={charStart}
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
        const METADATA_RE = /^(作词|作曲|编曲|制作人|录音|混音|母带|吉他|贝斯|鼓|键盘|弦乐|大提琴|小提琴|钢琴|和声|和音|词|曲|演唱|演奏|后期|封面|美工|翻译|文案|出品|监制|企划|统筹|宣传|发行)\s*[:：]/;
        const realEnhanced = enhancedLines.filter((line) => !METADATA_RE.test(line.content.trim()));
        return realEnhanced.map((line) => ({
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

  const METADATA_RE = /^(作词|作曲|编曲|制作人|录音|混音|母带|吉他|贝斯|鼓|键盘|弦乐|大提琴|小提琴|钢琴|和声|和音|词|曲|演唱|演奏|后期|封面|美工|翻译|文案|出品|监制|企划|统筹|宣传|发行)\s*[:：]/;

  const realLines = lyricLines.filter((line) => !METADATA_RE.test(line.content.trim()));

  const translationMap = parseTranslationMap(tlyric);

  return realLines.map((line) => ({
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
