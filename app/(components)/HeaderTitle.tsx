"use client";

import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import Image from "next/image";

import avatarSrc from "../../public/img/me.png";
import bruisedAvatarSrc from "../../public/img/mebl.png";

const STORAGE_KEY = "ks_avatar_right_eye";
const STEAK_STORAGE_KEY = "ks_avatar_steak_position";
const STEAK_FALLBACK_SIZE = 56;
const STEAK_MARGIN = 12;

type NormalizedPoint = { x: number; y: number };

function isNormalizedPoint(value: unknown): value is NormalizedPoint {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Record<string, unknown>).x === "number" &&
    typeof (value as Record<string, unknown>).y === "number"
  );
}

function clampWithinViewport(x: number, y: number, width: number, height: number) {
  if (typeof window === "undefined") {
    return { x, y };
  }
  const elementWidth = width || STEAK_FALLBACK_SIZE;
  const elementHeight = height || STEAK_FALLBACK_SIZE;
  const viewportWidth = window.innerWidth || elementWidth + STEAK_MARGIN * 2;
  const viewportHeight = window.innerHeight || elementHeight + STEAK_MARGIN * 2;
  const maxX = Math.max(STEAK_MARGIN, viewportWidth - elementWidth - STEAK_MARGIN);
  const maxY = Math.max(STEAK_MARGIN, viewportHeight - elementHeight - STEAK_MARGIN);

  return {
    x: Math.min(Math.max(x, STEAK_MARGIN), maxX),
    y: Math.min(Math.max(y, STEAK_MARGIN), maxY),
  };
}

function toNormalizedPoint(x: number, y: number): NormalizedPoint {
  if (typeof window === "undefined") {
    return { x: 0, y: 0 };
  }
  const width = window.innerWidth || 1;
  const height = window.innerHeight || 1;
  return {
    x: Math.min(Math.max(x / width, 0), 1),
    y: Math.min(Math.max(y / height, 0), 1),
  };
}

function fromNormalizedPoint(point: NormalizedPoint, width: number, height: number) {
  if (typeof window === "undefined") {
    return { x: 0, y: 0 };
  }
  const rawX = point.x * window.innerWidth;
  const rawY = point.y * window.innerHeight;
  return clampWithinViewport(rawX, rawY, width, height);
}

