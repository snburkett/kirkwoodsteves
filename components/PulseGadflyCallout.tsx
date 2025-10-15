"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import StarburstCallout from "@/components/StarburstCallout";

interface PulseGadflyCalloutProps {
  className?: string;
}

export default function PulseGadflyCallout({ className }: PulseGadflyCalloutProps) {
  const [portalHost, setPortalHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    const host = document.getElementById("page-callout-slot");
    setPortalHost(host);
  }, []);

  const callout = (
    <StarburstCallout
      href="https://kirkwoodgadfly.com/"
      ariaLabel="Read the latest Kirkwood Gadfly dispatch"
      label="Gadfly"
      subtitle="Dispatch"
      imageSrc="/img/gadfly.webp"
      imageAlt="Kirkwood Gadfly"
      variant="spark"
      backgroundColor="#7c3aed"
      hoverBubbleText="Great site for local Commentary!"
    />
  );

  const mobileWrapper = ["md:hidden absolute right-0 top-0", className]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      {portalHost ? createPortal(<div className="hidden md:block">{callout}</div>, portalHost) : null}
      <div className={mobileWrapper}>{callout}</div>
    </>
  );
}
