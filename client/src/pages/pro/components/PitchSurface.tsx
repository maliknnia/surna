import type { ReactNode } from "react";
import type { SportTacticalLayoutId } from "@shared/sportTacticalLayouts";

/** Broadcast-style line colours — crisp white on turf. */
const W = "rgba(255, 255, 255, 0.92)";
const W_SOFT = "rgba(255, 255, 255, 0.42)";
const W_FAINT = "rgba(255, 255, 255, 0.18)";

type Props = {
  layoutId: SportTacticalLayoutId;
  className?: string;
  /** Smaller stroke scale for chat mini previews */
  compact?: boolean;
};

function SvgDefs() {
  return (
    <defs>
      <filter id="pro-pitch-glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="0.4" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <linearGradient id="pro-pitch-line-shine" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
        <stop offset="100%" stopColor="rgba(255,255,255,0.72)" />
      </linearGradient>
    </defs>
  );
}

function lineProps(compact: boolean) {
  const s = compact ? 0.85 : 1;
  return {
    stroke: "url(#pro-pitch-line-shine)",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    filter: compact ? undefined : "url(#pro-pitch-glow)",
    strokeWidth: 0.38 * s,
  };
}

/** Regulation football pitch — proportional markings in 0–100 space. */
function FootballPitch({ compact }: { compact: boolean }) {
  const lp = lineProps(compact);
  const pad = 2;
  const penH = 15.7;
  const sixH = 5.2;
  const penW = 59.3;
  const sixW = 26.9;
  const penX = (100 - penW) / 2;
  const sixX = (100 - sixW) / 2;
  const spotY = pad + 10.5;
  const spotYBot = 100 - pad - 10.5;
  const arcR = 9;

  return (
    <>
      <rect x={pad} y={pad} width={100 - pad * 2} height={100 - pad * 2} fill="none" {...lp} strokeWidth={0.42 * (compact ? 0.85 : 1)} />
      <line x1={pad} y1={50} x2={100 - pad} y2={50} {...lp} />
      <circle cx={50} cy={50} r={9.15} fill="none" {...lp} />
      <circle cx={50} cy={50} r={0.65} fill={W} />
      {/* Top penalty area */}
      <rect x={penX} y={pad} width={penW} height={penH} fill="none" {...lp} strokeWidth={0.35 * (compact ? 0.85 : 1)} />
      <rect x={sixX} y={pad} width={sixW} height={sixH} fill="none" {...lp} strokeWidth={0.32 * (compact ? 0.85 : 1)} />
      <circle cx={50} cy={spotY} r={0.7} fill={W} />
      <path
        d={`M ${50 - arcR} ${pad + penH} A ${arcR} ${arcR} 0 0 0 ${50 + arcR} ${pad + penH}`}
        fill="none"
        {...lp}
        strokeWidth={0.35 * (compact ? 0.85 : 1)}
      />
      {/* Bottom penalty area */}
      <rect x={penX} y={100 - pad - penH} width={penW} height={penH} fill="none" {...lp} strokeWidth={0.35 * (compact ? 0.85 : 1)} />
      <rect x={sixX} y={100 - pad - sixH} width={sixW} height={sixH} fill="none" {...lp} strokeWidth={0.32 * (compact ? 0.85 : 1)} />
      <circle cx={50} cy={spotYBot} r={0.7} fill={W} />
      <path
        d={`M ${50 - arcR} ${100 - pad - penH} A ${arcR} ${arcR} 0 0 1 ${50 + arcR} ${100 - pad - penH}`}
        fill="none"
        {...lp}
        strokeWidth={0.35 * (compact ? 0.85 : 1)}
      />
      {/* Corner arcs */}
      {[
        [pad, pad, 0],
        [100 - pad, pad, 90],
        [pad, 100 - pad, 270],
        [100 - pad, 100 - pad, 180],
      ].map(([cx, cy, rot], i) => (
        <path
          key={i}
          d={`M ${cx} ${Number(cy) + 1.2} A 1.2 1.2 0 0 ${rot === 270 || rot === 0 ? 1 : 0} ${rot === 0 ? Number(cx) + 1.2 : rot === 90 ? Number(cx) : rot === 180 ? Number(cx) - 1.2 : Number(cx)} ${cy}`}
          fill="none"
          stroke={W_SOFT}
          strokeWidth={0.28}
          strokeLinecap="round"
        />
      ))}
      {/* Goals (subtle) */}
      <rect x={44} y={pad - 0.6} width={12} height={0.8} fill={W_FAINT} rx={0.2} />
      <rect x={44} y={100 - pad - 0.2} width={12} height={0.8} fill={W_FAINT} rx={0.2} />
    </>
  );
}

