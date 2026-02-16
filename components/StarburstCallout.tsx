"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import type { ReactNode } from "react";

import SpeechBubbleTooltip from "@/components/SpeechBubbleTooltip";

type StarburstVariant = "sunburst" | "punch" | "flare" | "nova" | "spark" | "flash";
function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    const chr = value.charCodeAt(index);
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }
  return Math.abs(hash) || 1;
}

function mulberry32(seed: number) {
  return function next() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateStarPolygon(seed: number): string {
  const rand = mulberry32(seed);
  const pointCount = 7 + Math.floor(rand() * 7); // 7-13
  const totalPoints = pointCount * 2;
  const outerBase = 46;
  const innerBase = 20;
  const points: string[] = [];
  const baseAngle = (Math.PI * 2) / totalPoints;

  for (let i = 0; i < totalPoints; i += 1) {
    const angleJitter = (rand() - 0.5) * baseAngle * 0.35;
    const angle = i * baseAngle + angleJitter - Math.PI / 2;
    const radiusBase = i % 2 === 0 ? outerBase : innerBase;
    const radius = radiusBase * (1 + (rand() - 0.5) * 0.35);
    const x = 50 + Math.cos(angle) * radius;
    const y = 50 + Math.sin(angle) * radius;
    const clampedX = Math.max(0, Math.min(100, x));
    const clampedY = Math.max(0, Math.min(100, y));
    points.push(`${clampedX.toFixed(2)}% ${clampedY.toFixed(2)}%`);
  }

  return `polygon(${points.join(", ")})`;
}

interface StarburstCalloutProps {
  href: string;
  label: string;
  ariaLabel?: string;
  imageSrc?: string;
  imageAlt?: string;
  subtitle?: string;
  variant?: StarburstVariant;
  backgroundColor?: string;
  textClassName?: string;
  children?: ReactNode;
  childClassName?: string;
  id?: string;
  dataAttributes?: Record<string, string>;
  hoverBubbleText?: string;
  hoverBubbleSize?: "small" | "default" | "big";
  onClick?: () => void;
}

export default function StarburstCallout({
  href,
  label,
  ariaLabel,
  imageSrc,
  imageAlt,
  subtitle,
  variant = "sunburst",
  backgroundColor = "#f97316",
  textClassName = "text-black",
  children,
  childClassName,
  id,
  dataAttributes,
  hoverBubbleText,
  hoverBubbleSize,
  onClick,
}: StarburstCalloutProps) {
  const clipPath = useMemo(() => {
    const hash = hashString(`${variant}-${label}`);
    return generateStarPolygon(hash + variant.length * 97);
  }, [label, variant]);

  const rotation = useMemo(() => {
    if (childClassName?.includes("rotate")) {
      return 0;
    }
    const base = hashString(`${label}-${variant}-tilt`);
    const rand = mulberry32(base + 13);
    return (rand() - 0.5) * 60; // approx -30deg to +30deg
  }, [label, variant, childClassName]);

  const isTextChild = typeof children === "string" || typeof children === "number";
  const overlayChild = isTextChild ? null : children;
  const textChild = isTextChild ? children : null;
  const textStroke = "rgba(255, 255, 255, 0.85)";
  const textStrokeWidth = 5;

  const rootClassName = "group relative block max-w-[200px] sm:max-w-[220px]";

  const content = (
      <div
        id={id}
        data-starburst-id={id}
        className="relative aspect-square w-full min-w-[200px] transition-transform duration-300 ease-out group-hover:-translate-y-1 group-hover:scale-[1.05] focus-within:ring-2 focus-within:ring-slate-200 sm:min-w-[220px] sm:scale-[0.95]"
        {...(dataAttributes ?? {})}
      >
        <div
          className="relative flex h-full w-full items-center justify-center p-6 text-left"
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              clipPath,
              WebkitClipPath: clipPath,
              backgroundColor,
            }}
          >
            <div
              aria-hidden="true"
              className="absolute inset-0 opacity-35 mix-blend-overlay"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(135deg, rgba(255,255,255,0.22) 0, rgba(255,255,255,0.22) 10px, transparent 10px, transparent 20px)",
              }}
            />
          </div>
          {imageSrc ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <Image
                src={imageSrc}
                alt={imageAlt ?? ""}
                fill
                sizes="240px"
                className="object-contain drop-shadow-[0_12px_18px_rgba(15,23,42,0.35)] transition-transform duration-500 ease-out"
                style={{ transform: "scale(0.6)" }}
                priority={false}
              />
            </div>
          ) : null}
          {overlayChild ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div
                className={`max-w-[75%] transition-transform duration-300 ease-out ${childClassName ?? ""}`.trim()}
              >
                {overlayChild}
              </div>
            </div>
          ) : null}
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox="0 0 200 200"
            aria-hidden="true"
          >
            <defs>
              <path id="starburst-top" d="M 18 57 Q 120 0 182 69" />
              <path id="starburst-bottom" d="M 18 148 Q 120 222 182 140" />
              <path id="starburst-bottom-inner" d="M 26 166 Q 120 216 174 154" />
            </defs>
            <text
              className={`text-[18px] font-black uppercase tracking-[0.35em] ${textClassName}`}
              stroke={textStroke}
              strokeWidth={textStrokeWidth}
              style={{ paintOrder: "stroke fill" }}
            >
              <textPath xlinkHref="#starburst-top" startOffset="50%" textAnchor="middle">
                {label}
              </textPath>
            </text>
            {subtitle ? (
              <text
                className={`text-[12px] font-semibold uppercase tracking-[0.35em] ${textClassName}`}
                stroke={textStroke}
                strokeWidth={textStrokeWidth}
                style={{ paintOrder: "stroke fill" }}
              >
                <textPath xlinkHref="#starburst-bottom" startOffset="50%" textAnchor="middle">
                  {subtitle}
                </textPath>
              </text>
            ) : null}
            {textChild ? (
              <text
                className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-800"
                stroke={textStroke}
                strokeWidth={textStrokeWidth}
                style={{ paintOrder: "stroke fill" }}
              >
                <textPath xlinkHref="#starburst-bottom-inner" startOffset="50%" textAnchor="middle">
                  {textChild}
                </textPath>
              </text>
            ) : null}
          </svg>
        </div>
      </div>
  );

  const core = onClick ? (
    <button type="button" aria-label={ariaLabel ?? label} className={rootClassName} onClick={onClick}>
      {content}
    </button>
  ) : (
    <Link
      href={href}
      aria-label={ariaLabel ?? label}
      className={rootClassName}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
    >
      {content}
    </Link>
  );

  const derivedBubbleSize =
    hoverBubbleSize ?? (hoverBubbleText && hoverBubbleText.length > 20 ? "big" : "default");

  return hoverBubbleText ? (
    <SpeechBubbleTooltip
      text={hoverBubbleText}
      placement="top"
      className="block w-max"
      size={derivedBubbleSize}
    >
      {core}
    </SpeechBubbleTooltip>
  ) : (
    core
  );
}
