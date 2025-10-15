"use client";

import type { CSSProperties, ReactNode } from "react";
import { useState } from "react";

type SpeechBubblePlacement = "top" | "right";

export type SpeechBubbleSize = "small" | "default" | "big";

interface SpeechBubbleTooltipProps {
  text: string;
  children: ReactNode;
  placement?: SpeechBubblePlacement;
  size?: SpeechBubbleSize;
  className?: string;
  bubbleClassName?: string;
  style?: CSSProperties;
}

const SIZE_DELTAS: Record<SpeechBubbleSize, number> = {
  small: -10,
  default: 0,
  big: 10,
};

const BASE_VIEWBOX_WIDTH = 220;
const BASE_BOTTOM_START = 55;
const BASE_BOTTOM_CURVE = 65;
const BASE_BOTTOM = 70;
const BASE_TAIL_OFFSET = 20;
const BASE_TOP_ENTRY_Y = 20;
const BASE_TOP_CONTROL_Y = 10;
const BASE_TOP_EDGE_Y = 5;
const BASE_FOREIGN_OBJECT_Y = 18;
const BASE_FOREIGN_OBJECT_HEIGHT = 40;
const BASE_VIEWBOX_HEIGHT = BASE_BOTTOM + BASE_TAIL_OFFSET + 10; // includes tail margin

function createBubblePath(delta: number): string {
  const bottomStart = BASE_BOTTOM_START + delta;
  const bottomCurve = BASE_BOTTOM_CURVE + delta;
  const bottom = BASE_BOTTOM + delta;
  const tailTip = bottom + BASE_TAIL_OFFSET;

  return `
    M 20 ${BASE_TOP_ENTRY_Y}
    C 20 ${BASE_TOP_CONTROL_Y} 30 ${BASE_TOP_EDGE_Y} 45 ${BASE_TOP_EDGE_Y}
    L 175 ${BASE_TOP_EDGE_Y}
    C 190 ${BASE_TOP_EDGE_Y} 200 ${BASE_TOP_CONTROL_Y} 200 ${BASE_TOP_ENTRY_Y}
    L 200 ${bottomStart}
    C 200 ${bottomCurve} 190 ${bottom} 175 ${bottom}
    L 60 ${bottom}
    L 35 ${tailTip}
    L 40 ${bottom}
    L 45 ${bottom}
    C 30 ${bottom} 20 ${bottomCurve} 20 ${bottomStart}
    Z
  `;
}

export default function SpeechBubbleTooltip({
  text,
  children,
  placement = "top",
  size = "default",
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

  const sizeDelta = SIZE_DELTAS[size] ?? 0;
  const bubblePath = createBubblePath(sizeDelta);

  const bottom = BASE_BOTTOM + sizeDelta;
  const tailTip = bottom + BASE_TAIL_OFFSET;
  const viewBoxHeight = tailTip + 10;
  const heightDifference = viewBoxHeight - BASE_VIEWBOX_HEIGHT;

  const svgHeight = viewBoxHeight;
  const foreignObjectHeight = Math.max(24, BASE_FOREIGN_OBJECT_HEIGHT + sizeDelta);
  const extraHeight = foreignObjectHeight - BASE_FOREIGN_OBJECT_HEIGHT;
  const foreignObjectY = BASE_FOREIGN_OBJECT_Y + (sizeDelta - extraHeight) / 4;

  const offsetStyles: CSSProperties =
    placement === "right"
      ? { marginLeft: "-40px", marginTop: `${-100 - heightDifference / 2}px` }
      : { marginTop: `${-40 - heightDifference / 2}px`, marginLeft: "20px" };

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
          <svg
            width={BASE_VIEWBOX_WIDTH}
            height={svgHeight}
            viewBox={`0 0 ${BASE_VIEWBOX_WIDTH} ${viewBoxHeight}`}
            className="drop-shadow-lg"
          >
            <path
              d={bubblePath}
              fill="white"
              stroke="black"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <foreignObject x="35" y={foreignObjectY} width="150" height={foreignObjectHeight}>
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
