import type { ReactNode } from "react";

import FieldMemoSlideOut from "@/components/FieldMemoSlideOut";
import LandingWheel from "@/components/LandingWheel";
import RetroVibeGauge from "@/components/RetroVibeGauge";
import StarburstCallout from "@/components/StarburstCallout";
import { loadPulseDigest } from "@/lib/pulse";
import HeaderTitle from "./(components)/HeaderTitle";

type CalloutConfig = {
  key: string;
  render: () => ReactNode;
};

function truncate(text: string, length: number) {
  if (!text) return "";
  if (text.length <= length) return text;
  return `${text.slice(0, length - 1).trimEnd()}…`;
}

export default async function HomePage() {
  const pulseDigest = await loadPulseDigest();
  const vibeScore =
    pulseDigest.sentiment?.score ?? pulseDigest.vibe.raw_score ?? pulseDigest.vibe.score ?? 0;
  const topStory = pulseDigest.items[0];

  const leftCallouts: CalloutConfig[] = [
    {
      key: "sheila",
      render: () => (
        <StarburstCallout
          label="Sheila"
          subtitle="For Kirkwood CC"
          href="https://www.kirkwoodmo.org/government/city-council"
          ariaLabel="Visit Sheila's City Council page"
          imageSrc="/img/sheila.png"
          imageAlt="Sheila city council member"
          variant="sunburst"
          backgroundColor="#f97316"
          textClassName="text-black"
        />
      ),
    },
    {
      key: "sansui",
      render: () => (
        <StarburstCallout
          label="Sansui"
          subtitle="Stereo"
          href="/emporium"
          ariaLabel="See the Sansui stereo in the Emporium"
          imageSrc="/images/landing/sansui.svg"
          imageAlt="Illustration of a Sansui stereo system"
          variant="flare"
          backgroundColor="#0ea5e9"
        />
      ),
    },
    {
      key: "gadfly",
      render: () => (
        <StarburstCallout
          label="Gadfly"
          subtitle="Dispatch"
          href="https://kirkwoodgadfly.substack.com/"
          ariaLabel="Read the latest Kirkwood Gadfly dispatch"
          imageSrc="/images/landing/gadfly.svg"
          imageAlt="Illustration of the Kirkwood Gadfly"
          variant="spark"
          backgroundColor="#7c3aed"
        />
      ),
    },
  ];

  const topStoryLabel = topStory ? truncate(topStory.title, 32) : "Catch the latest";
  const topStoryHref = topStory?.link ?? "/pulse";

  const rightCallouts: CalloutConfig[] = [
    {
      key: "vibe-gauge",
      render: () => (
        <StarburstCallout
          label="Vibe"
          subtitle="O-Meter"
          href="/pulse"
          ariaLabel="Check today's Kirkwood Pulse and Vibe-O-Meter"
          variant="nova"
          backgroundColor="#facc15"
          textClassName="text-slate-900"
        >
          <RetroVibeGauge score={vibeScore} />
        </StarburstCallout>
      ),
    },
    {
      key: "top-story",
      render: () => (
        <StarburstCallout
          label="Top"
          subtitle={topStoryLabel}
          href={topStoryHref}
          ariaLabel={topStory ? `Read the top story: ${topStory.title}` : "View the latest top story"}
          imageSrc="/images/landing/top-story.svg"
          imageAlt="Illustration of a news clipping"
          variant="punch"
          backgroundColor="#1d4ed8"
        />
      ),
    },
    {
      key: "event",
      render: () => (
        <StarburstCallout
          label="Event"
          subtitle="Coming Up"
          href="https://www.kirkwoodmo.org/community/calendar"
          ariaLabel="Browse the upcoming community event calendar"
          imageSrc="/images/landing/event.svg"
          imageAlt="Illustration of a calendar"
          variant="flash"
          backgroundColor="#ef4444"
        />
      ),
    },
  ];

  const mobileCallouts = [...leftCallouts, ...rightCallouts];

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f8f4ed]">
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(900px 520px at 50% -200px, rgba(220,38,38,0.08), transparent 65%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-20 mix-blend-soft-light"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'><g fill='%230f172a' fill-opacity='0.06'><circle cx='6' cy='6' r='1'/><circle cx='86' cy='24' r='0.8'/><circle cx='48' cy='58' r='0.6'/><circle cx='108' cy='94' r='0.7'/><circle cx='30' cy='104' r='0.9'/></g></svg>\")",
        }}
      />
      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-12 px-6 py-16">
        <div className="hidden gap-10 lg:grid lg:grid-cols-12">
          <aside className="lg:col-span-3 lg:sticky lg:top-24 lg:flex lg:h-[70vh] lg:w-full lg:flex-col lg:items-center lg:justify-between">
            {leftCallouts.map((item) => (
              <div key={item.key}>{item.render()}</div>
            ))}
          </aside>
          <section className="lg:col-span-6 flex min-h-[75vh] flex-col items-center justify-center gap-8 text-center">
            <div className="flex w-full justify-center">
              <div className="max-w-xl">
                <HeaderTitle />
              </div>
            </div>
            <LandingWheel />
          </section>
          <aside className="lg:col-span-3 lg:sticky lg:top-24 lg:flex lg:h-[70vh] lg:w-full lg:flex-col lg:items-center lg:justify-between">
            {rightCallouts.map((item) => (
              <div key={item.key}>{item.render()}</div>
            ))}
          </aside>
        </div>

        <div className="flex min-h-[70vh] flex-col items-center justify-center gap-10 lg:hidden">
          <div className="flex w-full justify-center text-center">
            <div className="max-w-md">
              <HeaderTitle />
            </div>
          </div>
          <LandingWheel />
          <div className="flex w-full gap-6 overflow-x-auto pb-4">
            {mobileCallouts.map((item) => (
              <div key={`mobile-${item.key}`} className="w-[220px] shrink-0">
                {item.render()}
              </div>
            ))}
          </div>
        </div>
      </div>
      <FieldMemoSlideOut />
    </main>
  );
}
