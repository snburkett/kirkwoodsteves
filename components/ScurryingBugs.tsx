"use client";

import {
  useEffect,
  useRef,
  useState,
  useCallback,
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
  waveId: number;
  resolved?: boolean;
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
  "🐛": 135,
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

const PASSIVE_MIN_WAVE_DELAY = 16000;
const PASSIVE_MAX_WAVE_DELAY = 24000;
const MAX_BUGS_PER_WAVE = 5;
const SPEED_SCALE_FLOOR = 0.7;
const DELAY_FLOOR = 1800;
const ACTIVE_DURATION_SCALE = 0.6;
const ACTIVE_MIN_DURATION = 2200;
const ACTIVE_BASE_MIN_DELAY = 2500;
const ACTIVE_BASE_MAX_DELAY = 3500;
const SCORE_KEY = "ks_bug_score";

interface DifficultyState {
  bugsPerWave: number;
  speedScale: number;
  minDelay: number;
  maxDelay: number;
  streak: number;
}

interface WaveState {
  remaining: number;
  id: number;
}

function createInitialDifficulty(): DifficultyState {
  return {
    bugsPerWave: 1,
    speedScale: 1,
    minDelay: ACTIVE_BASE_MIN_DELAY,
    maxDelay: ACTIVE_BASE_MAX_DELAY,
    streak: 0,
  };
}

function createInitialWaveState(): WaveState {
  return { remaining: 0, id: 0 };
}

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
  const difficultyRef = useRef<DifficultyState>(createInitialDifficulty());
  const waveStateRef = useRef<WaveState>(createInitialWaveState());
  const gameOverRef = useRef(false);
  const gameStartedRef = useRef(false);
  const playingRef = useRef(false);
  const [gameOver, setGameOver] = useState(false);
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

  const updateHighScore = useCallback((candidate: number) => {
    if (candidate <= highScoreRef.current) return;
    highScoreRef.current = candidate;
    setHighScore(candidate);
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(SCORE_KEY, String(candidate));
      }
    } catch (error) {
      console.warn("Unable to persist bug high score", error);
    }
  }, []);

  const clearScheduled = useCallback(() => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const resetDifficulty = useCallback(() => {
    difficultyRef.current = createInitialDifficulty();
    waveStateRef.current = { remaining: 0, id: waveStateRef.current.id + 1 };
    gameStartedRef.current = false;
  }, []);

  const advanceDifficulty = useCallback(() => {
    const state = difficultyRef.current;
    state.streak += 1;
    if (state.streak % 3 === 0 && state.bugsPerWave < MAX_BUGS_PER_WAVE) {
      state.bugsPerWave += 1;
    }
    state.speedScale = Math.max(SPEED_SCALE_FLOOR, state.speedScale * 0.97);
    state.minDelay = Math.max(DELAY_FLOOR, state.minDelay * 0.96);
    const nextMax = state.maxDelay * 0.94;
    state.maxDelay = Math.max(state.minDelay + 600, nextMax);
  }, []);

  const spawnWaveRef = useRef<() => void>(() => {});

  const scheduleNextWave = useCallback(
    (delayOverride?: number) => {
      if (prefersReducedMotion || gameOverRef.current) return;
      clearScheduled();
      const playing = playingRef.current;
      let delay = delayOverride;

      if (delay == null) {
        if (playing) {
          const state = difficultyRef.current;
          const minDelay = Math.max(ACTIVE_BASE_MIN_DELAY, state.minDelay);
          const maxDelay = Math.max(minDelay + 400, state.maxDelay);
          delay = randomBetween(minDelay, maxDelay);
        } else {
          delay = randomBetween(PASSIVE_MIN_WAVE_DELAY, PASSIVE_MAX_WAVE_DELAY);
        }
      }

      if (delay == null) {
        delay = PASSIVE_MIN_WAVE_DELAY;
      }
      timeoutRef.current = window.setTimeout(() => {
        spawnWaveRef.current();
      }, delay);
    },
    [prefersReducedMotion, clearScheduled],
  );

  const triggerGameOver = useCallback(() => {
    if (gameOverRef.current) return;
    gameOverRef.current = true;
    clearScheduled();
    updateHighScore(score);
    setGameOver(true);

    playGameOverSound(audioContextRef);

    bugsRef.current.forEach((bug) => bug.styleElement.remove());
    bugsRef.current = [];
    setBugs([]);

    resetDifficulty();
    playingRef.current = false;
    gameStartedRef.current = false;
    setShowScore(false);
  }, [clearScheduled, resetDifficulty, score, updateHighScore]);

  const handleBugResolved = useCallback(
    (waveId: number, squished: boolean) => {
      const waveState = waveStateRef.current;
      if (waveId !== waveState.id) return;
      if (waveState.remaining > 0) {
        waveState.remaining -= 1;
        const isPlaying = playingRef.current;
        if (!squished) {
          if (isPlaying) {
            triggerGameOver();
          } else if (waveState.remaining === 0 && !gameOverRef.current) {
            scheduleNextWave();
          }
          return;
        }
        if (waveState.remaining === 0 && !gameOverRef.current) {
          if (!isPlaying) {
            scheduleNextWave();
            return;
          }
          if (!gameStartedRef.current) {
            gameStartedRef.current = true;
            difficultyRef.current = createInitialDifficulty();
            scheduleNextWave(1500);
            return;
          }
          advanceDifficulty();
          scheduleNextWave();
        }
      }
    },
    [advanceDifficulty, scheduleNextWave, triggerGameOver],
  );

  const spawnWave = useCallback(() => {
    if (prefersReducedMotion || gameOverRef.current) return;
    const difficulty = difficultyRef.current;
    const isPlaying = playingRef.current;
    const bugCount = isPlaying ? Math.max(1, difficulty.bugsPerWave) : 1;
    const waveId = waveStateRef.current.id + 1;
    waveStateRef.current = { remaining: bugCount, id: waveId };

    const newBugs: BugInstance[] = [];
    let previousEmoji: BugEmoji | undefined;

    for (let i = 0; i < bugCount; i += 1) {
      const emoji = pickBugEmoji(previousEmoji);
      previousEmoji = emoji;

      const behavior = BUG_BEHAVIOR[emoji] ?? DEFAULT_BEHAVIOR;
      const baseDuration = randomBetween(behavior.minDuration, behavior.maxDuration);
      const durationScale = isPlaying
        ? Math.max(SPEED_SCALE_FLOOR * ACTIVE_DURATION_SCALE, difficulty.speedScale * ACTIVE_DURATION_SCALE)
        : 1;
      const minDuration = isPlaying ? ACTIVE_MIN_DURATION : 2500;
      const duration = Math.max(minDuration, baseDuration * durationScale);
      const path = makePath({
        stepMultiplier: behavior.stepMultiplier,
        curveVariance: behavior.curveVariance,
      });
      const orientationOffset = BUG_ORIENTATION_OFFSET[emoji] ?? 0;
      const { name, element, startTransform } = createKeyframes(path, orientationOffset);
      const delay = i === 0 ? 0 : randomBetween(180, 520) * i;
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
        waveId,
        squished: false,
        resolved: false,
      });

      window.setTimeout(() => {
        element.remove();
      }, duration + delay + 2000);

    }

    setBugs((current) => [...current, ...newBugs]);
  }, [prefersReducedMotion]);

  useEffect(() => {
    spawnWaveRef.current = spawnWave;
  }, [spawnWave]);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        clearScheduled();
        return;
      }

      if (prefersReducedMotion || gameOverRef.current) return;
      if (bugsRef.current.length > 0) return;
      if (timeoutRef.current !== null) return;

      scheduleNextWave(800);
    };

    const handleIdle = () => {
      if (prefersReducedMotion || gameOverRef.current) return;
      if (document.visibilityState === "hidden") return;
      if (bugsRef.current.length > 0) return;
      if (timeoutRef.current !== null) return;

      scheduleNextWave();
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleVisibility);
    const idleTimer = window.setInterval(handleIdle, PASSIVE_MAX_WAVE_DELAY + 2000);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleVisibility);
      window.clearInterval(idleTimer);
    };
  }, [clearScheduled, scheduleNextWave, prefersReducedMotion]);

  const handleBugAnimationEnd = useCallback(
    (bugId: number) => {
      const escapingBug = bugsRef.current.find((item) => item.id === bugId);
      if (!escapingBug) return;
      if (escapingBug.resolved || escapingBug.squished || gameOverRef.current) return;

      bugsRef.current = bugsRef.current.filter((item) => item.id !== bugId);
      setBugs((current) => current.filter((item) => item.id !== bugId));
      handleBugResolved(escapingBug.waveId, false);
    },
    [handleBugResolved],
  );

  useEffect(() => {
    return () => {
      clearScheduled();
      bugsRef.current.forEach((bug) => {
        bug.styleElement.remove();
      });
      bugsRef.current = [];
    };
  }, [clearScheduled]);

  useEffect(() => {
    if (prefersReducedMotion) {
      clearScheduled();
      setBugs([]);
      setScore(0);
      setShowScore(false);
      resetDifficulty();
      gameOverRef.current = false;
      playingRef.current = false;
      gameStartedRef.current = false;
      bugsRef.current = [];
      setGameOver(false);
      return;
    }
    scheduleNextWave();
    return () => {
      clearScheduled();
    };
  }, [prefersReducedMotion, clearScheduled, resetDifficulty, scheduleNextWave]);

  const handleDismissGameOver = useCallback(() => {
    setGameOver(false);
    setShowScore(false);
    setScore(0);
    gameOverRef.current = false;
    playingRef.current = false;
    gameStartedRef.current = false;
    difficultyRef.current = createInitialDifficulty();
    waveStateRef.current = createInitialWaveState();
    clearScheduled();
    scheduleNextWave();
  }, [clearScheduled, scheduleNextWave]);

  const handleRestartGame = useCallback(() => {
    if (prefersReducedMotion) return;
    setGameOver(false);
    setScore(0);
    setShowScore(false);
    clearScheduled();
    bugsRef.current = [];
    setBugs([]);
    gameOverRef.current = false;
    playingRef.current = true;
    gameStartedRef.current = false;
    difficultyRef.current = createInitialDifficulty();
    waveStateRef.current = createInitialWaveState();
    spawnWave();
  }, [prefersReducedMotion, clearScheduled, spawnWave]);

  if (prefersReducedMotion) {
    return null;
  }

  const commitSquish = (bugId: number, target: HTMLSpanElement) => {
    const match = bugsRef.current.find((bug) => bug.id === bugId);
    if (!match || match.squished) return;

    const computed = window.getComputedStyle(target);
    const frozen = computed.transform !== "none" ? computed.transform : match.startTransform;
    match.styleElement.remove();
    match.squished = true;
    match.resolved = true;

    if (!playingRef.current) {
      playingRef.current = true;
      gameStartedRef.current = false;
    }

    playSquishSound(audioContextRef);

    const originalEmoji = match.emoji as BugEmoji;
    const points = BUG_POINTS[originalEmoji] ?? 5;
    const waveId = match.waveId;
    setScore((current) => {
      const next = current + points;
      updateHighScore(next);
      return next;
    });
    setShowScore(true);

    setBugs((current) =>
      current.map((bug) =>
        bug.id === bugId
          ? { ...bug, squished: true, resolved: true, frozenTransform: frozen, emoji: "💥" }
          : bug,
      ),
    );

    handleBugResolved(waveId, true);

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
            <span className="mt-1 rounded-sm bg-white/85 px-2 py-0.5 text-[9px] font-semibold tracking-[0.32em] text-black">
              HI {formattedHighScore}
            </span>
          ) : null}
        </div>
      ) : null}

      {gameOver ? (
        <div className="pointer-events-auto fixed inset-0 z-[75] flex items-center justify-center bg-slate-950/85 backdrop-blur-sm">
          <div
            className="flex w-[min(320px,90vw)] flex-col items-center gap-4 rounded-lg border border-lime-200/35 bg-slate-950 px-6 py-5 text-center text-lime-200 shadow-[0_0_40px_rgba(148,163,184,0.35)]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="bugs-game-over-title"
            aria-describedby="bugs-game-over-body"
            style={{
              imageRendering: "pixelated",
              fontFamily: '"Press Start 2P", "VT323", "Share Tech Mono", monospace',
            }}
          >
            <div className="text-xs uppercase tracking-[0.45em] text-lime-200/70">Mission Failed</div>
            <div className="w-full rounded-md border border-lime-200/45 bg-black px-4 py-3 shadow-[inset_0_0_12px_rgba(163,230,53,0.35)]">
              <div
                id="bugs-game-over-title"
                className="text-3xl font-bold uppercase tracking-[0.48em] text-lime-300 drop-shadow-[0_0_6px_rgba(163,230,53,0.45)]"
              >
                Game Over
              </div>
            </div>
            <div
              id="bugs-game-over-body"
              className="grid w-full grid-cols-2 gap-3 text-left text-[10px] font-semibold uppercase tracking-[0.35em] text-lime-200/80"
            >
              <div className="rounded-sm border border-lime-400/45 bg-slate-950/90 px-3 py-2">
                <div className="text-lime-400/70">Your Score</div>
                <div className="mt-2 font-mono text-2xl tracking-[0.32em] text-lime-200">{formattedScore}</div>
              </div>
              <div className="rounded-sm border border-lime-400/45 bg-slate-950/90 px-3 py-2">
                <div className="text-lime-400/70">Hi Score</div>
                <div className="mt-2 font-mono text-2xl tracking-[0.32em] text-lime-200">
                  {formattedHighScore ?? formattedScore}
                </div>
              </div>
            </div>
            <div className="flex w-full gap-3">
              <button
                type="button"
                onClick={handleRestartGame}
                className="flex-1 rounded-sm border border-lime-300/70 bg-lime-300/20 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-lime-100 shadow-[0_0_12px_rgba(163,230,53,0.45)] transition hover:bg-lime-300/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300/70"
              >
                Play Again
              </button>
              <button
                type="button"
                onClick={handleDismissGameOver}
                className="flex-1 rounded-sm border border-slate-400/60 bg-slate-800/60 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-200 transition hover:bg-slate-700/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200/60"
              >
                Dismiss
              </button>
            </div>
          </div>
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
          onAnimationEnd={() => handleBugAnimationEnd(bug.id)}
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

function playGameOverSound(audioContextRef: MutableRefObject<AudioContext | null>) {
  try {
    const Ctor = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctor) return;

    const ctx = audioContextRef.current ?? new Ctor();
    audioContextRef.current = ctx;

    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(660, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.5);

    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate);
    const channel = noiseBuffer.getChannelData(0);
    for (let i = 0; i < channel.length; i += 1) {
      channel[i] = (Math.random() * 2 - 1) * Math.exp(-i / (channel.length * 0.6));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.4, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.3, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.5, now);
    master.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc.connect(oscGain);
    noise.connect(noiseGain);
    oscGain.connect(master);
    noiseGain.connect(master);
    master.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.6);
    noise.start(now);
    noise.stop(now + 0.4);
  } catch (error) {
    console.warn("Unable to play game over sound", error);
  }
}
