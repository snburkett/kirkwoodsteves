import PostCard from "@/components/PostCard";
import SectionHeader from "@/components/SectionHeader";
import { loadSection, listSections } from "@/lib/content";
import type { SectionName } from "@/lib/types";

const titles: Record<SectionName, string> = {
  emporium: "Emporium",
  pulse: "Pulse",
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
  throw new Error(`Unknown section: ${section}`);
}

export default async function SectionPage({ params }: { params: { section: string } }) {
  const section = assertSectionName(params.section);
  const posts = await loadSection(section);

  return (
    <div>
      <SectionHeader title={titles[section]} description={descriptions[section]}>
        {posts.length === 0 ? "No entries yet. Check back soon." : `${posts.length} entries`}
      </SectionHeader>
      <div className="space-y-4">
        {posts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
            Nothing filed yet.
          </div>
        ) : (
          posts.map((post) => <PostCard key={post.slug} post={post} />)
        )}
      </div>
    </div>
  );
}
