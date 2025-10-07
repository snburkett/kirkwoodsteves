"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import QuadrantWheel from "@/app/(components)/QuadrantWheel";
import type { SectionName } from "@/lib/types";

export default function LandingWheel() {
  const router = useRouter();
  const [size, setSize] = useState(560);

  useEffect(() => {
    const updateSize = () => {
      if (typeof window === "undefined") {
        setSize(560);
        return;
      }
      const viewportWidth = window.innerWidth;
      if (viewportWidth >= 1024) {
        setSize(560);
        return;
      }
      const computed = Math.min(viewportWidth * 0.8, 560);
      setSize(Math.max(260, Math.round(computed)));
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const handleSelect = (section: SectionName) => {
    router.push(`/${section}`);
  };

  return (
    <div className="flex items-center justify-center">
      <QuadrantWheel size={size} onSelect={handleSelect} />
    </div>
  );
}
