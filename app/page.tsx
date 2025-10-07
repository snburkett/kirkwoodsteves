import FieldMemoSlideOut from "@/components/FieldMemoSlideOut";
import VibeOMeter from "@/components/VibeOMeter";
import { loadPulseDigest } from "@/lib/pulse";
import Link from "next/link";
import HeaderTitle from "./(components)/HeaderTitle";
import QuadrantWheelNav from "./(components)/QuadrantWheelNav";

export default async function HomePage() {
  const pulseDigest = await loadPulseDigest();

  return (
    <main className="relative flex min-h-screen flex-col items-center overflow-hidden px-6 py-16">
      <div className="w-full max-w-5xl">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
          <div className="flex flex-col items-center gap-8 text-center lg:items-start lg:text-left">
            <div className="-mt-[40px] mb-6 md:mt-0 md:mb-8">
              <HeaderTitle />
            </div>
            <div className="-mt-[24px] md:mt-0">
              <QuadrantWheelNav />
            </div>
          </div>
          <aside className="w-full lg:sticky lg:top-28">
            <Link
              href="/pulse"
              className="group block transition hover:-translate-y-1 hover:scale-[1.02] focus-visible:outline-none"
            >
              <VibeOMeter
                vibe={pulseDigest.vibe}
                updatedAt={pulseDigest.generated_at}
                windowHours={pulseDigest.window_hours}
                storiesFeatured={pulseDigest.stories_featured}
                variant="compact"
                className="transition-shadow duration-300 group-hover:shadow-[0_35px_80px_-40px_rgba(15,23,42,0.4)] group-focus-visible:shadow-[0_35px_80px_-40px_rgba(15,23,42,0.4)]"
              />
              <span className="mt-3 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.4em] text-slate-500">
                Cruise to Kirkwood Pulse
                <span aria-hidden="true" className="text-base text-amber-400">
                  ✶
                </span>
              </span>
            </Link>
          </aside>
        </div>
      </div>
      <FieldMemoSlideOut />
    </main>
  );
}
