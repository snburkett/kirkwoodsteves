"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import QuadrantWheel from "./QuadrantWheel";
import type { SectionName } from "@/lib/types";

export default function QuadrantWheelNav() {
  const router = useRouter();
  const [size, setSize] = useState(280);

  useEffect(() => {
    const updateSize = () => {
      const viewportWidth = typeof window === "undefined" ? 0 : window.innerWidth;
      if (viewportWidth === 0) {
        setSize(280);
        return;
      }
      const computed = Math.min(viewportWidth * 0.8, 560);
      setSize(Math.max(220, Math.round(computed)));
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const handleSelect = (section: SectionName) => {
    if (section === "pulse") {
      router.push("/pulse");
      return;
    }
    router.push(`/${section}`);
  };

  return <QuadrantWheel size={size} onSelect={handleSelect} />;
}
