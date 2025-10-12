"use client";

import type { CSSProperties, ReactNode } from "react";
import { useState } from "react";

type SpeechBubblePlacement = "top" | "right";

interface SpeechBubbleTooltipProps {
  text: string;
  children: ReactNode;
  placement?: SpeechBubblePlacement;
  className?: string;
  bubbleClassName?: string;
  style?: CSSProperties;
}

const BUBBLE_PATH = `
  M 20 20
  C 20 10 30 5 45 5
  L 175 5
  C 190 5 200 10 200 20
  L 200 55
  C 200 65 190 70 175 70
  L 60 70
  L 35 90
  L 40 70
  L 45 70
  C 30 70 20 65 20 55
  Z
`;

export default function SpeechBubbleTooltip({
  text,
  children,
  placement = "top",
  className,
  bubbleClassName,
  style,
}: SpeechBubbleTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const containerClass = ["relative", className ?? "inline-block"].filter(Boolean).join(" ");
  const basePosition =
    placement === "right"
      ? "left-full top-1/2 -translate-y-1/2"
      : "top-0 left-1/2 -translate-x-1/2";

  const offsetStyles: CSSProperties =
    placement === "right"
      ? { marginLeft: "-40px", marginTop: "-100px" }
      : { marginTop: "-40px", marginLeft: "20px" };

  const bubbleWrapperClass = ["pointer-events-none absolute z-50 hidden sm:block", basePosition, bubbleClassName]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={containerClass}
      style={style}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocusCapture={() => setIsVisible(true)}
      onBlurCapture={() => setIsVisible(false)}
      onTouchStart={() => setIsVisible((prev) => !prev)}
    >
      {children}
      {isVisible ? (
        <div className={`${bubbleWrapperClass} animate-bubble-pop`} style={offsetStyles}>
          <svg width="220" height="100" viewBox="0 0 220 100" className="drop-shadow-lg">
            <path
              d={BUBBLE_PATH}
              fill="white"
              stroke="black"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <foreignObject x="35" y="18" width="150" height="40">
              <div className="flex h-full w-full items-center justify-center px-2 text-center text-sm font-semibold uppercase leading-tight tracking-wide text-slate-900">
                <span>{text}</span>
              </div>
            </foreignObject>
          </svg>
        </div>
      ) : null}
    </div>
  );
}
