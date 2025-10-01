"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

import avatarSrc from "../../public/img/me.png";
import bruisedAvatarSrc from "../../public/img/mebl.png";

const STORAGE_KEY = "ks_avatar_right_eye";

export default function HeaderTitle() {
  const [bruised, setBruised] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

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

  const playOw = () => {
    const synth = typeof window !== "undefined" ? window.speechSynthesis : null;
    if (synth && typeof SpeechSynthesisUtterance !== "undefined") {
      const speak = () => {
        const utterance = new SpeechSynthesisUtterance("Ow!");
        const voices = synth.getVoices();
        const preferred = voices.find((voice) => /male|david|daniel|alex|fred/i.test(voice.name));
        if (preferred) {
          utterance.voice = preferred;
        }
        utterance.pitch = 0.75;
        utterance.rate = 1.05;
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

  return (
    <div aria-label="Site title" className="flex items-center gap-3">
      <span className="relative inline-flex h-12 w-12 overflow-hidden rounded-full border border-slate-200 shadow-sm lg:h-14 lg:w-14">
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
          className="absolute left-[64%] top-[38%] h-4 w-4 -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full bg-transparent focus-visible:outline-none"
          onClick={handlePunch}
          aria-label="Tap to poke right eye"
        />
      </span>
      <span className="font-bold tracking-tight text-slate-900" style={{ fontSize: "clamp(22px, 3vw, 40px)" }}>
        Kirkwood Steve&apos;s
      </span>
    </div>
  );
}
