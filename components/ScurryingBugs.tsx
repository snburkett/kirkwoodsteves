"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type BugInstance = {
  id: number;
  emoji: string;
  animationName: string;
  duration: number;
  delay: number;
  styleElement: HTMLStyleElement;
  size: number;
  startTransform: string;
};

const BUG_EMOJIS = ["🐞", "🪲", "🕷️", "🐜", "🐛", "🦟", "🦂"];

const MIN_WAVE_DELAY = 14000;
const MAX_WAVE_DELAY = 32000;
const MIN_DURATION = 6000;
const MAX_DURATION = 10500;
const MIN_BUGS = 1;
const MAX_BUGS = 3;

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickBugEmoji(previous?: string) {
  const choice = BUG_EMOJIS[randomInt(0, BUG_EMOJIS.length - 1)];
  if (choice === previous) {
    return pickBugEmoji(choice);
  }
  return choice;
}

type Point = { x: number; y: number };

type PathDefinition = {
  start: Point;
  steps: Point[];
  end: Point;
};

function makePath(): PathDefinition {
  const edges = ["top", "right", "bottom", "left"] as const;
  const startEdge = edges[randomInt(0, edges.length - 1)];
  const exitEdge = edges[randomInt(0, edges.length - 1)];

  const start: Point = getEdgePoint(startEdge, true);
  const end: Point = getEdgePoint(exitEdge, false);

  const stepsCount = randomInt(2, 4);
  const steps: Point[] = [];
  for (let i = 0; i < stepsCount; i += 1) {
    steps.push({
      x: randomBetween(10, 90),
      y: randomBetween(12, 88),
    });
  }

  return { start, steps, end };
}

function getEdgePoint(edge: "top" | "right" | "bottom" | "left", isEntry: boolean): Point {
  switch (edge) {
    case "top":
      return { x: randomBetween(5, 95), y: isEntry ? -8 : -12 };
    case "bottom":
      return { x: randomBetween(5, 95), y: isEntry ? 108 : 112 };
    case "left":
      return { x: isEntry ? -8 : -12, y: randomBetween(5, 95) };
    case "right":
    default:
      return { x: isEntry ? 108 : 112, y: randomBetween(5, 95) };
  }
}

let animationCounter = 0;

function createKeyframes(path: PathDefinition) {
  const name = `bug-scurries-${animationCounter++}`;
  const style = document.createElement("style");

  const stepParts: string[] = [];
  const points = createSmoothPoints(path);
  const totalSteps = points.length;
  points.forEach((point, index) => {
    const progress = (index / (totalSteps - 1)) * 100;
    const heading = getHeading(points, index);
    stepParts.push(
      `${progress.toFixed(2)}% { transform: ${pointToTransform(point, heading)}; }`,
    );
  });

  style.textContent = `@keyframes ${name} { ${stepParts.join(" ")} }`;
  document.head.appendChild(style);

  const startHeading = getHeading(points, 0);
  return { name, element: style, startTransform: pointToTransform(path.start, startHeading) };
}

function pointToTransform(point: Point, heading: number) {
  return `translate(${point.x}vw, ${point.y}vh) rotate(${heading}deg)`;
}

function getHeading(points: Point[], index: number) {
  const current = points[index];
  const target = points[Math.min(index + 1, points.length - 1)];
  const dx = target.x - current.x;
  const dy = target.y - current.y;
  if (dx === 0 && dy === 0 && index > 0) {
    const prev = points[index - 1];
    return Math.atan2(current.y - prev.y, current.x - prev.x) * (180 / Math.PI);
  }
  return Math.atan2(dy, dx) * (180 / Math.PI);
}

