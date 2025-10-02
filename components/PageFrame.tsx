"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";

import LockedQuadrantWheel from "@/components/LockedQuadrantWheel";
import RollingTrain from "@/components/RollingTrain";
import ScurryingBugs from "@/components/ScurryingBugs";
import type { SectionName } from "@/lib/types";
import { wheelColors } from "../app/(theme)/tokens";

const sectionColors: Record<SectionName, string> = {
  emporium: wheelColors[0],
  pulse: wheelColors[1],
  ai: wheelColors[2],
  oddities: wheelColors[3],
};

const sectionOrder: SectionName[] = ["emporium", "pulse", "ai", "oddities"];

function getSectionFromPath(pathname: string): SectionName | null {
  const normalized = pathname.replace(/^\/+/, "");
  const [first] = normalized.split("/");
  if (!first) return null;
  return sectionOrder.includes(first as SectionName) ? (first as SectionName) : null;
}

export default function PageFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const activeSection = useMemo(() => getSectionFromPath(pathname), [pathname]);

  const handleSelect = useCallback(
    (section: SectionName) => {
      if (section === activeSection) return;
      router.push(`/${section}`);
    },
    [router, activeSection],
  );

  if (!activeSection) {
    return <>{children}</>;
  }

  const surface = sectionColors[activeSection];

  return (
    <>
      <div className="min-h-screen bg-slate-50">
        <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pb-12 pt-6 sm:px-6 lg:px-10">
          <div className="relative hidden md:block">
            <div className="absolute -top-[40px] -left-[72px] z-50">
              <LockedQuadrantWheel
                size={220}
                activeSection={activeSection}
                onSelect={handleSelect}
                onHome={() => router.push("/")}
              />
            </div>
          </div>

          <div className="md:hidden">
            <div className="relative mb-2 h-[140px]">
              <div className="absolute -top-[54px] left-0 z-20 flex h-[176px] w-[176px] -translate-x-2 items-center justify-center rounded-full border-[5px] border-white bg-white shadow-lg">
                <LockedQuadrantWheel
                  size={176}
                  activeSection={activeSection}
                  onSelect={handleSelect}
                  onHome={() => router.push("/")}
                  homeIconClassName="text-[24px]"
                />
              </div>
            </div>
          </div>

          <div
            className="relative -mt-[60px] flex-1 rounded-[38px] border-4 border-white/80 shadow-2xl md:mt-8 md:pl-[180px] md:pt-16"
            style={{ backgroundColor: surface }}
          >
            <div className="max-w-4xl px-6 pb-14 pt-10 text-slate-900 sm:px-10 md:px-16 md:py-16">
              {children}
            </div>
          </div>
        </div>
      </div>
      {activeSection === "pulse" ? <RollingTrain /> : null}
      {activeSection === "oddities" ? <ScurryingBugs /> : null}
    </>
  );
}
