import type { ReactNode } from "react";
import Image from "next/image";

import AIRobotChatBubble from "@/components/AIRobotChatBubble";
import FieldMemoSlideOut from "@/components/FieldMemoSlideOut";
import LandingWheel from "@/components/LandingWheel";
import RetroVibeGauge from "@/components/RetroVibeGauge";
import StarburstCallout from "@/components/StarburstCallout";
import SpeechBubbleTooltip from "@/components/SpeechBubbleTooltip";
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
          id="sheila-starburst"
          label="Sheila"
          subtitle="For Kirkwood CC"
          href="https://burkettforkcc.com/"
          ariaLabel="Visit Sheila's City Council page"
          imageSrc="/img/sheila.png"
          imageAlt="Sheila city council member"
          variant="sunburst"
          backgroundColor="#f97316"
          textClassName="text-black"
          hoverBubbleText="Vote for me!"
        />
      ),
    },
    {
      key: "sansui",
      render: () => (
        <StarburstCallout
          label="Sansui"
          subtitle="Stereo"
          href="/emporium/sansui-receiver-1960s"
          ariaLabel="See the Sansui stereo in the Emporium"
          imageSrc="/img/sansui.png"
          imageAlt="Sansui stereo"
          variant="flare"
          backgroundColor="#0ea5e9"
          hoverBubbleText="You know you want it"
        />
      ),
    },
    {
      key: "gadfly",
      render: () => (
        <StarburstCallout
          label="Gadfly"
          subtitle="Dispatch"
          href="https://kirkwoodgadfly.com/"
          ariaLabel="Read the latest Kirkwood Gadfly dispatch"
          imageSrc="/img/gadfly.webp"
          imageAlt="Kirkwood Gadfly"
          variant="spark"
          backgroundColor="#7c3aed"
        />
      ),
    },
  ];

  const topStoryLabel = topStory ? truncate(topStory.title, 32) : "AI Chat";
  const topStorySubtitle = topStory ? topStory.source?.name ?? "Pulse" : "With Steve";
  const topStoryHref = topStory?.link ?? "/ai";

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
          childClassName="scale-[0.9] -rotate-6"
        >
          <RetroVibeGauge
            score={vibeScore}
            showTitle={false}
            showLabels={false}
            compact
            className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm"
          />
        </StarburstCallout>
      ),
    },
    {
      key: "top-story",
      render: () => (
        <StarburstCallout
          label="AI Chat"
          subtitle="With Steve"
          href="/ai"
          ariaLabel="Catch the latest AI chatter with Steve"
          imageSrc="/img/terminator.png"
          imageAlt="Terminator AI illustration"
          variant="punch"
          backgroundColor="#1d4ed8"
          textClassName="text-white"
          dataAttributes={{ "data-ai-chat-trigger": "true" }}
        />
      ),
    },
    {
      key: "event",
      render: () => (
        <StarburstCallout
          label="Kirkwood"
          subtitle="Coming Events"
          href="https://www.kirkwoodmo.org/home#Events"
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
      <div className="relative z-10 mx-auto flex w-full max-w-[100rem] flex-col gap-12 px-6 py-16">
        <div className="hidden gap-16 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,640px)_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-24 lg:flex lg:h-[70vh] lg:w-full lg:flex-col lg:items-center lg:justify-between">
            {leftCallouts.map((item) => (
              <div key={item.key}>{item.render()}</div>
            ))}
          </aside>
          <section className="flex min-h-[75vh] flex-col items-center justify-center gap-8 text-center">
            <div className="flex w-full justify-center">
              <div className="max-w-xl">
                <HeaderTitle />
              </div>
            </div>
            <LandingWheel />
          </section>
          <aside className="lg:sticky lg:top-24 lg:flex lg:h-[70vh] lg:w-full lg:flex-col lg:items-center lg:justify-between">
            {rightCallouts.map((item) => (
              <div key={item.key}>{item.render()}</div>
            ))}
          </aside>
        </div>

        <div className="flex min-h-[70vh] flex-col items-center lg:hidden">
          <div className="flex w-full justify-center text-center">
            <div className="max-w-md">
              <HeaderTitle steakPortalId="mobile-steak-slot" />
            </div>
          </div>
          <div className="flex w-full flex-1 items-center justify-center py-6">
            <LandingWheel />
          </div>
          <div className="mt-4 flex w-full gap-6 overflow-x-auto overflow-y-hidden pb-4">
            {mobileCallouts.map((item) => (
              <div key={`mobile-${item.key}`} className="w-[200px] shrink-0">
                {item.render()}
              </div>
            ))}
          </div>
          <div className="mt-4 flex w-full items-center justify-between gap-6 sm:hidden">
            <div className="flex flex-none items-center gap-3">
              <Image
                src="/img/vibebadge.png"
                alt="Vibe badge"
                width={60}
                height={60}
                className="h-[60px] w-[60px]"
              />
              <div id="mobile-steak-slot" className="relative flex h-14 w-14 items-center justify-center" />
            </div>
            <FieldMemoSlideOut variant="inline" className="flex-1" />
          </div>
        </div>
      </div>
      <SpeechBubbleTooltip
        text="100% Organic!  CMS Free!"
        placement="right"
        className="fixed bottom-12 left-6 z-40 hidden sm:inline-block"
      >
        <div className="flex items-center justify-center rounded-full border border-slate-200 bg-white p-2 shadow-md">
          <Image src="/img/vibebadge.png" alt="Vibe badge" width={60} height={60} className="h-[60px] w-[60px]" />
        </div>
      </SpeechBubbleTooltip>
      <FieldMemoSlideOut className="hidden sm:flex" />
      <AIRobotChatBubble />
    </main>
  );
}
