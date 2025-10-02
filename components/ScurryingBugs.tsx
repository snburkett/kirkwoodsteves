"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type PointerEvent as ReactPointerEvent,
  type MouseEvent as ReactMouseEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

type BugInstance = {
  id: number;
  emoji: string;
  animationName: string;
  duration: number;
  delay: number;
  styleElement: HTMLStyleElement;
  size: number;
  startTransform: string;
  squished?: boolean;
  frozenTransform?: string;
};

const BUG_EMOJIS = ["🐞", "🪲", "🕷️", "🐜", "🐛", "🦟", "🦂"] as const;
type BugEmoji = (typeof BUG_EMOJIS)[number];

interface BugBehavior {
  minDuration: number;
  maxDuration: number;
  stepMultiplier?: number;
  curveVariance?: number;
}

const DEFAULT_BEHAVIOR: BugBehavior = {
  minDuration: 7500,
  maxDuration: 13500,
  stepMultiplier: 1,
  curveVariance: 0.35,
};

const BUG_BEHAVIOR: Record<BugEmoji, BugBehavior> = {
  "🐞": { minDuration: 13500, maxDuration: 19500, stepMultiplier: 0.9, curveVariance: 0.26 },
  "🪲": { minDuration: 14500, maxDuration: 21500, stepMultiplier: 0.95, curveVariance: 0.28 },
  "🕷️": { minDuration: 11500, maxDuration: 17000, stepMultiplier: 1.15, curveVariance: 0.33 },
  "🐜": { minDuration: 10500, maxDuration: 15000, stepMultiplier: 1.35, curveVariance: 0.36 },
  "🐛": { minDuration: 22000, maxDuration: 32000, stepMultiplier: 0.7, curveVariance: 0.18 },
  "🦟": { minDuration: 8000, maxDuration: 11500, stepMultiplier: 1.55, curveVariance: 0.42 },
  "🦂": { minDuration: 15000, maxDuration: 22000, stepMultiplier: 0.8, curveVariance: 0.22 },
};

const BUG_ORIENTATION_OFFSET: Record<BugEmoji, number> = {
  "🐞": 90,
  "🪲": 90,
  "🕷️": 90,
  "🐜": 180,
  "🐛": 90,
  "🦟": 180,
  "🦂": -90,
};

const BUG_POINTS: Record<BugEmoji, number> = (() => {
  const entries = Object.entries(BUG_BEHAVIOR) as Array<[BugEmoji, BugBehavior]>;
  const averages = entries.map(([, behavior]) => (behavior.minDuration + behavior.maxDuration) / 2);
  const minAvg = Math.min(...averages);
  const maxAvg = Math.max(...averages);
  const spread = maxAvg - minAvg || 1;
  const minPoints = 5;
  const maxPoints = 35;

  const result = {} as Record<BugEmoji, number>;
  entries.forEach(([emoji, behavior]) => {
    const avg = (behavior.minDuration + behavior.maxDuration) / 2;
    const normalized = (maxAvg - avg) / spread;
    const rawPoints = minPoints + normalized * (maxPoints - minPoints);
    const points = Math.max(minPoints, Math.min(maxPoints, Math.round(rawPoints / 5) * 5));
    result[emoji] = points;
  });

  return result;
})();

const MIN_WAVE_DELAY = 14000;
const MAX_WAVE_DELAY = 32000;
const MIN_BUGS = 1;
const MAX_BUGS = 3;
const SCORE_KEY = "ks_bug_score";

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickBugEmoji(previous?: BugEmoji): BugEmoji {
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
  curveVariance: number;
};

type PathOptions = {
  stepMultiplier?: number;
  curveVariance?: number;
};

