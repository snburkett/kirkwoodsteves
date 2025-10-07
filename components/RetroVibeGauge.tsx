"use client";

import { useEffect, useMemo, useState } from "react";

interface RetroVibeGaugeProps {
  score?: number | null;
  rationale?: string;
  showTitle?: boolean;
  showLabels?: boolean;
  className?: string;
  compact?: boolean;
}

const clampScore = (value: number) => {
  if (Number.isNaN(value)) return 0;
  return Math.max(-100, Math.min(100, value));
};

function describeArc(cx: number, cy: number, radius: number, start: number, end: number) {
  const startAngle = ((start - 90) * Math.PI) / 180;
  const endAngle = ((end - 90) * Math.PI) / 180;
  const startX = cx + radius * Math.cos(startAngle);
  const startY = cy + radius * Math.sin(startAngle);
  const endX = cx + radius * Math.cos(endAngle);
  const endY = cy + radius * Math.sin(endAngle);
  const largeArcFlag = end - start <= 180 ? "0" : "1";
  return `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`;
}

const BAND_SEGMENTS = [
  { start: -90, end: -20, color: "#22c55e" },
  { start: -20, end: 30, color: "#facc15" },
  { start: 30, end: 90, color: "#ef4444" },
];

export default function RetroVibeGauge({
  score,
  rationale,
  showTitle = true,
  showLabels = true,
  className = "",
  compact = false,
}: RetroVibeGaugeProps) {
  const [angle, setAngle] = useState(0);
  const targetScore = clampScore(score ?? 0);
  const targetAngle = useMemo(() => {
    const ratio = (targetScore + 100) / 200;
    return ratio * 180;
  }, [targetScore]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setAngle(targetAngle);
    }, 50);
    return () => window.clearTimeout(timeout);
  }, [targetAngle]);

  const ticks = useMemo(() => {
    const steps = 7;
    return Array.from({ length: steps }, (_, index) => -90 + (index * 180) / (steps - 1));
  }, []);

  const baseContainer = compact
    ? "flex w-full flex-col items-center gap-2 border-0 bg-transparent px-0 py-0 shadow-none"
    : "flex w-full flex-col items-center gap-3 rounded-2xl border border-white/40 bg-white/80 px-4 py-5 shadow-lg backdrop-blur-sm";

  const containerClassName = [baseContainer, className].filter(Boolean).join(" ");

  return (
    <div className={containerClassName}>
      {showTitle ? (
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-slate-600">
          Kirkwood Vibe-O-Meter
        </p>
      ) : null}
      <div
        role="img"
        aria-label={`Vibe-O-Meter score ${targetScore}`}
        className={`relative w-full ${compact ? "" : showLabels ? "max-w-xs" : "max-w-md"}`}
      >
        <svg viewBox="0 0 240 150" className="w-full">
          <path
            d={describeArc(120, 120, 90, -90, 90)}
            stroke="rgba(15,23,42,0.12)"
            strokeWidth="20"
            fill="none"
            strokeLinecap="round"
          />
          {BAND_SEGMENTS.map((segment) => (
            <path
              key={`${segment.start}-${segment.end}`}
              d={describeArc(120, 120, 90, segment.start, segment.end)}
              stroke={segment.color}
              strokeWidth="14"
              fill="none"
              strokeLinecap="round"
            />
          ))}
          {ticks.map((tick) => {
            const angleRad = ((tick - 90) * Math.PI) / 180;
            const outerX = 120 + 82 * Math.cos(angleRad);
            const outerY = 120 + 82 * Math.sin(angleRad);
            const innerX = 120 + 66 * Math.cos(angleRad);
            const innerY = 120 + 66 * Math.sin(angleRad);
            return (
              <line
                key={tick}
                x1={innerX}
                y1={innerY}
                x2={outerX}
                y2={outerY}
                stroke="#0f172a"
                strokeWidth={tick % 60 === 0 ? 4 : 2}
              />
            );
          })}
          <circle cx="120" cy="120" r="10" fill="#0f172a" />
          <g
            style={{
              transformOrigin: "120px 120px",
              transform: `rotate(${angle - 90}deg)`,
              transition: "transform 0.9s cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          >
            <polygon
              points="120,36 112,120 128,120"
              fill="#1e293b"
              className="drop-shadow-[0_6px_12px_rgba(15,23,42,0.35)]"
            />
          </g>
        </svg>
        {showLabels ? (
          <div className="mt-2 flex w-full justify-between text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">
            <span>Janky</span>
            <span>Vibing</span>
          </div>
        ) : null}
      </div>
      {rationale ? (
        <p className="text-xs text-slate-600">{rationale}</p>
      ) : null}
    </div>
  );
}
