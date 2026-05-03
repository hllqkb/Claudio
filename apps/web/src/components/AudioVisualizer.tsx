import { useEffect, useRef } from "react";
import { Wave } from "@foobar404/wave";
import { audioPlayer } from "../audio/AudioPlayer";

interface Props {
  mode: string;
}

export default function AudioVisualizer({ mode }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const waveRef = useRef<Wave | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const audio = audioPlayer.audioElement;
    const wave = new Wave(audio, canvas, true);
    waveRef.current = wave;

    return () => {
      wave.clearAnimations();
      waveRef.current = null;
    };
  }, []);

  useEffect(() => {
    const wave = waveRef.current;
    if (!wave) return;

    wave.clearAnimations();
    const mint = "#5ee8c5";
    const mintDim = "#3ab89e";

    switch (mode) {
      case "Glob":
        wave.addAnimation(new wave.animations.Glob({ fillColor: mint, lineColor: mintDim }));
        break;
      case "Flower":
        wave.addAnimation(new wave.animations.Flower({ fillColor: mint, lineColor: mintDim }));
        break;
      case "Arcs":
        wave.addAnimation(new wave.animations.Arcs({ lineColor: mint, count: 40 }));
        break;
      case "Circles":
        wave.addAnimation(new wave.animations.Circles({ fillColor: mint, lineColor: mintDim }));
        break;
      case "Wave":
        wave.addAnimation(new wave.animations.Wave({ fillColor: mint, lineColor: mintDim }));
        break;
      case "Shine":
        wave.addAnimation(new wave.animations.Shine({ lineColor: mint }));
        break;
    }
  }, [mode]);

  return (
    <div className="audio-visualizer">
      <canvas ref={canvasRef} className="viz-canvas" />
    </div>
  );
}