function makePath(options?: PathOptions): PathDefinition {
  const stepMultiplier = options?.stepMultiplier ?? 1;
  const curveVariance = options?.curveVariance ?? DEFAULT_BEHAVIOR.curveVariance ?? 0.35;
  const edges = ["top", "right", "bottom", "left"] as const;
  const startEdge = edges[randomInt(0, edges.length - 1)];
  const exitEdge = edges[randomInt(0, edges.length - 1)];

  const start: Point = getEdgePoint(startEdge, true);
  const end: Point = getEdgePoint(exitEdge, false);

  const baseSteps = randomInt(2, 4);
  const stepsCount = Math.max(2, Math.round(baseSteps * stepMultiplier));
  const steps: Point[] = [];
  for (let i = 0; i < stepsCount; i += 1) {
    steps.push({
      x: randomBetween(10, 90),
      y: randomBetween(12, 88),
    });
  }

  return { start, steps, end, curveVariance };
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

function createKeyframes(path: PathDefinition, orientationOffset = 0) {
  const name = `bug-scurries-${animationCounter++}`;
  const style = document.createElement("style");

  const stepParts: string[] = [];
  const points = createSmoothPoints(path);
  const totalSteps = points.length;
  points.forEach((point, index) => {
    const progress = (index / (totalSteps - 1)) * 100;
    const heading = getHeading(points, index) + orientationOffset;
    stepParts.push(
      `${progress.toFixed(2)}% { transform: ${pointToTransform(point, heading)}; }`,
    );
  });

  style.textContent = `@keyframes ${name} { ${stepParts.join(" ")} }`;
  document.head.appendChild(style);

  const startHeading = getHeading(points, 0) + orientationOffset;
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
    const variance = path.curveVariance ?? DEFAULT_BEHAVIOR.curveVariance ?? 0.35;
    const curveStrength = randomBetween(-variance, variance);
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
  const audioContextRef = useRef<AudioContext | null>(null);
  const highScoreRef = useRef(0);
  const bugIdRef = useRef(0);
  const [score, setScore] = useState(0);
  const [showScore, setShowScore] = useState(false);
  const [highScore, setHighScore] = useState(0);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    bugsRef.current = bugs;
  }, [bugs]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(SCORE_KEY);
      const parsed = stored ? Number.parseInt(stored, 10) : 0;
      if (!Number.isNaN(parsed) && parsed > 0) {
        highScoreRef.current = parsed;
        setHighScore(parsed);
      }
    } catch (error) {
      console.warn("Unable to load bug high score", error);
    }
  }, []);

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
      let previousEmoji: BugEmoji | undefined;

      for (let i = 0; i < bugCount; i += 1) {
        const emoji = pickBugEmoji(previousEmoji);
        previousEmoji = emoji;

        const behavior = BUG_BEHAVIOR[emoji] ?? DEFAULT_BEHAVIOR;
        const duration = randomBetween(behavior.minDuration, behavior.maxDuration);
        const path = makePath({
          stepMultiplier: behavior.stepMultiplier,
          curveVariance: behavior.curveVariance,
        });
        const orientationOffset = BUG_ORIENTATION_OFFSET[emoji] ?? 0;
        const { name, element, startTransform } = createKeyframes(path, orientationOffset);
        const delay = i === 0 ? 0 : randomBetween(120, 600) * i;
        const size = randomBetween(0.85, 1.25);

        const bugId = bugIdRef.current++;

        newBugs.push({
          id: bugId,
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

  const commitSquish = (bugId: number, target: HTMLSpanElement) => {
    const match = bugsRef.current.find((bug) => bug.id === bugId);
    if (!match || match.squished) return;

    const computed = window.getComputedStyle(target);
    const frozen = computed.transform !== "none" ? computed.transform : match.startTransform;
    match.styleElement.remove();

    playSquishSound(audioContextRef);

    const originalEmoji = match.emoji as BugEmoji;
    const points = BUG_POINTS[originalEmoji] ?? 5;
    setScore((current) => {
      const next = current + points;
      if (next > highScoreRef.current) {
        highScoreRef.current = next;
        setHighScore(next);
        try {
          if (typeof window !== "undefined") {
            window.localStorage.setItem(SCORE_KEY, String(next));
          }
        } catch (error) {
          console.warn("Unable to persist bug high score", error);
        }
      }
      return next;
    });
    setShowScore(true);

    setBugs((current) =>
      current.map((bug) =>
        bug.id === bugId
          ? { ...bug, squished: true, frozenTransform: frozen, emoji: "💥" }
          : bug,
      ),
    );

    window.setTimeout(() => {
      setBugs((current) => current.map((bug) => (bug.id === bugId ? { ...bug, emoji: "" } : bug)));
    }, 1200);

    window.setTimeout(() => {
      setBugs((current) => current.filter((bug) => bug.id !== bugId));
    }, 2000);
  };

  const handlePointerSquish = (
    event: ReactPointerEvent<HTMLSpanElement> | ReactMouseEvent<HTMLSpanElement>,
    bugId: number,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    commitSquish(bugId, event.currentTarget);
  };

  const handleKeySquish = (event: ReactKeyboardEvent<HTMLSpanElement>, bugId: number) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    commitSquish(bugId, event.currentTarget);
  };

  const formattedScore = score.toString().padStart(5, "0");
  const formattedHighScore = highScore > 0 ? highScore.toString().padStart(5, "0") : null;

  return (
    <>
      {showScore ? (
        <div className="pointer-events-none fixed top-3 right-3 z-[70] flex flex-col items-end text-lime-300">
          <span className="text-[9px] font-semibold tracking-[0.45em] text-lime-400/80">SCORE</span>
          <div
            className="mt-1 rounded-sm border border-lime-400/35 bg-slate-950/80 px-3 py-0.5 font-mono text-2xl tracking-[0.28em] text-lime-300 shadow-[0_0_10px_rgba(163,230,53,0.2)]"
            role="status"
            aria-live="polite"
          >
            {formattedScore}
          </div>
          {formattedHighScore ? (
            <span className="mt-1 pr-0.5 text-[9px] font-semibold tracking-[0.32em] text-black/80">
              HI {formattedHighScore}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="pointer-events-none fixed inset-0 z-[60] overflow-visible">
      {bugs.map((bug) => (
        <span
          key={bug.id}
          className="absolute left-0 top-0 select-none"
          role="button"
          aria-label="Squish bug"
          tabIndex={0}
          style={{
            animation: bug.squished
              ? "none"
              : `${bug.animationName} ${bug.duration}ms linear ${bug.delay}ms forwards`,
            transform: bug.squished
              ? `${bug.frozenTransform ?? bug.startTransform} scale(0.55)`
              : bug.startTransform,
            fontSize: `${bug.size * 1.65}rem`,
            filter: "drop-shadow(0 2px 2px rgba(15, 23, 42, 0.35))",
            pointerEvents: "auto",
            cursor: "pointer",
            transition: bug.squished ? "transform 0.2s ease-out, opacity 0.2s ease-out" : undefined,
            opacity: bug.squished ? 0.3 : 1,
          }}
          onPointerDown={(event) => handlePointerSquish(event, bug.id)}
          onClick={(event) => handlePointerSquish(event, bug.id)}
          onKeyDown={(event) => handleKeySquish(event, bug.id)}
        >
          {bug.emoji}
        </span>
      ))}
      </div>
    </>
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

function playSquishSound(audioContextRef: MutableRefObject<AudioContext | null>) {
  try {
    const Ctor = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctor) return;

    const ctx = audioContextRef.current ?? new Ctor();
    audioContextRef.current = ctx;

    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    const burst = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate);
    const data = burst.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (data.length * 0.55));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = burst;

    const osc = ctx.createOscillator();
    osc.type = "square";
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.18);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.6, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);

    const toneGain = ctx.createGain();
    toneGain.gain.setValueAtTime(0.35, now);
    toneGain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.5, now);
    master.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    noise.connect(noiseGain);
    noiseGain.connect(master);
    osc.connect(toneGain);
    toneGain.connect(master);
    master.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + 0.25);
    osc.start(now);
    osc.stop(now + 0.3);
  } catch (error) {
    console.warn("Unable to play squish sound", error);
  }
}
