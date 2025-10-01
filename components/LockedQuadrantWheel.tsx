"use client";

import { Fragment, type KeyboardEvent, useMemo, type CSSProperties } from "react";
import { useRouter } from "next/navigation";

import { wheelColors } from "../app/(theme)/tokens";
import type { SectionName } from "@/lib/types";

interface LockedQuadrantWheelProps {
  size?: number;
  activeSection: SectionName;
  onSelect?: (section: SectionName) => void;
  onHome?: () => void;
  homeIconClassName?: string;
}

const targetAngle = 135;

const quadrants: Array<{
  id: SectionName;
  label: string;
  icon: string;
  color: string;
  startAngle: number;
  endAngle: number;
}> = [
  { id: "emporium", label: "Emporium", icon: "🛒", color: wheelColors[0], startAngle: 270, endAngle: 360 },
  { id: "pulse", label: "Pulse", icon: "📡", color: wheelColors[1], startAngle: 0, endAngle: 90 },
  { id: "ai", label: "AI", icon: "🤖", color: wheelColors[2], startAngle: 90, endAngle: 180 },
  { id: "oddities", label: "Oddities", icon: "🔮", color: wheelColors[3], startAngle: 180, endAngle: 270 },
];

export default function LockedQuadrantWheel({
  size = 220,
  activeSection,
  onSelect,
  onHome,
  homeIconClassName,
}: LockedQuadrantWheelProps) {
  const router = useRouter();

  const rotation = useMemo(() => {
    const match = quadrants.find((q) => q.id === activeSection);
    if (!match) return 0;
    return targetAngle - match.startAngle - 45;
  }, [activeSection]);

  const handleHome = () => {
    if (onHome) {
      onHome();
      return;
    }
    router.push("/");
  };

  return (
    <div
      className="relative select-none drop-shadow-2xl"
      style={{ width: size, height: size }}
    >
      <div
        className="relative h-full w-full transition-transform duration-500 ease-[cubic-bezier(.4,0,.2,1)]"
        style={{ transform: `rotate(${rotation}deg)` }}
      >
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 200 200"
          aria-hidden="true"
        >
          <defs>
            <filter id="locked-label-shadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="1" stdDeviation="1.2" floodColor="rgba(15,23,42,0.6)" />
            </filter>
          </defs>
          {quadrants.map((quadrant) => {
            const path = describeWedge(100, 100, 96, quadrant.startAngle, quadrant.endAngle);
            const isActive = quadrant.id === activeSection;
            const handleKeyDown = (event: KeyboardEvent<SVGPathElement>) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                if (!isActive) {
                  onSelect?.(quadrant.id);
                }
              }
            };

            return (
              <path
                key={quadrant.id}
                d={path}
                fill={quadrant.color}
                opacity={0.95}
                stroke="white"
                strokeWidth={isActive ? 4 : 2}
                className={isActive ? "cursor-default" : "cursor-pointer"}
                role="button"
                tabIndex={isActive ? -1 : 0}
                aria-label={`Open ${quadrant.label}`}
                aria-current={isActive ? "page" : undefined}
                onClick={() => {
                  if (!isActive) {
                    onSelect?.(quadrant.id);
                  }
                }}
                onKeyDown={handleKeyDown}
                onMouseDown={(event) => event.preventDefault()}
                style={{ outline: "none" }}
              />
            );
          })}
          <circle cx={100} cy={100} r={34} fill="rgba(255,255,255,0.96)" stroke="#1e293b" strokeWidth={1.5} />
          {quadrants.map((quadrant) => {
            const labelPathId = `locked-${quadrant.id}-label`;
            const labelPath = describeArc(100, 100, 78, quadrant.startAngle, quadrant.endAngle);
            const iconPoint = polarToCartesian(100, 100, 50, midpointAngle(quadrant.startAngle, quadrant.endAngle));

            return (
              <Fragment key={`${quadrant.id}-overlay`}>
                <path id={labelPathId} d={labelPath} fill="none" stroke="none" />
                <text
                  fontSize={13}
                  fontWeight={500}
                  fill="#ffffff"
                  style={{ pointerEvents: "none" }}
                  filter="url(#locked-label-shadow)"
                >
                  <textPath href={`#${labelPathId}`} startOffset="50%" textAnchor="middle">
                    {quadrant.label}
                  </textPath>
                </text>
                <text
                  x={iconPoint.x}
                  y={iconPoint.y}
                  fontSize={28}
                  textAnchor="middle"
                  style={{ pointerEvents: "none" }}
                  transform={`rotate(${midpointAngle(quadrant.startAngle, quadrant.endAngle)} ${iconPoint.x} ${iconPoint.y})`}
                >
                  {quadrant.icon}
                </text>
              </Fragment>
            );
          })}
        </svg>
      </div>

      <button
        type="button"
        onClick={handleHome}
        className={`absolute left-1/2 top-1/2 flex h-18 w-18 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-white text-slate-700 shadow-lg transition hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${homeIconClassName ?? "text-3xl"}`}
        style={{ transform: "translate(-50%, -50%)" }}
        aria-label="Back to home"
      >
        🏠
      </button>
    </div>
  );
}

function describeWedge(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number,
) {
  const start = polarToCartesian(cx, cy, radius, startAngle);
  const end = polarToCartesian(cx, cy, radius, endAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y} Z`;
}

function describeArc(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number,
) {
  const start = polarToCartesian(cx, cy, radius, startAngle);
  const end = polarToCartesian(cx, cy, radius, endAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
}

function polarToCartesian(cx: number, cy: number, radius: number, angle: number) {
  const radians = ((angle - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(radians),
    y: cy + radius * Math.sin(radians),
  };
}

function midpointAngle(start: number, end: number) {
  const span = end - start;
  return start + span / 2;
}

function getButtonPosition(angle: number): CSSProperties {
  const angleRad = (angle * Math.PI) / 180;
  const radius = 70;
  const cx = 100;
  const cy = 100;
  const x = cx + radius * Math.cos(angleRad);
  const y = cy + radius * Math.sin(angleRad);
  return {
    left: `${x / 2}%`,
    top: `${y / 2}%`,
  };
}
