"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useId,
  type KeyboardEvent,
  type FocusEvent,
  type PointerEvent,
} from "react";

import { brand, motion, wheelColors } from "../(theme)/tokens";
import type { SectionName } from "@/lib/types";

interface QuadrantWheelProps {
  size?: number;
  onSelect?: (section: SectionName) => void;
}

type Quadrant = {
  id: SectionName;
  label: string;
  color: string;
  icon: string;
  startAngle: number;
  endAngle: number;
};

type PowerUp = {
  id: number;
  x: number;
  y: number;
  section: SectionName;
};

const BASE_SPEED = motion.idleSpeed;
const SNAP_DURATION = 450; // ms
const MAX_HOVER_SPEED = motion.maxHoverSpeed;
const HOVER_ACCEL_PER_SEC = motion.hoverAcceleration;
const TOUCH_LONG_PRESS_THRESHOLD = 350;

const TOOLTIP_TEXT: Record<SectionName, string> = {
  emporium: "Retro tech & vinyl",
  pulse: "Kirkwood news",
  ai: "Posts & slides",
  oddities: "Weird & wonderful",
};

const QUADRANTS: Quadrant[] = [
  { id: "emporium", label: "Emporium", color: wheelColors[0], icon: "🛒", startAngle: 270, endAngle: 360 },
  { id: "pulse", label: "Kirkwood Pulse", color: wheelColors[1], icon: "📡", startAngle: 0, endAngle: 90 },
  { id: "ai", label: "AI", color: wheelColors[2], icon: "🤖", startAngle: 90, endAngle: 180 },
  { id: "oddities", label: "Oddities", color: wheelColors[3], icon: "🔮", startAngle: 180, endAngle: 270 },
];

