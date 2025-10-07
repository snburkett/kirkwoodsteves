import type { CSSProperties } from "react";

import type { PulseVibe } from "@/lib/pulse";

type VibeVariant = "full" | "compact";

interface VibeOMeterProps {
  vibe: PulseVibe;
  updatedAt?: string | null;
  windowHours?: number;
  storiesFeatured?: number;
  variant?: VibeVariant;
  className?: string;
}

function clampScore(score: number): number {
  if (Number.isNaN(score)) {
    return 0;
  }
  return Math.max(0, Math.min(100, score));
}

function vibePalette(score: number) {
  if (score >= 70) {
    return {
      surface: "#fff7ed",
      surfaceAccent: "#fde68a",
      accent: "#f97316",
      accentSecondary: "#fb923c",
      stripe: "rgba(255,255,255,0.35)",
      highlight: "rgba(249,115,22,0.35)",
      text: "text-orange-700",
    };
  }
  if (score >= 40) {
    return {
      surface: "#ecfeff",
      surfaceAccent: "#bae6fd",
      accent: "#0ea5e9",
      accentSecondary: "#6366f1",
      stripe: "rgba(255,255,255,0.3)",
      highlight: "rgba(14,165,233,0.35)",
      text: "text-sky-700",
    };
  }
  return {
    surface: "#fdf2f8",
    surfaceAccent: "#fce7f3",
    accent: "#ec4899",
    accentSecondary: "#fb7185",
    stripe: "rgba(255,255,255,0.35)",
    highlight: "rgba(236,72,153,0.35)",
    text: "text-rose-700",
  };
}

function formatTimestamp(timestamp?: string | null): string | null {
  if (!timestamp) {
    return null;
  }

  try {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  } catch {
    return null;
  }
}

export default function VibeOMeter({
  vibe,
  updatedAt,
  windowHours,
  storiesFeatured,
  variant = "full",
  className = "",
}: VibeOMeterProps) {
  const score = clampScore(vibe.score ?? 0);
  const palette = vibePalette(score);
  const formattedUpdated = formatTimestamp(updatedAt);

  const containerStyle: CSSProperties = {
    backgroundImage: `linear-gradient(135deg, ${palette.surface} 0%, ${palette.surfaceAccent} 100%)`,
  };

  const stripesStyle: CSSProperties = {
    backgroundImage: `repeating-linear-gradient(135deg, transparent 0px, transparent 18px, ${palette.stripe} 18px, ${palette.stripe} 36px)`,
  };

  const meterStyle: CSSProperties = {
    width: `${score}%`,
    backgroundImage: `linear-gradient(90deg, ${palette.accent}, ${palette.accentSecondary})`,
  };

  const highlightStyle: CSSProperties = {
    background: `radial-gradient(circle at center, ${palette.highlight}, transparent 65%)`,
  };

  const baseClasses = [
    "relative overflow-hidden border border-slate-200 shadow-lg",
    variant === "compact" ? "rounded-2xl p-5" : "rounded-3xl p-7",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const layoutClasses =
    variant === "compact"
      ? "flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"
      : "flex flex-col gap-6 md:flex-row md:items-center md:justify-between";

  const scoreCircleSize = variant === "compact" ? "h-20 w-20" : "h-28 w-28";
  const rationaleClass = variant === "compact" ? "text-sm" : "text-base";

  return (
    <div className={baseClasses} style={containerStyle}>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-40" style={stripesStyle} />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-28 top-1/2 h-64 w-64 -translate-y-1/2 blur-3xl"
        style={highlightStyle}
      />
      <div className={`relative ${layoutClasses}`}>
        <div className="flex-1 space-y-4">
          <div className="inline-flex items-center rounded-full border border-white/50 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-slate-600 shadow-sm">
            Vibe-O-Meter
          </div>
          <p className={`text-2xl font-black uppercase tracking-wide text-slate-900 sm:text-3xl`}>
            {vibe.label}
          </p>
          <div className="space-y-3">
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/60 shadow-inner">
              <div className="h-full rounded-full shadow-sm" style={meterStyle} />
            </div>
            <div className="flex justify-between text-[10px] font-semibold uppercase tracking-[0.35em] text-slate-500">
              <span>Calm</span>
              <span>Charged</span>
            </div>
          </div>
          <p className={`${rationaleClass} max-w-prose text-slate-700`}>{vibe.rationale}</p>
          <div className="flex flex-wrap gap-4 text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">
            {storiesFeatured !== undefined ? <span>{storiesFeatured} stories</span> : null}
            {windowHours ? <span>Window {windowHours}h</span> : null}
            {formattedUpdated ? <span>Updated {formattedUpdated}</span> : null}
          </div>
        </div>
        <div
          className={`mt-4 flex shrink-0 flex-col items-center gap-3 sm:mt-0 ${variant === "compact" ? "sm:items-end" : ""}`}
        >
          <div className={`relative ${scoreCircleSize}`}>
            <div
              aria-hidden="true"
              className="absolute inset-0 rounded-full opacity-80 shadow-md"
              style={{ background: `linear-gradient(135deg, ${palette.accent}, ${palette.accentSecondary})` }}
            />
            <div className="absolute inset-[12%] rounded-full bg-white/90 shadow-inner" />
            <div className="relative flex h-full w-full items-center justify-center">
              <span className="text-3xl font-black text-slate-900">{score}</span>
            </div>
          </div>
          <span className={`text-xs font-semibold uppercase tracking-[0.35em] ${palette.text}`}>
            Score / 100
          </span>
          {variant !== "compact" ? (
            <span className="text-[10px] font-semibold uppercase tracking-[0.4em] text-slate-500">
              Raw sentiment {vibe.raw_score ?? score}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
