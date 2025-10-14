"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import StarburstCallout from "@/components/StarburstCallout";

interface EmporiumBuyCalloutProps {
  className?: string;
}

export default function EmporiumBuyCallout({ className }: EmporiumBuyCalloutProps) {
  const [open, setOpen] = useState(false);
  const [portalHost, setPortalHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    const host = document.getElementById("page-callout-slot");
    setPortalHost(host);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const trigger = (
    <StarburstCallout
      href="#"
      label="Want it?"
      subtitle="Click to Buy"
      ariaLabel="Contact Steve to purchase this item"
      backgroundColor="#fb923c"
      textClassName="text-slate-900"
      variant="flare"
      childClassName="text-6xl"
      onClick={() => setOpen(true)}
    >
      <span role="img" aria-label="joypad">
        🕹️
      </span>
    </StarburstCallout>
  );

  const mobileWrapperClass = ["md:hidden", className].filter(Boolean).join(" ");

  return (
    <>
      {portalHost
        ? createPortal(<div className="hidden md:block">{trigger}</div>, portalHost)
        : null}
      <div className={mobileWrapperClass}>{trigger}</div>
      {open ? (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/80 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center text-slate-800 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-medium text-slate-500 shadow-sm transition hover:text-slate-900"
              aria-label="Close purchase instructions"
            >
              Close
            </button>
            <h2 className="mb-4 text-2xl font-semibold text-slate-900">Ready to claim it?</h2>
            <p className="mb-3 text-base leading-relaxed">
              <span className="font-semibold text-slate-900">Text</span> Steve at
              <br />
              <a href="sms:+13145417485" className="text-blue-600 hover:underline">
                314-541-7485
              </a>
            </p>
            <p className="mb-6 text-base leading-relaxed">
              or <span className="font-semibold text-slate-900">email</span>
              <br />
              <a href="mailto:steve@kirkwoodsteves.com" className="text-blue-600 hover:underline">
                steve@kirkwoodsteves.com
              </a>
            </p>
            <p className="text-sm text-slate-500">
              Online ordering is coming soon — for now, reach out directly and this kit is yours.
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
