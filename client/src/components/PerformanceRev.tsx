import React, { useMemo, useRef, useState } from "react";
import { motion, useAnimation } from "framer-motion";

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);
const map = (n: number, inMin: number, inMax: number, outMin: number, outMax: number) => 
  ((n - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;

const MIN_ANGLE = -120;
const MAX_ANGLE = 120;

interface PerformanceRevProps {
  level?: number;
  points?: number;
  nextLevelAt?: number;
  sound?: boolean;
  onRev?: () => void;
}

export function PerformanceRev({
  level = 1,
  points = 0,
  nextLevelAt = 100,
  sound = true,
  onRev,
}: PerformanceRevProps) {
  const [currentPoints, setCurrentPoints] = useState(points);
  const progress = clamp(currentPoints / nextLevelAt, 0, 1);

  const controls = useAnimation();
  const glowControls = useAnimation();
  const shakeControls = useAnimation();
  const revLock = useRef(false);

  const needleAngle = useMemo(() => map(progress, 0, 1, MIN_ANGLE + 10, MAX_ANGLE - 40), [progress]);

  const playRevSound = () => {
    if (!sound) return;
    try {
      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(420, now + 0.18);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.35);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.4, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.05, now + 0.35);
      osc.start();
      osc.stop(now + 0.4);
      osc.onended = () => ctx.close();
    } catch {}
  };

  const handleRev = async () => {
    if (revLock.current) return;
    revLock.current = true;

    playRevSound();

    glowControls.start({
      boxShadow: [
        "0 0 0 0 rgba(239,231,233,0.0)",
        "0 0 60px 10px rgba(239,231,233,0.25)",
        "0 0 0 0 rgba(239,231,233,0.0)",
      ],
      transition: { duration: 0.6, ease: "easeOut" },
    });

    const peak = MAX_ANGLE;
    await controls.start({ rotate: peak, transition: { duration: 0.18, ease: [0.2, 0.8, 0.2, 1] } });
    await controls.start({ rotate: needleAngle, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } });

    shakeControls.start({ 
      x: [0, -2, 2, -1, 1, 0], 
      transition: { duration: 0.25 } 
    });

    if (onRev) onRev();
    
    // Micro reward for engaging with the gauge
    setCurrentPoints((p) => clamp(p + Math.round(1 + Math.random() * 2), 0, nextLevelAt - 1));

    setTimeout(() => (revLock.current = false), 150);
  };

  // Update current points when props change
  React.useEffect(() => {
    setCurrentPoints(points);
  }, [points]);

  return (
    <motion.button
      onClick={handleRev}
      animate={glowControls}
      className="w-full aspect-square rounded-full bg-token-text/[0.02] /10 backdrop-blur-sm relative overflow-hidden group"
      style={{
        backgroundImage: "radial-gradient(1200px 500px at 50% 20%, rgba(239,231,233,0.06) 0%, transparent 60%)",
      }}
      data-testid="button-performance-rev"
    >
      <div className="absolute inset-0 grid place-items-center">
        <Gauge progress={progress} controls={controls} />
      </div>
      <div className="absolute inset-0 grid place-items-center pointer-events-none">
        <motion.div animate={shakeControls} className="text-center">
          <div className="text-3xl font-bold" data-testid="text-level">Level {level}</div>
          <div className="mt-1 text-sm text-token-text-secondary" data-testid="text-points">
            {currentPoints} pts · {nextLevelAt - currentPoints} to next
          </div>
        </motion.div>
      </div>
      <div className="absolute bottom-4 left-0 right-0 text-center text-xs text-token-text-muted opacity-0 group-hover:opacity-100 transition-opacity">
        Tap to rev
      </div>
    </motion.button>
  );
}

interface GaugeProps {
  progress: number;
  controls: any;
}

function Gauge({ progress, controls }: GaugeProps) {
  const size = 280;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;

  const startAngle = -200;
  const endAngle = 40;
  const sweep = endAngle - startAngle;

  const arcPath = (pct: number) => {
    const angle = startAngle + sweep * pct;
    const a = (Math.PI / 180) * angle;
    const sx = cx + r * Math.cos((Math.PI / 180) * startAngle);
    const sy = cy + r * Math.sin((Math.PI / 180) * startAngle);
    const ex = cx + r * Math.cos(a);
    const ey = cy + r * Math.sin(a);
    const largeArc = angle - startAngle > 180 ? 1 : 0;
    return `M ${sx} ${sy} A ${r} ${r} 0 ${largeArc} 1 ${ex} ${ey}`;
  };

  const currentPath = arcPath(progress);
  const targetAngle = map(progress, 0, 1, MIN_ANGLE + 10, MAX_ANGLE - 40);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
      <defs>
        <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#888888', stopOpacity: 0.4 }} />
          <stop offset="50%" style={{ stopColor: '#c084fc', stopOpacity: 0.6 }} />
          <stop offset="100%" style={{ stopColor: '#e879f9', stopOpacity: 0.8 }} />
        </linearGradient>
      </defs>
      <path 
        d={arcPath(1)} 
        stroke="rgba(239,231,233,0.12)" 
        strokeWidth={stroke} 
        fill="none" 
        strokeLinecap="round" 
      />
      <motion.path 
        d={currentPath} 
        stroke="url(#gaugeGradient)" 
        strokeWidth={stroke} 
        fill="none" 
        strokeLinecap="round" 
      />
      <g transform={`translate(${cx}, ${cy})`}>
        <motion.g 
          animate={controls} 
          initial={{ rotate: targetAngle }} 
          style={{ transformOrigin: "50% 66%" }}
        >
          <rect x={-2} y={-r * 0.66} width={4} height={r * 0.7} rx={2} fill="#faf8f9" opacity={0.9} />
          <circle cx={0} cy={r * 0.06} r={6} fill="#faf8f9" opacity={0.9} />
        </motion.g>
      </g>
      <circle cx={cx} cy={cy} r={r * 0.72} fill="none" stroke="rgba(239,231,233,0.06)" strokeWidth={2} />
    </svg>
  );
}