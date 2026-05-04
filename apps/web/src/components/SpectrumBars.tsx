import { useEffect, useRef, useCallback } from "react";
import { audioPlayer } from "../audio/AudioPlayer";

const BAR_COUNT = 64;
const SOURCE_BARS = 32;

interface Props {
  active: boolean;
}

function hslColor(ratio: number, alpha: number): string {
  const hue = 270 + (170 - 270) * ratio;
  return `hsla(${hue}, 80%, 60%, ${alpha})`;
}

export default function SpectrumBars({ active }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const freqDataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const barsRef = useRef<number[]>(new Array(SOURCE_BARS).fill(0));
  const peaksRef = useRef<number[]>(new Array(SOURCE_BARS).fill(0));
  const peakHoldRef = useRef<number[]>(new Array(SOURCE_BARS).fill(0));

  const setupAudio = useCallback(() => {
    if (analyserRef.current) return;
    try {
      const audioCtx = audioPlayer.getAudioContext();
      const sourceNode = audioPlayer.getSourceNode();
      if (!audioCtx || !sourceNode) return;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.8;
      sourceNode.connect(analyser);
      analyserRef.current = analyser;
      freqDataRef.current = new Uint8Array(analyser.frequencyBinCount);
    } catch (err) {
      console.warn("[SpectrumBars] Could not set up audio analysis:", err);
    }
  }, []);

  useEffect(() => {
    if (active) setupAudio();
  }, [active, setupAudio]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    // Log frequency mapping — center bars start from ~60Hz, not 0Hz
    const logMap: number[] = [];
    for (let i = 0; i < SOURCE_BARS; i++) {
      const minLog = Math.log10(2);
      const maxLog = Math.log10(512);
      logMap.push(Math.pow(10, minLog + (maxLog - minLog) * (i / SOURCE_BARS)));
    }

    const draw = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);

      const freqData = freqDataRef.current;
      const analyser = analyserRef.current;
      const bars = barsRef.current;
      const peaks = peaksRef.current;
      const peakHold = peakHoldRef.current;
      const t = performance.now();

      const barWidth = w / BAR_COUNT;
      const gap = 1;
      const mainHeight = h * 0.7;

      // Get frequency data once per frame
      if (active && analyser && freqData) {
        analyser.getByteFrequencyData(freqData);
      }

      for (let i = 0; i < SOURCE_BARS; i++) {
        let target: number;
        if (active && freqData) {
          // Average a small range of bins for smoother, more responsive bars
          const centerBin = Math.floor(logMap[i]);
          const binSpan = Math.max(1, Math.floor(centerBin * 0.3));
          const lo = Math.max(1, centerBin - binSpan);
          const hi = Math.min(freqData.length - 1, centerBin + binSpan);
          let sum = 0;
          for (let b = lo; b <= hi; b++) sum += freqData[b];
          const avg = sum / (hi - lo + 1);
          const ratio = i / SOURCE_BARS;
          const boost = 1.0 + Math.pow(1.0 - ratio, 2.0) * 1.5;
          target = Math.min(1, avg / 255 * boost);
        } else {
          // Idle: multi-layer sine breathing
          target =
            0.1 +
            0.06 * Math.sin(t * 0.0015 + i * 0.25) *
            (0.5 + 0.5 * Math.sin(t * 0.0008 + i * 0.15)) +
            0.04 * Math.sin(t * 0.003 + i * 0.4);
        }

        // Fast attack (0.85), slow release (0.08)
        bars[i] += (target - bars[i]) * (target > bars[i] ? 0.85 : 0.08);

        // Sqrt compression
        const barHeight = Math.pow(bars[i], 0.65) * mainHeight * 0.88;
        const colorRatio = i / SOURCE_BARS;

        // Mirror: left side = reversed, right side = normal
        const leftIdx = SOURCE_BARS - 1 - i;
        const rightIdx = SOURCE_BARS + i;

        for (const [barPos, srcIdx] of [[leftIdx, i], [rightIdx, i]] as const) {
          const x = barPos * barWidth + gap / 2;
          const y = mainHeight - barHeight;

          // Glow
          ctx.shadowColor = hslColor(colorRatio, 0.8);
          ctx.shadowBlur = 4 + bars[i] * 12;

          // HSL gradient
          const grad = ctx.createLinearGradient(x, mainHeight, x, y);
          grad.addColorStop(0, hslColor(colorRatio, 0.05));
          grad.addColorStop(0.3, hslColor(colorRatio, 0.2));
          grad.addColorStop(0.6, hslColor(colorRatio, 0.5));
          grad.addColorStop(1, hslColor(colorRatio, 0.9));
          ctx.fillStyle = grad;

          // Rounded top caps
          const radius = Math.min(3, (barWidth - gap) / 2);
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth - gap, barHeight, [radius, radius, 0, 0]);
          ctx.fill();

          // Reset shadow
          ctx.shadowBlur = 0;

          // Bottom mirror reflection (30% height, 30% opacity)
          if (barHeight > 2) {
            const reflHeight = barHeight * 0.3;
            const reflGrad = ctx.createLinearGradient(x, mainHeight, x, mainHeight + reflHeight);
            reflGrad.addColorStop(0, hslColor(colorRatio, 0.25));
            reflGrad.addColorStop(1, hslColor(colorRatio, 0));
            ctx.fillStyle = reflGrad;
            ctx.beginPath();
            ctx.roundRect(x, mainHeight, barWidth - gap, reflHeight, [0, 0, radius, radius]);
            ctx.fill();
          }

          // Peak hold
          if (bars[i] > peaks[srcIdx]) {
            peaks[srcIdx] = bars[i];
            peakHold[srcIdx] = 40;
          } else if (peakHold[srcIdx] > 0) {
            peakHold[srcIdx]--;
          } else {
            peaks[srcIdx] *= 0.975;
          }
          const peakY = mainHeight - Math.pow(peaks[srcIdx], 0.65) * mainHeight * 0.88;
          ctx.fillStyle = `rgba(255, 255, 255, 0.5)`;
          ctx.fillRect(x, Math.max(0, peakY - 2), barWidth - gap, 2);
        }
      }

      animFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [active]);

  return (
    <div className="spectrum-bars-container">
      <canvas ref={canvasRef} className="spectrum-bars-canvas" />
    </div>
  );
}
