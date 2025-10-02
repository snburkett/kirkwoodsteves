"use client";

import { useEffect, useRef, useState } from "react";

const MIN_DELAY = 12000;
const MAX_DELAY = 26000;
const RUN_DURATION = 21000;

export default function RollingTrain() {
  const [active, setActive] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const prefersReducedMotionRef = useRef(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    prefersReducedMotionRef.current = query.matches;
    const handler = (event: MediaQueryListEvent) => {
      prefersReducedMotionRef.current = event.matches;
    };
    query.addEventListener("change", handler);
    return () => query.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const scheduleNext = () => {
      if (prefersReducedMotionRef.current) return;
      const delay = Math.random() * (MAX_DELAY - MIN_DELAY) + MIN_DELAY;
      timeoutRef.current = window.setTimeout(() => {
        setActive(true);
        window.setTimeout(() => {
          if (!cancelled) {
            setActive(false);
            scheduleNext();
          }
        }, RUN_DURATION);
      }, delay);
    };

    scheduleNext();

    return () => {
      cancelled = true;
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (!active) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex h-24 items-end justify-end overflow-hidden">
      <div className="animate-train-glide flex gap-1 pr-6 text-3xl text-slate-700/90">
        <span className="drop-shadow-[0_2px_2px_rgba(15,23,42,0.35)]">🚂</span>
        <span className="drop-shadow-[0_2px_2px_rgba(15,23,42,0.35)]">🚃</span>
        <span className="drop-shadow-[0_2px_2px_rgba(15,23,42,0.35)]">🚃</span>
        <span className="drop-shadow-[0_2px_2px_rgba(15,23,42,0.35)]">🚃</span>
        <span className="drop-shadow-[0_2px_2px_rgba(15,23,42,0.35)]">🚃</span>
        <span className="drop-shadow-[0_2px_2px_rgba(15,23,42,0.35)]">🚃</span>
        <span className="drop-shadow-[0_2px_2px_rgba(15,23,42,0.35)]">🚃</span>
      </div>
    </div>
  );
}