export default function HeaderTitle() {
  const [bruised, setBruised] = useState(false);
  const [steakUnlocked, setSteakUnlocked] = useState(false);
  const [steakPosition, setSteakPosition] = useState<{ x: number; y: number } | null>(null);
  const [steakDragging, setSteakDragging] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const eyeButtonRef = useRef<HTMLButtonElement | null>(null);
  const steakOffsetRef = useRef<{ x: number; y: number } | null>(null);
  const steakButtonRef = useRef<HTMLButtonElement | null>(null);
  const steakPointerTypeRef = useRef<string | null>(null);
  const previousBodyTouchActionRef = useRef<string | null>(null);
  const previousBodyOverscrollRef = useRef<string | null>(null);
  const previousRootOverscrollRef = useRef<string | null>(null);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setBruised(stored === "true");
      }
    } catch (error) {
      console.warn("Unable to read avatar state", error);
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(bruised));
    } catch (error) {
      console.warn("Unable to persist avatar state", error);
    }
  }, [bruised]);

  useEffect(() => {
    if (!bruised) {
      setSteakUnlocked(false);
      setSteakPosition(null);
      setSteakDragging(false);
      if (typeof window !== "undefined") {
        try {
          window.localStorage.removeItem(STEAK_STORAGE_KEY);
        } catch (error) {
          console.warn("Unable to clear steak position", error);
        }
      }
      return;
    }

    setSteakUnlocked(true);

    if (typeof window === "undefined") {
      return;
    }

    let frameId: number | null = null;

    try {
      const stored = window.localStorage.getItem(STEAK_STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (!isNormalizedPoint(parsed)) return;

      const applyPosition = () => {
        const buttonEl = steakButtonRef.current;
        if (!buttonEl) {
          frameId = window.requestAnimationFrame(applyPosition);
          return;
        }
        const rect = buttonEl.getBoundingClientRect();
        const restored = fromNormalizedPoint(parsed, rect.width || STEAK_FALLBACK_SIZE, rect.height || STEAK_FALLBACK_SIZE);
        setSteakPosition(restored);
      };

      frameId = window.requestAnimationFrame(applyPosition);
    } catch (error) {
      console.warn("Unable to restore steak position", error);
    }

    return () => {
      if (frameId !== null && typeof window !== "undefined") {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [bruised]);

  useEffect(() => {
    if (!steakUnlocked) return;
    if (typeof window === "undefined") return;

    if (!steakPosition) {
      try {
        window.localStorage.removeItem(STEAK_STORAGE_KEY);
      } catch (error) {
        console.warn("Unable to clear steak position", error);
      }
      return;
    }

    const normalized = toNormalizedPoint(steakPosition.x, steakPosition.y);
    try {
      window.localStorage.setItem(STEAK_STORAGE_KEY, JSON.stringify(normalized));
    } catch (error) {
      console.warn("Unable to persist steak position", error);
    }
  }, [steakPosition, steakUnlocked]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    if (!steakDragging || steakPointerTypeRef.current !== "touch") {
      return;
    }

    const preventScroll = (event: TouchEvent) => {
      if (event.cancelable) {
        event.preventDefault();
      }
    };

    window.addEventListener("touchmove", preventScroll, { passive: false });

    const { body } = document;
    const root = document.documentElement;

    previousBodyTouchActionRef.current = previousBodyTouchActionRef.current ?? body.style.touchAction;
    previousBodyOverscrollRef.current = previousBodyOverscrollRef.current ?? body.style.overscrollBehavior;
    previousRootOverscrollRef.current = previousRootOverscrollRef.current ?? root.style.overscrollBehavior;

    body.style.touchAction = "none";
    body.style.overscrollBehavior = "contain";
    root.style.overscrollBehavior = "contain";

    return () => {
      window.removeEventListener("touchmove", preventScroll);

      if (previousBodyTouchActionRef.current !== null) {
        body.style.touchAction = previousBodyTouchActionRef.current;
        previousBodyTouchActionRef.current = null;
      }

      if (previousBodyOverscrollRef.current !== null) {
        body.style.overscrollBehavior = previousBodyOverscrollRef.current;
        previousBodyOverscrollRef.current = null;
      }

      if (previousRootOverscrollRef.current !== null) {
        root.style.overscrollBehavior = previousRootOverscrollRef.current;
        previousRootOverscrollRef.current = null;
      }
    };
  }, [steakDragging]);

  const playOw = () => {
    const synth = typeof window !== "undefined" ? window.speechSynthesis : null;
    if (synth && typeof SpeechSynthesisUtterance !== "undefined") {
      const speak = () => {
        const utterance = new SpeechSynthesisUtterance("Ow");
        const voices = synth.getVoices();
        const preferred = voices.find((voice) => /male|david|daniel|alex|fred/i.test(voice.name));
        if (preferred) {
          utterance.voice = preferred;
        }
        utterance.pitch = 1.2;
        utterance.rate = 1.4;
        utterance.volume = 0.9;
        synth.cancel();
        synth.speak(utterance);
      };

      if (synth.getVoices().length === 0) {
        const handler = () => {
          speak();
          synth.removeEventListener("voiceschanged", handler);
        };
        synth.addEventListener("voiceschanged", handler, { once: true });
      } else {
        speak();
      }
      return;
    }

    const ctx = audioContextRef.current ?? new AudioContext();
    audioContextRef.current = ctx;
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(340, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.15);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.4, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.3);
  };

  const handlePunch = () => {
    if (bruised) return;
    setBruised(true);
    playOw();
  };

  const healBruise = () => {
    setBruised(false);
    setSteakUnlocked(false);
    setSteakPosition(null);
    setSteakDragging(false);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(STEAK_STORAGE_KEY);
      } catch (error) {
        console.warn("Unable to clear steak position", error);
      }
    }
  };

  const handleSteakPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!steakUnlocked) return;
    event.preventDefault();
    steakPointerTypeRef.current = event.pointerType;
    const rect = event.currentTarget.getBoundingClientRect();
    steakOffsetRef.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    const initial = clampWithinViewport(rect.left, rect.top, rect.width, rect.height);
    setSteakPosition(initial);
    setSteakDragging(true);
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // ignore environments without pointer capture
    }
  };

  const handleSteakPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!steakDragging || !steakOffsetRef.current) return;
    event.preventDefault();
    const nextX = event.clientX - steakOffsetRef.current.x;
    const nextY = event.clientY - steakOffsetRef.current.y;
    const rect = event.currentTarget.getBoundingClientRect();
    const clamped = clampWithinViewport(nextX, nextY, rect.width, rect.height);
    setSteakPosition(clamped);
  };

  const handleSteakPointerEnd = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!steakDragging) return;
    event.preventDefault();
    setSteakDragging(false);
    steakPointerTypeRef.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // ignore environments without pointer capture
    }

    const steakRect = event.currentTarget.getBoundingClientRect();
    const eyeRect = eyeButtonRef.current?.getBoundingClientRect();

    if (
      eyeRect &&
      steakRect.left < eyeRect.right &&
      steakRect.right > eyeRect.left &&
      steakRect.top < eyeRect.bottom &&
      steakRect.bottom > eyeRect.top
    ) {
      healBruise();
      steakOffsetRef.current = null;
      setSteakPosition(null);
      return;
    }

    steakOffsetRef.current = null;
    const settled = clampWithinViewport(steakRect.left, steakRect.top, steakRect.width, steakRect.height);
    setSteakPosition(settled);
  };

  return (
    <>
      <div aria-label="Site title" className="flex items-center gap-3">
        <span className="relative inline-flex h-14 w-14 overflow-hidden rounded-full border border-slate-200 shadow-sm lg:h-[62px] lg:w-[62px]">
          <Image
            src={bruised ? bruisedAvatarSrc : avatarSrc}
            alt="Steven's avatar"
            fill
          sizes="(min-width: 1024px) 56px, 48px"
          className="object-cover"
          priority
        />

        <button
          type="button"
          className={`absolute left-[64%] top-[38%] h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-transparent focus-visible:outline-none ${
            bruised ? "cursor-default pointer-events-none" : "cursor-pointer"
          }`}
          onClick={handlePunch}
          ref={eyeButtonRef}
          aria-label="Tap to poke right eye"
        />
      </span>
      <span className="font-bold tracking-tight text-slate-900" style={{ fontSize: "clamp(22px, 3vw, 40px)" }}>
        Kirkwood Steve&apos;s
      </span>
      </div>
      {steakUnlocked && (
        <button
          type="button"
          ref={steakButtonRef}
          className={`fixed bottom-6 left-6 inline-flex select-none items-center justify-center text-3xl leading-none transition-opacity z-[999] ${
            steakDragging ? "cursor-grabbing" : "cursor-grab"
          }`}
          style={
            steakPosition
              ? { top: steakPosition.y, left: steakPosition.x, bottom: "auto", right: "auto", zIndex: 999, touchAction: "none" }
              : { zIndex: 999, touchAction: "none" }
          }
          aria-label={bruised ? "Drag steak to heal black eye" : "Steak"}
          onPointerDown={handleSteakPointerDown}
          onPointerMove={handleSteakPointerMove}
          onPointerUp={handleSteakPointerEnd}
          onPointerCancel={handleSteakPointerEnd}
        >
          🥩
        </button>
      )}
    </>
  );
}
