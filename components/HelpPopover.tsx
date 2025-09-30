"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export default function HelpPopover() {
  const [open, setOpen] = useState(false);

  return (
    <div className="pointer-events-auto">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
        aria-expanded={open}
        aria-controls="nav-help"
        aria-label={open ? "Hide navigation help" : "Show navigation help"}
      >
        ?
      </button>
      <AnimatePresence>
        {open ? (
          <motion.div
            id="nav-help"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.16, ease: [0.4, 0, 0.2, 1] }}
            className="absolute bottom-full right-0 mb-3 w-64 rounded-2xl border border-slate-200 bg-white/95 p-4 text-sm text-slate-600 shadow-lg"
          >
            Navigate the four active programs of Kirkwood Steve&apos;s. Select a quadrant to jump straight to that section. Keyboard users can tab to the wheel and press Enter to visit a destination.
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
