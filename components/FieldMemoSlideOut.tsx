"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

interface FieldMemoSlideOutProps {
  variant?: "floating" | "inline";
  className?: string;
}

function CompassBadge() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 120 120"
      width="60"
      height="60"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="compass-glint" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.75" />
          <stop offset="1" stopColor="#dbeafe" stopOpacity="0.2" />
        </linearGradient>
      </defs>
      <circle
        cx="60"
        cy="60"
        r="58"
        fill="url(#compass-glint)"
        stroke="#1e293b"
        strokeWidth="4"
      />
      <circle cx="60" cy="60" r="42" fill="#1e293b" opacity="0.08" />
      <circle cx="60" cy="60" r="6" fill="#1f2937" />
      <g stroke="#1f2937" strokeWidth="2.5" strokeLinecap="round">
        <line x1="60" y1="20" x2="60" y2="32" />
        <line x1="60" y1="88" x2="60" y2="100" />
        <line x1="20" y1="60" x2="32" y2="60" />
        <line x1="88" y1="60" x2="100" y2="60" />
      </g>
      <g fill="#1f2937">
        <text x="60" y="18" textAnchor="middle" fontFamily="serif" fontSize="10">
          N
        </text>
        <text x="60" y="112" textAnchor="middle" fontFamily="serif" fontSize="10">
          S
        </text>
        <text x="18" y="64" textAnchor="middle" fontFamily="serif" fontSize="10">
          W
        </text>
        <text x="102" y="64" textAnchor="middle" fontFamily="serif" fontSize="10">
          E
        </text>
      </g>
      <path
        d="M60 33 L72 72 L60 66 L48 72 Z"
        fill="#dd1d1d"
        stroke="#1f2937"
        strokeWidth="2"
      />
      <path
        d="M60 87 L52 57 L60 60 L68 57 Z"
        fill="#1f2937"
        opacity="0.85"
      />
    </svg>
  );
}

export default function FieldMemoSlideOut({ variant = "floating", className }: FieldMemoSlideOutProps) {
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const isInline = variant === "inline";

  const containerClass = [
    "flex items-end gap-3",
    isInline ? "relative justify-end" : "fixed bottom-12 right-6 z-40",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const buttonClass = [
    "relative inline-flex items-center justify-center rounded-full border border-slate-200 bg-white p-2 shadow-md transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500",
  ]
    .filter(Boolean)
    .join(" ");

  const panelClass = isInline
    ? "absolute right-0 top-full mt-3 w-[min(320px,90vw)] rounded-3xl border border-slate-200 bg-white/95 p-5 text-base leading-relaxed text-slate-800 shadow-xl"
    : "max-w-prose rounded-3xl border border-slate-200 bg-white/95 p-6 text-lg leading-relaxed text-slate-800 shadow-xl";

  const panel = (
    <motion.aside
      key="memo"
      initial={reduceMotion ? false : { opacity: 0, x: 24 }}
      animate={reduceMotion ? { opacity: 1, x: 0 } : { opacity: 1, x: 0 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 24 }}
      transition={{ duration: 0.25, ease: [0.42, 0, 0.58, 1] }}
      role="region"
      aria-labelledby="field-memo-title"
      aria-describedby="wheel-hint"
      id="field-memo-panel"
      className={panelClass}
    >
      <p className="mb-3">
        <span className="mr-2 inline-block text-amber-600" aria-hidden="true">
          👉
        </span>
        <strong>Kirkwood Steve&apos;s</strong> curios - some practical, some strange, always local.
      </p>

      <ul className="mb-4 list-inside list-disc space-y-2 pl-4 text-slate-700">
        <li>
          <span className="font-semibold">Emporium</span> — salvaged gear, vinyl, and repairs with short stories attached.
        </li>
        <li>
          <span className="font-semibold">Kirkwood Pulse</span> — municipal signals: agendas, quick takes, and neighborhood notes.
        </li>
        <li>
          <span className="font-semibold">AI Lab</span> — orchestration notes and in-progress runbooks (working drafts).
        </li>
        <li>
          <span className="font-semibold">Oddities</span> — prototypes, fragments, and things that escaped their folders.
        </li>
      </ul>

      <p className="text-sm text-slate-500">
        <em>The wheel remembers</em>
      </p>

      <p id="wheel-hint" className="sr-only">
        Spin or click the wheel to open a thread. The wheel will tuck to the corner while the chosen slice expands into the content area.
      </p>
    </motion.aside>
  );

  return (
    <div className={containerClass}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={buttonClass}
        aria-expanded={open}
        aria-controls="field-memo-panel"
        aria-label={open ? "Hide field memo" : "Show field memo"}
      >
        <CompassBadge />
      </button>
      <AnimatePresence>{open ? panel : null}</AnimatePresence>
    </div>
  );
}
