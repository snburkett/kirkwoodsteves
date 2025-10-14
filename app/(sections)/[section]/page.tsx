import { notFound } from "next/navigation";

import PostCard from "@/components/PostCard";
import PulseDigest from "@/components/PulseDigest";
import SectionHeader from "@/components/SectionHeader";
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

export default async function SectionPage({ params }: { params: { section: string } }) {
  const section = assertSectionName(params.section);
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
      <div>
        <SectionHeader
          title={titles[section]}
          description={descriptions[section]}
          highlightTone={section === "emporium" || section === "pulse" || section === "ai" || section === "oddities" ? "light" : "default"}
        >
          {headerStatus}
        </SectionHeader>
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