function HockeyPitch({ compact }: { compact: boolean }) {
  const lp = lineProps(compact);
  const pad = 2;
  const circleR = 14.6;
  return (
    <>
      <rect x={pad} y={pad} width={100 - pad * 2} height={100 - pad * 2} fill="none" {...lp} strokeWidth={0.42 * (compact ? 0.85 : 1)} />
      <line x1={pad} y1={50} x2={100 - pad} y2={50} {...lp} />
      <circle cx={50} cy={50} r={circleR} fill="none" {...lp} />
      <circle cx={50} cy={50} r={0.65} fill={W} />
      <rect x={30} y={pad} width={40} height={13} fill="none" {...lp} strokeWidth={0.35 * (compact ? 0.85 : 1)} />
      <rect x={30} y={100 - pad - 13} width={40} height={13} fill="none" {...lp} strokeWidth={0.35 * (compact ? 0.85 : 1)} />
      <circle cx={50} cy={pad + 6} r={0.65} fill={W} />
      <circle cx={50} cy={100 - pad - 6} r={0.65} fill={W} />
    </>
  );
}

function GaaRugbyPitch({ layoutId, compact }: { layoutId: "gaa" | "rugby"; compact: boolean }) {
  const lp = lineProps(compact);
  const pad = 2;
  const boxH = layoutId === "gaa" ? 12 : 14;
  const boxW = layoutId === "gaa" ? 52 : 48;
  const x = (100 - boxW) / 2;
  return (
    <>
      <rect x={pad} y={pad} width={100 - pad * 2} height={100 - pad * 2} fill="none" {...lp} strokeWidth={0.42 * (compact ? 0.85 : 1)} />
      <line x1={pad} y1={50} x2={100 - pad} y2={50} {...lp} />
      <circle cx={50} cy={50} r={layoutId === "gaa" ? 10 : 8.5} fill="none" {...lp} />
      <circle cx={50} cy={50} r={0.65} fill={W} />
      <rect x={x} y={pad} width={boxW} height={boxH} fill="none" {...lp} strokeWidth={0.35 * (compact ? 0.85 : 1)} />
      <rect x={x} y={100 - pad - boxH} width={boxW} height={boxH} fill="none" {...lp} strokeWidth={0.35 * (compact ? 0.85 : 1)} />
      {layoutId === "rugby" && (
        <>
          <line x1={pad} y1={22} x2={100 - pad} y2={22} stroke={W_SOFT} strokeWidth={0.22} strokeDasharray="2.5 2" />
          <line x1={pad} y1={78} x2={100 - pad} y2={78} stroke={W_SOFT} strokeWidth={0.22} strokeDasharray="2.5 2" />
          <line x1={pad} y1={35} x2={100 - pad} y2={35} stroke={W_FAINT} strokeWidth={0.18} />
          <line x1={pad} y1={65} x2={100 - pad} y2={65} stroke={W_FAINT} strokeWidth={0.18} />
        </>
      )}
      {layoutId === "gaa" && (
        <>
          <line x1={pad} y1={20} x2={100 - pad} y2={20} stroke={W_FAINT} strokeWidth={0.18} />
          <line x1={pad} y1={80} x2={100 - pad} y2={80} stroke={W_FAINT} strokeWidth={0.18} />
        </>
      )}
    </>
  );
}

function BasketballCourt({ compact }: { compact: boolean }) {
  const lp = lineProps(compact);
  const pad = 2;
  return (
    <>
      <rect x={pad} y={pad} width={100 - pad * 2} height={100 - pad * 2} fill="none" {...lp} strokeWidth={0.42 * (compact ? 0.85 : 1)} />
      <line x1={pad} y1={50} x2={100 - pad} y2={50} {...lp} />
      <circle cx={50} cy={50} r={14} fill="none" {...lp} />
      <circle cx={50} cy={50} r={0.65} fill={W} />
      <path d={`M ${28} ${pad} Q 50 ${pad + 12} 72 ${pad}`} fill="none" {...lp} strokeWidth={0.35 * (compact ? 0.85 : 1)} />
      <path d={`M ${28} ${100 - pad} Q 50 ${100 - pad - 12} 72 ${100 - pad}`} fill="none" {...lp} strokeWidth={0.35 * (compact ? 0.85 : 1)} />
      <rect x={38} y={pad} width={24} height={12} fill="none" stroke={W_SOFT} strokeWidth={0.3} />
      <rect x={38} y={100 - pad - 12} width={24} height={12} fill="none" stroke={W_SOFT} strokeWidth={0.3} />
      <circle cx={50} cy={pad + 14} r={0.55} fill={W_SOFT} />
      <circle cx={50} cy={100 - pad - 14} r={0.55} fill={W_SOFT} />
    </>
  );
}