export default function QuadrantWheel({ size = 240, onSelect }: QuadrantWheelProps) {
  const radius = size / 2;
  const svgCenter = useMemo(() => ({ x: radius, y: radius }), [radius]);

  const [scale, setScale] = useState(1);
  const [isHovering, setIsHovering] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionName | null>(null);
  const [focusedSection, setFocusedSection] = useState<SectionName | null>(null);
  const [tooltipTarget, setTooltipTarget] = useState<{
    quadrant: Quadrant;
    midAngle: number;
  } | null>(null);
  const [tooltipRender, setTooltipRender] = useState<{
    section: SectionName;
    x: number;
    y: number;
    text: string;
  } | null>(null);
  const [powerUps, setPowerUps] = useState<PowerUp[]>([]);

  const wheelRef = useRef<HTMLDivElement | null>(null);
  const requestRef = useRef<number | null>(null);
  const angleRef = useRef(0);
  const velocityRef = useRef(BASE_SPEED);
  const lastTimeRef = useRef<number | null>(null);
  const prefersReducedMotionRef = useRef(false);
  const hoverRef = useRef(false);
  const onSelectRef = useRef(onSelect);
  const glowTimeoutRef = useRef<number | null>(null);
  const snapStateRef = useRef<{
    from: number;
    to: number;
    start: number;
    section: SectionName;
  } | null>(null);
  const hoverStartRef = useRef<number | null>(null);
  const hoveredQuadrantRef = useRef<SectionName | null>(null);
  const hoverRotationRef = useRef(0);
  const powerUpIdRef = useRef(0);
  const powerUpTimersRef = useRef<Map<number, number>>(new Map());
  const audioContextRef = useRef<AudioContext | null>(null);
  const touchPressRef = useRef<{ pointerId: number; start: number } | null>(null);
  const suppressClickRef = useRef(false);
  const suppressResetTimerRef = useRef<number | null>(null);
  const touchHoldActiveRef = useRef(false);
  const touchHoldTimerRef = useRef<number | null>(null);
  const touchHoldTargetRef = useRef<SectionName | null>(null);

  const idPrefix = useId();

  const awardOneUp = useCallback(
    (section: SectionName) => {
      const quadrant = QUADRANTS.find((item) => item.id === section);
      if (!quadrant) return;
      const mid = midpointAngle(quadrant.startAngle, quadrant.endAngle);
      const globalAngle = normalizeAngle(mid + angleRef.current);
      const point = polarToCartesian(svgCenter.x, svgCenter.y, radius * 0.5, globalAngle);

      const id = powerUpIdRef.current++;
      setPowerUps((prev) => [...prev, { id, x: point.x, y: point.y, section }]);

      if (typeof window !== "undefined") {
        const timeoutId = window.setTimeout(() => {
          setPowerUps((current) => current.filter((item) => item.id !== id));
          powerUpTimersRef.current.delete(id);
        }, 2400);
        powerUpTimersRef.current.set(id, timeoutId);
      }

      playPowerUpSound();
    },
    [radius, svgCenter.x, svgCenter.y],
  );

  const getTargetVelocity = useCallback(
    (timestamp: number): number => {
      if (prefersReducedMotionRef.current) {
        return 0;
      }
      if (!hoverRef.current) {
        return BASE_SPEED;
      }
      if (hoverStartRef.current == null) {
        hoverStartRef.current = timestamp;
      }
      const hoverSeconds = Math.max(0, (timestamp - hoverStartRef.current) / 1000);
      const accelerated = BASE_SPEED + hoverSeconds * HOVER_ACCEL_PER_SEC;
      return Math.min(accelerated, MAX_HOVER_SPEED);
    },
    [],
  );

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => () => {
    powerUpTimersRef.current.forEach((timer) => {
      window.clearTimeout(timer);
    });
    powerUpTimersRef.current.clear();
    if (suppressResetTimerRef.current != null) {
      window.clearTimeout(suppressResetTimerRef.current);
      suppressResetTimerRef.current = null;
    }
    if (touchHoldTimerRef.current != null) {
      window.clearTimeout(touchHoldTimerRef.current);
      touchHoldTimerRef.current = null;
    }
  }, []);

  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    prefersReducedMotionRef.current = prefersReducedMotion;
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    if (prefersReducedMotion) {
      velocityRef.current = 0;
    } else {
      if (hoverRef.current) {
        hoverStartRef.current = hoverStartRef.current ?? now;
      }
      velocityRef.current = getTargetVelocity(now);
    }
    lastTimeRef.current = null;
  }, [getTargetVelocity, prefersReducedMotion]);

  useEffect(() => {
    hoverRef.current = isHovering;
    if (isHovering) {
      const now = typeof performance !== "undefined" ? performance.now() : Date.now();
      hoverStartRef.current = now;
    } else {
      hoverStartRef.current = null;
    }
    lastTimeRef.current = null;
  }, [isHovering]);

  const applyTransform = useCallback((angle: number) => {
    if (!wheelRef.current) return;
    wheelRef.current.style.transform = `rotate(${angle}deg)`;
  }, []);

  useEffect(() => {
    function tick(timestamp: number) {
      if (lastTimeRef.current == null) {
        lastTimeRef.current = timestamp;
      }
      const delta = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      const snap = snapStateRef.current;
      if (snap) {
        const elapsed = timestamp - snap.start;
        const progress = Math.min(elapsed / SNAP_DURATION, 1);
        const eased = easeOutCubic(progress);
        angleRef.current = snap.from + (snap.to - snap.from) * eased;
        if (progress >= 1) {
          snapStateRef.current = null;
          angleRef.current = normalizeAngle(angleRef.current);
          if (hoverRef.current && hoverStartRef.current == null) {
            hoverStartRef.current = timestamp;
          }
          velocityRef.current = getTargetVelocity(timestamp);
          if (onSelectRef.current) {
            onSelectRef.current(snap.section);
          }
          if (process.env.NODE_ENV !== "production") {
            console.log(`Quadrant selected: ${snap.section}`);
          }
        }
      } else {
        if (prefersReducedMotionRef.current) {
          velocityRef.current = 0;
        } else {
          if (!hoverRef.current) {
            hoverStartRef.current = null;
          }
          const targetVelocity = getTargetVelocity(timestamp);
          const smoothing = hoverRef.current ? 0.06 : 0.12;
          velocityRef.current += (targetVelocity - velocityRef.current) * smoothing;
          const rotationDelta = (velocityRef.current * delta) / 1000;
          angleRef.current = normalizeAngle(angleRef.current + rotationDelta);
          if (hoveredQuadrantRef.current && hoverRef.current && rotationDelta > 0) {
            hoverRotationRef.current += rotationDelta;
            while (hoverRotationRef.current >= 360) {
              hoverRotationRef.current -= 360;
              awardOneUp(hoveredQuadrantRef.current);
            }
          }
        }
      }

      applyTransform(angleRef.current);
      requestRef.current = requestAnimationFrame(tick);
    }

    requestRef.current = requestAnimationFrame(tick);
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
      if (glowTimeoutRef.current) {
        window.clearTimeout(glowTimeoutRef.current);
      }
    };
  }, [applyTransform, awardOneUp, getTargetVelocity]);

  useEffect(() => {
    applyTransform(angleRef.current);
  }, [applyTransform]);

  useEffect(() => {
    if (!tooltipTarget) {
      setTooltipRender(null);
      return;
    }

    let frame: number | null = null;
    const update = () => {
      const rotation = angleRef.current;
      const globalAngle = normalizeAngle(tooltipTarget.midAngle + rotation);
      const point = polarToCartesian(
        svgCenter.x,
        svgCenter.y,
        radius * 0.62,
        globalAngle,
      );

      setTooltipRender((current) => {
        if (
          current &&
          current.section === tooltipTarget.quadrant.id &&
          Math.abs(current.x - point.x) < 0.5 &&
          Math.abs(current.y - point.y) < 0.5
        ) {
          return current;
        }
        return {
          section: tooltipTarget.quadrant.id,
          x: point.x,
          y: point.y,
          text: TOOLTIP_TEXT[tooltipTarget.quadrant.id],
        };
      });

      frame = requestAnimationFrame(update);
    };

    update();

    return () => {
      if (frame) {
        cancelAnimationFrame(frame);
      }
    };
  }, [radius, svgCenter.x, svgCenter.y, tooltipTarget]);

  return (
    <div
      className="relative"
      style={{ width: size, height: size, touchAction: "none" }}
      onPointerEnter={(event) => {
        if (event.pointerType === "touch") return;
        beginHover();
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === "touch") {
          cancelTouchInteraction();
          return;
        }
        clearHoverState();
      }}
      onPointerDown={(event) => {
        if (event.pointerType !== "touch") return;
        beginHover();
        startTouchInteraction(event);
      }}
      onPointerUp={(event) => {
        if (event.pointerType !== "touch") return;
        endTouchInteraction(event);
      }}
      onPointerCancel={(event) => {
        if (event.pointerType !== "touch") return;
        cancelTouchInteraction();
      }}
    >
      <div
        className="relative flex h-full w-full items-center justify-center transition-transform duration-300 ease-out"
        style={{ transform: `scale(${scale})` }}
      >
        <div
          ref={wheelRef}
          className="h-full w-full"
          style={{ transformOrigin: "50% 50%" }}
        >
          <svg
            viewBox={`0 0 ${size} ${size}`}
            width={size}
            height={size}
            role="group"
            aria-roledescription="rotary selector"
          >
            <defs>
              <filter id={`${idPrefix}-labelShadow`} x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="1" stdDeviation="1.2" floodColor="rgba(0,0,0,0.45)" />
              </filter>
            </defs>
            {QUADRANTS.map((quadrant) => {
              const path = describeWedge(
                svgCenter.x,
                svgCenter.y,
                radius,
                quadrant.startAngle,
                quadrant.endAngle,
              );
              const mid = midpointAngle(quadrant.startAngle, quadrant.endAngle);
              const iconPoint = polarToCartesian(svgCenter.x, svgCenter.y, radius * 0.45, mid);
              const labelArcId = `${idPrefix}-${quadrant.id}-label`;
              const labelPath = describeArc(
                svgCenter.x,
                svgCenter.y,
                radius * 0.82,
                quadrant.startAngle,
                quadrant.endAngle,
              );
              const isActive = activeSection === quadrant.id;
              const isFocused = focusedSection === quadrant.id;

              return (
                <g
                  key={quadrant.id}
                  role="button"
                  aria-label={`Open ${quadrant.label}`}
                  tabIndex={0}
                  onKeyDown={(event) => handleKeyDown(event, quadrant, mid)}
                  onFocus={(event) => handleFocus(event, quadrant, mid)}
                  onBlur={(event) => handleBlur(event, quadrant)}
                  onPointerEnter={(event) => handlePointerEnter(event, quadrant, mid)}
                  onPointerLeave={(event) => handlePointerLeave(event, quadrant)}
                  onPointerDown={(event) => handleQuadrantPointerDown(event, quadrant, mid)}
                  style={{ outline: "none" }}
                >
                  <path
                    d={path}
                    fill={quadrant.color}
                    stroke="white"
                    strokeWidth={isActive || isFocused ? 3.5 : 2}
                    className="cursor-pointer transition-opacity hover:opacity-90"
                    style={{
                      outline: "none",
                      filter:
                        isActive || isFocused
                          ? "drop-shadow(0 0 8px rgba(255,255,255,0.9))"
                          : "none",
                    }}
                    onClick={() => handleQuadrantClick(quadrant)}
                  />
                  <path id={labelArcId} d={labelPath} fill="none" stroke="none" />
                  <g pointerEvents="none">
                    <text
                      x={iconPoint.x}
                      y={iconPoint.y}
                      textAnchor="middle"
                      alignmentBaseline="middle"
                      fontSize={radius * 0.24}
                      transform={`rotate(${mid} ${iconPoint.x} ${iconPoint.y})`}
                >
                  {quadrant.icon}
                </text>
                    <text
                      fontSize={radius * 0.14}
                      fontWeight={600}
                      fill="#ffffff"
                      textAnchor="middle"
                      filter={`url(#${idPrefix}-labelShadow)`}
                    >
                      <textPath href={`#${labelArcId}`} startOffset="50%">
                        {quadrant.label}
                      </textPath>
                    </text>
                  </g>
                </g>
              );
            })}
          </svg>
        </div>
        {tooltipRender ? (
          <div
            className="pointer-events-none absolute z-40 rounded-lg bg-slate-900/90 px-3 py-1 text-xs font-medium text-white shadow-lg ring-1 ring-black/20"
            style={{
              left: tooltipRender.x,
              top: tooltipRender.y,
              transform: "translate(-50%, -120%)",
              whiteSpace: "nowrap",
            }}
          >
            {tooltipRender.text}
          </div>
        ) : null}
        {powerUps.map((item) => (
          <div
            key={item.id}
            className="pointer-events-none absolute z-50 flex items-center gap-1 rounded-full border border-white/70 px-3 py-1 text-[0.7rem] font-semibold uppercase shadow-lg oneup-float"
            style={{
              left: item.x,
              top: item.y,
              backgroundColor: `${brand.secondary}66`,
              color: brand.neutrals.text,
            }}
          >
            <span>1&nbsp;UP</span>
            <span aria-hidden="true">🍄</span>
          </div>
        ))}
      </div>
    </div>
  );

  function beginHover() {
    setScale(1.03);
    setIsHovering(true);
    hoverStartRef.current = typeof performance !== "undefined" ? performance.now() : Date.now();
  }

  function clearHoverState() {
    setScale(1);
    setIsHovering(false);
    setTooltipTarget(null);
    setTooltipRender(null);
    hoverStartRef.current = null;
    hoveredQuadrantRef.current = null;
    hoverRotationRef.current = 0;
  }

  function startTouchInteraction(event: PointerEvent<HTMLDivElement>) {
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    touchPressRef.current = { pointerId: event.pointerId, start: now };
    suppressClickRef.current = false;
    touchHoldActiveRef.current = false;
    if (touchHoldTimerRef.current != null && typeof window !== "undefined") {
      window.clearTimeout(touchHoldTimerRef.current);
    }
    if (typeof window !== "undefined" && suppressResetTimerRef.current != null) {
      window.clearTimeout(suppressResetTimerRef.current);
      suppressResetTimerRef.current = null;
    }
    if (typeof window !== "undefined") {
      touchHoldTimerRef.current = window.setTimeout(() => {
        touchHoldActiveRef.current = true;
        if (process.env.NODE_ENV !== "production") {
          console.log("[QuadrantWheel] touch hold engaged", {
            section: touchHoldTargetRef.current,
          });
        }
        touchHoldTimerRef.current = null;
      }, TOUCH_LONG_PRESS_THRESHOLD);
    }
  }

  function endTouchInteraction(event: PointerEvent<HTMLDivElement>) {
    const interaction = touchPressRef.current;
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    const duration =
      interaction && interaction.pointerId === event.pointerId
        ? now - interaction.start
          : interaction
            ? now - interaction.start
            : 0;
    const longPress = duration >= TOUCH_LONG_PRESS_THRESHOLD;
    if (touchHoldTimerRef.current != null && typeof window !== "undefined") {
      window.clearTimeout(touchHoldTimerRef.current);
      touchHoldTimerRef.current = null;
    }
    if (longPress && !touchHoldActiveRef.current) {
      touchHoldActiveRef.current = true;
      if (process.env.NODE_ENV !== "production") {
        console.log("[QuadrantWheel] touch hold engaged (late)", {
          section: touchHoldTargetRef.current,
        });
      }
    }
    if (longPress) {
      suppressClickRef.current = true;
      if (typeof window !== "undefined") {
        if (suppressResetTimerRef.current != null) {
          window.clearTimeout(suppressResetTimerRef.current);
        }
        suppressResetTimerRef.current = window.setTimeout(() => {
          suppressClickRef.current = false;
          suppressResetTimerRef.current = null;
        }, 0);
      }
    } else {
      suppressClickRef.current = false;
    }
    if (process.env.NODE_ENV !== "production") {
      console.log("[QuadrantWheel] touch hold release", {
        section: touchHoldTargetRef.current,
        longPress,
        duration,
      });
    }
    touchPressRef.current = null;
    touchHoldActiveRef.current = false;
    touchHoldTargetRef.current = null;
    clearHoverState();
  }

  function cancelTouchInteraction() {
    touchPressRef.current = null;
    suppressClickRef.current = false;
    touchHoldActiveRef.current = false;
    if (process.env.NODE_ENV !== "production") {
      console.log("[QuadrantWheel] touch hold canceled", {
        section: touchHoldTargetRef.current,
      });
    }
    if (typeof window !== "undefined" && suppressResetTimerRef.current != null) {
      window.clearTimeout(suppressResetTimerRef.current);
      suppressResetTimerRef.current = null;
    }
    if (touchHoldTimerRef.current != null && typeof window !== "undefined") {
      window.clearTimeout(touchHoldTimerRef.current);
      touchHoldTimerRef.current = null;
    }
    touchHoldTargetRef.current = null;
    clearHoverState();
  }

  function handlePointerEnter(
    event: PointerEvent<SVGGElement>,
    quadrant: Quadrant,
    midAngle: number,
  ) {
    hoveredQuadrantRef.current = quadrant.id;
    hoverRotationRef.current = 0;
    hoverStartRef.current = typeof performance !== "undefined" ? performance.now() : Date.now();
    showTooltip(quadrant, midAngle);
    if (event.pointerType === "touch") {
      touchHoldTargetRef.current = quadrant.id;
    }
  }

  function handlePointerLeave(
    event: PointerEvent<SVGGElement>,
    quadrant: Quadrant,
  ) {
    if (hoveredQuadrantRef.current === quadrant.id) {
      hoveredQuadrantRef.current = null;
      hoverRotationRef.current = 0;
      hoverStartRef.current = null;
    }
    hideTooltip(quadrant);
    if (event.pointerType === "touch" && touchHoldTargetRef.current === quadrant.id) {
      touchHoldTargetRef.current = null;
    }
  }

  function handleQuadrantPointerDown(
    event: PointerEvent<SVGGElement>,
    quadrant: Quadrant,
    midAngle: number,
  ) {
    event.preventDefault();
    if (event.pointerType === "touch") {
      hoveredQuadrantRef.current = quadrant.id;
      hoverRotationRef.current = 0;
      hoverStartRef.current = typeof performance !== "undefined" ? performance.now() : Date.now();
      showTooltip(quadrant, midAngle);
      touchHoldTargetRef.current = quadrant.id;
    }
  }

  function handleKeyDown(
    event: KeyboardEvent<SVGGElement>,
    quadrant: Quadrant,
    midAngle: number,
  ) {
    if (event.key === "Enter" || event.key === " " || event.key === "Spacebar") {
      event.preventDefault();
      showTooltip(quadrant, midAngle);
      handleQuadrantClick(quadrant);
    }
  }

  function handleFocus(
    _event: FocusEvent<SVGGElement>,
    quadrant: Quadrant,
    midAngle: number,
  ) {
    setFocusedSection(quadrant.id);
    hoveredQuadrantRef.current = quadrant.id;
    hoverRotationRef.current = 0;
    hoverStartRef.current = typeof performance !== "undefined" ? performance.now() : Date.now();
    showTooltip(quadrant, midAngle);
  }

  function handleBlur(_event: FocusEvent<SVGGElement>, quadrant: Quadrant) {
    setFocusedSection((current) => (current === quadrant.id ? null : current));
    if (hoveredQuadrantRef.current === quadrant.id) {
      hoveredQuadrantRef.current = null;
      hoverRotationRef.current = 0;
      hoverStartRef.current = null;
    }
    hideTooltip(quadrant);
  }

  function handleQuadrantClick(quadrant: Quadrant) {
    if (snapStateRef.current) {
      return;
    }

    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      if (typeof window !== "undefined" && suppressResetTimerRef.current != null) {
        window.clearTimeout(suppressResetTimerRef.current);
        suppressResetTimerRef.current = null;
      }
      return;
    }

    if (glowTimeoutRef.current) {
      window.clearTimeout(glowTimeoutRef.current);
    }
    setActiveSection(quadrant.id);
    glowTimeoutRef.current = window.setTimeout(() => {
      setActiveSection((current) => (current === quadrant.id ? null : current));
    }, 600);

    if (hoveredQuadrantRef.current !== quadrant.id) {
      hoverRotationRef.current = 0;
      hoveredQuadrantRef.current = quadrant.id;
    }

    if (prefersReducedMotionRef.current) {
      onSelectRef.current?.(quadrant.id);
      if (process.env.NODE_ENV !== "production") {
        console.log(`Quadrant selected: ${quadrant.id}`);
      }
      return;
    }

    const current = angleRef.current;
    const mid = midpointAngle(quadrant.startAngle, quadrant.endAngle);
    const desired = normalizeAngle(-mid);
    const delta = shortestDifference(current, desired);
    const target = current + delta;

    snapStateRef.current = {
      from: current,
      to: target,
      start: performance.now(),
      section: quadrant.id,
    };
    velocityRef.current = 0;
    lastTimeRef.current = null;
  }

  function showTooltip(quadrant: Quadrant, midAngle: number) {
    setTooltipTarget({ quadrant, midAngle });
  }

  function hideTooltip(quadrant: Quadrant) {
    setTooltipTarget((current) => {
      if (!current) return null;
      if (current.quadrant.id !== quadrant.id) {
        return current;
      }
      setTooltipRender(null);
      return null;
    });
  }

  function playPowerUpSound() {
    if (typeof window === "undefined") return;
    const AudioContextCtor = window.AudioContext
      || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;

    const context = audioContextRef.current ?? new AudioContextCtor();
    audioContextRef.current = context;

    if (context.state === "suspended") {
      context.resume().catch(() => {});
    }

    const now = context.currentTime;
    const osc = context.createOscillator();
    const gain = context.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(523.25, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.25);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.28, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

    osc.connect(gain);
    gain.connect(context.destination);

    osc.start(now);
    osc.stop(now + 0.5);
  }
}

function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angleInDegrees: number,
) {
  const radians = ((angleInDegrees - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(radians),
    y: cy + radius * Math.sin(radians),
  };
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

  return [
    `M ${cx} ${cy}`,
    `L ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`,
    "Z",
  ].join(" ");
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

function midpointAngle(start: number, end: number) {
  const span = end - start;
  return start + span / 2;
}

function normalizeAngle(angle: number) {
  return ((angle % 360) + 360) % 360;
}

function shortestDifference(from: number, to: number) {
  const normalizedFrom = normalizeAngle(from);
  const normalizedTo = normalizeAngle(to);
  let diff = normalizedTo - normalizedFrom;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return diff;
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setPrefersReducedMotion(query.matches);
    updatePreference();
    query.addEventListener("change", updatePreference);
    return () => {
      query.removeEventListener("change", updatePreference);
    };
  }, []);

  return prefersReducedMotion;
}
