import { useEffect, useRef } from "react";

interface Props {
  mode: string;
}

// Pure canvas-based visualizer - no AudioContext, no createMediaElementSource
export default function AudioVisualizer({ mode }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener("resize", resize);

    let time = 0;
    const w = () => canvas.offsetWidth;
    const h = () => canvas.offsetHeight;

    const draw = () => {
      time += 0.015;
      ctx.clearRect(0, 0, w(), h());

      const cx = w() / 2;
      const cy = h() / 2;
      const mint = "rgba(94,232,197,";

      switch (mode) {
        case "Glob": {
          ctx.beginPath();
          for (let i = 0; i < 100; i++) {
            const angle = (i / 100) * Math.PI * 2;
            const r = 80 + Math.sin(time * 2 + i * 0.3) * 30 + Math.cos(time * 1.5 + i * 0.5) * 20;
            const x = cx + Math.cos(angle) * r;
            const y = cy + Math.sin(angle) * r;
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.strokeStyle = `${mint}0.3)`;
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.fillStyle = `${mint}0.05)`;
          ctx.fill();
          break;
        }
        case "Flower": {
          const petals = 8;
          for (let p = 0; p < petals; p++) {
            const angle = (p / petals) * Math.PI * 2 + time * 0.5;
            const r = 60 + Math.sin(time * 2 + p) * 20;
            ctx.beginPath();
            ctx.ellipse(
              cx + Math.cos(angle) * 30,
              cy + Math.sin(angle) * 30,
              r, r * 0.4, angle, 0, Math.PI * 2
            );
            ctx.strokeStyle = `${mint}${0.15 + Math.sin(time + p) * 0.1})`;
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
          break;
        }
        case "Arcs": {
          for (let i = 0; i < 20; i++) {
            const startAngle = time + (i / 20) * Math.PI * 2;
            const r = 50 + i * 8;
            ctx.beginPath();
            ctx.arc(cx, cy, r, startAngle, startAngle + Math.PI * 0.3);
            ctx.strokeStyle = `${mint}${0.2 - i * 0.008})`;
            ctx.lineWidth = 2;
            ctx.stroke();
          }
          break;
        }
        case "Circles": {
          for (let i = 0; i < 5; i++) {
            const r = 40 + i * 30 + Math.sin(time * 2 + i) * 10;
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.strokeStyle = `${mint}${0.15 - i * 0.02})`;
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
          break;
        }
        case "Wave": {
          ctx.beginPath();
          for (let x = 0; x < w(); x += 2) {
            const y = cy + Math.sin(x * 0.02 + time * 3) * 30 + Math.sin(x * 0.01 + time * 2) * 20;
            x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
          }
          ctx.strokeStyle = `${mint}0.3)`;
          ctx.lineWidth = 2;
          ctx.stroke();
          break;
        }
        case "Shine": {
          const rays = 30;
          for (let i = 0; i < rays; i++) {
            const angle = (i / rays) * Math.PI * 2 + time * 0.3;
            const len = 40 + Math.sin(time * 3 + i * 0.5) * 30;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(angle) * len, cy + Math.sin(angle) * len);
            ctx.strokeStyle = `${mint}${0.15 + Math.sin(time + i) * 0.1})`;
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
          break;
        }
      }

      animFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [mode]);

  return (
    <div className="audio-visualizer">
      <canvas ref={canvasRef} className="viz-canvas" />
    </div>
  );
}