/** Sport-specific surface markings (SVG, viewBox 0–100). */
export default function PitchSurface({ layoutId, className = "", compact = false }: Props) {
  const svgProps = {
    className: `pro-tactical-markings ${className}`.trim(),
    viewBox: "0 0 100 100",
    preserveAspectRatio: "none" as const,
    "aria-hidden": true as const,
  };

  let body: ReactNode = null;

  if (layoutId === "football") body = <FootballPitch compact={compact} />;
  else if (layoutId === "hockey") body = <HockeyPitch compact={compact} />;
  else if (layoutId === "gaa" || layoutId === "rugby") body = <GaaRugbyPitch layoutId={layoutId} compact={compact} />;
  else if (layoutId === "basketball") body = <BasketballCourt compact={compact} />;
  else if (layoutId === "volleyball") {
    const lp = lineProps(compact);
    const pad = 2;
    body = (
      <>
        <rect x={pad} y={pad} width={100 - pad * 2} height={100 - pad * 2} fill="none" {...lp} strokeWidth={0.42 * (compact ? 0.85 : 1)} />
        <line x1={pad} y1={50} x2={100 - pad} y2={50} stroke={W} strokeWidth={0.5 * (compact ? 0.85 : 1)} />
        <line x1={50} y1={pad} x2={50} y2={100 - pad} stroke={W_SOFT} strokeWidth={0.22} strokeDasharray="2 2" />
        <line x1={pad} y1={28} x2={100 - pad} y2={28} stroke={W_SOFT} strokeWidth={0.22} />
        <line x1={pad} y1={72} x2={100 - pad} y2={72} stroke={W_SOFT} strokeWidth={0.22} />
        <circle cx={50} cy={50} r={0.55} fill={W} />
      </>
    );
  } else if (layoutId === "handball") {
    const lp = lineProps(compact);
    const pad = 2;
    body = (
      <>
        <rect x={pad} y={pad} width={100 - pad * 2} height={100 - pad * 2} fill="none" {...lp} strokeWidth={0.42 * (compact ? 0.85 : 1)} />
        <line x1={pad} y1={50} x2={100 - pad} y2={50} {...lp} />
        <path d={`M 50 ${pad} A 20 20 0 0 0 50 44`} fill="none" {...lp} />
        <path d={`M 50 ${100 - pad} A 20 20 0 0 1 50 56`} fill="none" {...lp} />
        <line x1={pad} y1={16} x2={100 - pad} y2={16} stroke={W_SOFT} strokeWidth={0.22} strokeDasharray="2 2" />
        <line x1={pad} y1={84} x2={100 - pad} y2={84} stroke={W_SOFT} strokeWidth={0.22} strokeDasharray="2 2" />
      </>
    );
  } else if (layoutId === "water_polo") {
    const lp = lineProps(compact);
    const pad = 2;
    body = (
      <>
        <rect x={pad} y={pad} width={100 - pad * 2} height={100 - pad * 2} fill="none" {...lp} strokeWidth={0.42 * (compact ? 0.85 : 1)} />
        <line x1={pad} y1={50} x2={100 - pad} y2={50} {...lp} />
        {[22, 35, 65, 78].map((y) => (
          <line key={y} x1={pad} y1={y} x2={100 - pad} y2={y} stroke={W_FAINT} strokeWidth={0.18} />
        ))}
        <rect x={42} y={pad} width={16} height={5} fill="none" stroke={W} strokeWidth={0.35} />
        <rect x={42} y={100 - pad - 5} width={16} height={5} fill="none" stroke={W} strokeWidth={0.35} />
      </>
    );
  } else if (layoutId === "american_football") {
    const lp = lineProps(compact);
    const pad = 2;
    body = (
      <>
        <rect x={pad} y={pad} width={100 - pad * 2} height={100 - pad * 2} fill="none" {...lp} strokeWidth={0.42 * (compact ? 0.85 : 1)} />
        {Array.from({ length: 11 }, (_, i) => {
          const y = 6 + i * 8.2;
          return (
            <line
              key={y}
              x1={pad}
              y1={y}
              x2={100 - pad}
              y2={y}
              stroke={i % 5 === 0 ? W : W_SOFT}
              strokeWidth={i % 5 === 0 ? 0.35 : 0.18}
            />
          );
        })}
        <line x1={50} y1={pad} x2={50} y2={100 - pad} stroke={W_FAINT} strokeWidth={0.18} strokeDasharray="2 2" />
        <rect x={44} y={pad} width={12} height={7} fill="none" stroke={W} strokeWidth={0.35} />
        <rect x={44} y={100 - pad - 7} width={12} height={7} fill="none" stroke={W} strokeWidth={0.35} />
      </>
    );
  } else if (layoutId === "baseball") {
    const lp = lineProps(compact);
    body = (
      <>
        <polygon points="50,16 78,50 50,84 22,50" fill="none" {...lp} strokeWidth={0.42 * (compact ? 0.85 : 1)} />
        <circle cx={50} cy={50} r={3.5} fill="none" stroke={W_SOFT} strokeWidth={0.3} />
        <path d="M 22 50 Q 36 68 50 84" fill="none" stroke={W_SOFT} strokeWidth={0.28} />
        <path d="M 78 50 Q 64 68 50 84" fill="none" stroke={W_SOFT} strokeWidth={0.28} />
        <path d="M 50 46 L 50 84" stroke={W_FAINT} strokeWidth={0.22} strokeDasharray="1.5 1.5" />
        {[22, 78].map((x) => (
          <rect key={x} x={x - 1.5} y={48.5} width={3} height={3} fill="none" stroke={W_SOFT} strokeWidth={0.25} />
        ))}
      </>
    );
  } else if (layoutId === "cricket") {
    body = (
      <>
        <ellipse cx={50} cy={50} rx={46} ry={46} fill="none" stroke={W} strokeWidth={0.38} />
        <ellipse cx={50} cy={50} rx={30} ry={30} fill="none" stroke={W_SOFT} strokeWidth={0.22} strokeDasharray="2.5 2" />
        <rect x={47} y={40} width={6} height={20} fill="none" stroke={W} strokeWidth={0.4} rx={0.3} />
        <circle cx={50} cy={50} r={0.75} fill={W} />
      </>
    );
  } else if (layoutId === "tennis") {
    const lp = lineProps(compact);
    const pad = 2;
    body = (
      <>
        <rect x={8} y={pad} width={84} height={100 - pad * 2} fill="none" {...lp} strokeWidth={0.42 * (compact ? 0.85 : 1)} />
        <line x1={8} y1={50} x2={92} y2={50} stroke={W} strokeWidth={0.45 * (compact ? 0.85 : 1)} />
        <line x1={50} y1={pad} x2={50} y2={100 - pad} stroke={W_SOFT} strokeWidth={0.22} strokeDasharray="2 2" />
        <rect x={22} y={pad} width={56} height={100 - pad * 2} fill="none" stroke={W_SOFT} strokeWidth={0.28} />
        <line x1={22} y1={28} x2={78} y2={28} stroke={W_SOFT} strokeWidth={0.22} />
        <line x1={22} y1={72} x2={78} y2={72} stroke={W_SOFT} strokeWidth={0.22} />
      </>
    );
  }

  if (!body) return null;

  return (
    <svg {...svgProps}>
      <SvgDefs />
      {body}
    </svg>
  );
}

export function layoutSurfaceClass(layoutId: SportTacticalLayoutId): string {
  return `pro-tactical-pitch--${layoutId.replace(/_/g, "-")}`;
}

/** Map role abbreviation to token colour group (FIFA-style). */
export function roleTokenClass(role: string): string {
  const r = role.toUpperCase().trim();
  if (r === "GK" || r.includes("GOAL")) return "pro-tactical-token__disc--gk";
  if (/^(CB|LB|RB|LWB|RWB|FB|DB|SW|DF)/.test(r)) return "pro-tactical-token__disc--def";
  if (/^(ST|CF|LW|RW|LF|RF|FF|FW|SS)/.test(r)) return "pro-tactical-token__disc--fwd";
  if (/^(HB|CM|CDM|CAM|LM|RM|MF|AM|DM|M)/.test(r)) return "pro-tactical-token__disc--mid";
  return "pro-tactical-token__disc--default";
}
