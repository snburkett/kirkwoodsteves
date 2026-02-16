import Image from "next/image";
import { notFound } from "next/navigation";

import PostCard from "@/components/PostCard";
import PulseDigest from "@/components/PulseDigest";
import SectionHeader from "@/components/SectionHeader";
import PulseGadflyCallout from "@/components/PulseGadflyCallout";
import { loadSection, listSections } from "@/lib/content";
import { loadPulseDigest } from "@/lib/pulse";
import type { SectionName } from "@/lib/types";

const titles: Record<SectionName, string> = {
  emporium: "Emporium",
  pulse: "Kirkwood Pulse",
  ai: "AI",
  oddities: "Oddities",
};

const descriptions: Record<SectionName, string> = {
  emporium: "Catalog of inventory and offers currently circulating through the shop.",
  pulse: "Quick reads and signals worth keeping on the civic radar.",
  ai: "Working notes on orchestrating AI systems for small-but-mighty teams.",
  oddities: "Experiments and snippets that do not fit neat lanes yet.",
};

export async function generateStaticParams() {
  return listSections().map((section) => ({ section }));
}

function assertSectionName(section: string): SectionName {
  if ((listSections() as readonly string[]).includes(section)) {
    return section as SectionName;
  }
  return notFound();
}

export default async function SectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section: rawSection } = await params;
  const section = assertSectionName(rawSection);
  const posts = await loadSection(section);
  const digest = section === "pulse" ? await loadPulseDigest() : null;

  const headerStatus =
    section === "pulse"
      ? posts.length === 0
        ? "Daily digest + archive coming soon."
        : `Daily digest + ${posts.length} archive entries.`
      : posts.length === 0
        ? "No entries yet. Check back soon."
        : `${posts.length} entries`;

  return (
    <div>
      <div className="relative pt-24 md:pt-0">
        {section === "pulse" ? (
          <Image
            src="/images/pulseUnderConstruction.png"
            alt="Pulse under construction"
            width={320}
            height={320}
            priority
            className="pointer-events-none fixed left-0 top-[30px] z-10 w-32 md:w-52 lg:w-72"
            sizes="(max-width: 768px) 8rem, (max-width: 1024px) 13rem, 18rem"
          />
        ) : null}
        <SectionHeader
          title={titles[section]}
          description={descriptions[section]}
          highlightTone={section === "emporium" || section === "pulse" || section === "ai" || section === "oddities" ? "light" : "default"}
        >
          {headerStatus}
        </SectionHeader>
        {section === "pulse" ? <PulseGadflyCallout className="absolute right-0 -mt-20 md:top-0" /> : null}
      </div>
      {section === "pulse" ? (
        <div className="space-y-10">
          {digest ? <PulseDigest digest={digest} /> : null}
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Pulse archive</h3>
            <div className="mt-4 space-y-4">
              {posts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
                  Nothing filed yet.
                </div>
              ) : (
                posts.map((post) => <PostCard key={post.slug} post={post} />)
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
              Nothing filed yet.
            </div>
          ) : (
            posts.map((post) => <PostCard key={post.slug} post={post} />)
          )}
        </div>
      )}
    </div>
  );
}
