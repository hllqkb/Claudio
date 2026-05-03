import { useMemo } from "react";

interface Props {
  active?: boolean;
  barCount?: number;
}

export default function AudioSpectrum({ active = false, barCount = 32 }: Props) {
  const bars = useMemo(
    () =>
      Array.from({ length: barCount }, (_, i) => {
        const center = barCount / 2;
        const dist = Math.abs(i - center) / center;
        const baseMin = 4 + (1 - dist) * 6;
        const baseMax = 16 + (1 - dist) * 28;
        return {
          minH: `${baseMin}px`,
          maxH: `${baseMax}px`,
          duration: `${0.4 + Math.random() * 0.6}s`,
          delay: `${Math.random() * 0.5}s`,
        };
      }),
    [barCount]
  );

  return (
    <div className="spectrum">
      {bars.map((bar, i) => (
        <div
          key={i}
          className={`spectrum-bar ${active ? "active" : ""}`}
          style={
            active
              ? ({
                  "--min-h": bar.minH,
                  "--max-h": bar.maxH,
                  "--duration": bar.duration,
                  "--delay": bar.delay,
                  height: bar.minH,
                } as React.CSSProperties)
              : { height: "3px" }
          }
        />
      ))}
    </div>
  );
}