function createSmoothPoints(path: PathDefinition) {
  const raw = [path.start, ...path.steps, path.end];
  const sampled: Point[] = [raw[0]];

  for (let i = 0; i < raw.length - 1; i += 1) {
    const current = raw[i];
    const next = raw[i + 1];
    const dx = next.x - current.x;
    const dy = next.y - current.y;
    const distance = Math.hypot(dx, dy) || 1;
    const normalX = -dy / distance;
    const normalY = dx / distance;
    const curveStrength = randomBetween(-0.35, 0.35);
    const offset = distance * 0.45 * curveStrength;
    const control = {
      x: (current.x + next.x) / 2 + normalX * offset,
      y: (current.y + next.y) / 2 + normalY * offset,
    };

    const subdivisions = 4;
    for (let step = 1; step < subdivisions; step += 1) {
      const t = step / subdivisions;
      sampled.push(sampleQuadratic(current, control, next, t));
    }

    sampled.push(next);
  }

  return sampled;
}

function sampleQuadratic(p0: Point, p1: Point, p2: Point, t: number): Point {
  const oneMinus = 1 - t;
  const x = oneMinus * oneMinus * p0.x + 2 * oneMinus * t * p1.x + t * t * p2.x;
  const y = oneMinus * oneMinus * p0.y + 2 * oneMinus * t * p1.y + t * t * p2.y;
  return { x, y };
}

export default function ScurryingBugs() {
  const [bugs, setBugs] = useState<BugInstance[]>([]);
  const bugsRef = useRef<BugInstance[]>([]);
  const timeoutRef = useRef<number | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    bugsRef.current = bugs;
  }, [bugs]);

  const clearScheduled = () => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const spawnWave = useMemo(() => {
    return () => {
      if (prefersReducedMotion) return;
    const bugCount = randomInt(MIN_BUGS, MAX_BUGS);
    const newBugs: BugInstance[] = [];
    let previousEmoji: string | undefined;

    for (let i = 0; i < bugCount; i += 1) {
      const duration = randomBetween(MIN_DURATION, MAX_DURATION);
      const path = makePath();
      const { name, element, startTransform } = createKeyframes(path);
      const delay = i === 0 ? 0 : randomBetween(120, 600) * i;
      const size = randomBetween(0.85, 1.25);

      const emoji = pickBugEmoji(previousEmoji);
      previousEmoji = emoji;

      newBugs.push({
        id: animationCounter,
        emoji,
        animationName: name,
        duration,
        delay,
        styleElement: element,
        size,
        startTransform,
      });

      window.setTimeout(() => {
        element.remove();
      }, duration + delay + 2000);
    }

    setBugs((current) => [...current, ...newBugs]);

    newBugs.forEach((bug) => {
      window.setTimeout(() => {
        if (!mountedRef.current) return;
        setBugs((current) => current.filter((item) => item.id !== bug.id));
      }, bug.duration + bug.delay);
    });
  };
  }, [prefersReducedMotion]);

  const scheduleNextWave = useMemo(() => {
    return () => {
      if (prefersReducedMotion) return;
      const delay = randomBetween(MIN_WAVE_DELAY, MAX_WAVE_DELAY);
      timeoutRef.current = window.setTimeout(() => {
        spawnWave();
        scheduleNextWave();
      }, delay);
    };
  }, [prefersReducedMotion, spawnWave]);

  useEffect(() => {
    return () => {
      clearScheduled();
      bugsRef.current.forEach((bug) => {
        bug.styleElement.remove();
      });
      bugsRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) {
      return () => {};
    }
    spawnWave();
    scheduleNextWave();
    return () => {
      clearScheduled();
    };
  }, [prefersReducedMotion, scheduleNextWave, spawnWave]);

  if (prefersReducedMotion || bugs.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-visible">
      {bugs.map((bug) => (
        <span
          key={bug.id}
          className="absolute left-0 top-0 select-none"
          style={{
            animation: `${bug.animationName} ${bug.duration}ms linear ${bug.delay}ms forwards`,
            transform: bug.startTransform,
            fontSize: `${bug.size * 1.65}rem`,
            filter: "drop-shadow(0 2px 2px rgba(15, 23, 42, 0.35))",
          }}
        >
          {bug.emoji}
        </span>
      ))}
    </div>
  );
}

function usePrefersReducedMotion() {
  const [prefers, setPrefers] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefers(query.matches);
    const handler = (event: MediaQueryListEvent) => {
      setPrefers(event.matches);
    };
    query.addEventListener("change", handler);
    return () => query.removeEventListener("change", handler);
  }, []);

  return prefers;
}
