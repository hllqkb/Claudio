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
  const activeLineRef = useRef<HTMLDivElement>(null);
  const userScrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Time in ref — direct DOM update via rAF, NOT React re-renders
  const timeRef = useRef(currentTimeMs);
  timeRef.current = currentTimeMs;

  // Active line index
  const [activeIndex, setActiveIndex] = useState(-1);
  const prevIdxRef = useRef(-1);

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

  // Single rAF loop: active line detection + --progress direct DOM update
  useEffect(() => {
    if (lines.length === 0) { setActiveIndex(-1); return; }
    let raf: number;

    const tick = () => {
      const t = timeRef.current;

      // Find active line (optimized — search near previous index)
      let idx = -1;
      const startSearch = Math.max(0, prevIdxRef.current - 1);
      for (let i = startSearch; i < lines.length; i++) {
        if (lines[i].startMs <= t) idx = i;
        else break;
      }

      // Update React state only on change
      if (idx !== prevIdxRef.current) {
        prevIdxRef.current = idx;
        setActiveIndex(idx);
      }

      // Update --progress via direct DOM (no React re-render)
      if (activeLineRef.current && idx >= 0) {
        const line = lines[idx];
        let progress: number;
        if (line.words && line.words.length > 0) {
          // Per-word progress (more accurate for yrc enhanced lyrics)
          progress = calcWordProgress(line.words, t, lines[idx + 1]?.startMs, line.startMs);
        } else {
          // Simulated progress based on line duration
          const nextStart = lines[idx + 1]?.startMs ?? (line.startMs + 5000);
          const duration = nextStart - line.startMs;
          progress = Math.max(0, Math.min(100, ((t - line.startMs) / duration) * 100));
        }
        activeLineRef.current.style.setProperty("--progress", `${progress}%`);
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [lines]);

  // Scroll active line into view — position at 35% from top
  const prevActiveRef = useRef<number>(-1);
  useEffect(() => {
    if (activeIndex !== prevActiveRef.current) {
      prevActiveRef.current = activeIndex;
      if (autoScroll && containerRef.current && activeLineRef.current) {
        const container = containerRef.current;
        const line = activeLineRef.current;
        const containerH = container.clientHeight;
        const lineTop = line.offsetTop;
        const lineH = line.offsetHeight;
        const targetScroll = lineTop - containerH * 0.35 + lineH / 2;
        container.scrollTo({ top: targetScroll, behavior: "smooth" });
      }
    }
  }, [activeIndex, autoScroll]);

  // User scroll pauses auto-scroll (8s timeout)
  const handleScroll = useCallback(() => {
    if (userScrollTimer.current) clearTimeout(userScrollTimer.current);
    setAutoScroll(false);
    userScrollTimer.current = setTimeout(() => setAutoScroll(true), 8000);
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
            ref={isActive ? activeLineRef : undefined}
            className={className}
          >
            <div className={`karaoke-text ${isActive ? "karaoke-sweep" : ""}`}>
              {line.content}
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

/** Calculate progress for word-level timed lyrics */
function calcWordProgress(words: EnhancedWord[], timeMs: number, nextLineStartMs?: number, lineStartMs?: number): number {
  let totalChars = 0;
  let litChars = 0;
  const fallback = lineStartMs ? lineStartMs + 30000 : 30000;

  for (let w = 0; w < words.length; w++) {
    const word = words[w];
    const wordStart = word.startMillisecond;
    const wordEnd = words[w + 1]?.startMillisecond ?? nextLineStartMs ?? fallback;
    totalChars += word.content.length;
    if (timeMs >= wordEnd) {
      litChars += word.content.length;
    } else if (timeMs > wordStart) {
      litChars += word.content.length * ((timeMs - wordStart) / (wordEnd - wordStart));
    }
  }

  return totalChars > 0 ? (litChars / totalChars) * 100 : 0;
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
        const METADATA_RE = /^(作词|作曲|编曲|制作人|录音|混音|母带|吉他|贝斯|鼓|键盘|弦乐|大提琴|小提琴|钢琴|和声|和音|词|曲|演唱|演奏|后期|封面|美工|翻译|文案|出品|监制|企划|统筹|宣传|发行|出品人|弦乐编写|和声编写|录音师|录音棚|混音\/母带|杜比全景声|制作统筹|出品公司|音乐总监|声乐指导|器乐|编曲人|制作人助理|混音师|母带师|录音助理|发行公司).*[:：]/;
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

  const METADATA_RE = /^(作词|作曲|编曲|制作人|录音|混音|母带|吉他|贝斯|鼓|键盘|弦乐|大提琴|小提琴|钢琴|和声|和音|词|曲|演唱|演奏|后期|封面|美工|翻译|文案|出品|监制|企划|统筹|宣传|发行|出品人|弦乐编写|和声编写|录音师|录音棚|混音\/母带|杜比全景声|制作统筹|出品公司|音乐总监|声乐指导|器乐|编曲人|制作人助理|混音师|母带师|录音助理|发行公司).*[:：]/;

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
