import type { ReactNode } from "react";

import MDXContent from "@/components/MDXContent";
import { loadPost, loadSection, listSections } from "@/lib/content";
import type { Post, SectionName } from "@/lib/types";

const sections = listSections();

export async function generateStaticParams() {
  const params: Array<{ section: string; slug: string }> = [];

  for (const section of sections) {
    const posts = await loadSection(section);
    for (const post of posts) {
      params.push({ section, slug: post.slug });
    }
  }

  return params;
}

function assertSectionName(section: string): SectionName {
  if ((sections as readonly string[]).includes(section)) {
    return section as SectionName;
  }
  throw new Error(`Unknown section: ${section}`);
}

export default async function PostPage({
  params,
}: {
  params: { section: string; slug: string };
}) {
  const section = assertSectionName(params.section);
  const post = await loadPost(section, params.slug);

  return (
    <article className="space-y-8">
      <header className="space-y-3">
        <p className="text-sm uppercase tracking-wide text-blue-500">{sectionLabel(section)}</p>
        <h1 className="text-3xl font-semibold text-slate-900">{post.title}</h1>
        <time className="block text-sm text-slate-500" dateTime={post.date}>
          {new Date(post.date).toLocaleDateString(undefined, { dateStyle: "medium" })}
        </time>
        <div className="rounded-xl border border-slate-200 bg-slate-100/60 p-4 text-sm text-slate-700">
          {renderMeta(post)}
        </div>
      </header>
      <MDXContent source={post.body} />
    </article>
  );
}

function renderMeta(post: Post) {
  switch (post.type) {
    case "emporium":
      return (
        <dl className="grid gap-2 md:grid-cols-2">
          <MetaRow label="Price">${post.priceUSD.toFixed(2)} USD</MetaRow>
          <MetaRow label="Condition">{post.condition}</MetaRow>
          <MetaRow label="Status">{post.status}</MetaRow>
          {post.images.length > 0 ? <MetaRow label="Images">{post.images.length}</MetaRow> : null}
        </dl>
      );
    case "pulse":
      return (
        <p>
          <span className="font-medium">Source:</span>{" "}
          <a href={post.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600">
            {post.sourceUrl}
          </a>
        </p>
      );
    case "ai":
      return post.attachments && post.attachments.length > 0 ? (
        <p>
          <span className="font-medium">Attachments:</span> {post.attachments.length}
        </p>
      ) : (
        <p>Lab note — attachments will be added once experiments consolidate.</p>
      );
    case "oddities":
      return <p>Filed as an oddity. Expect drafts, fragments, and experiments.</p>;
    default:
      return null;
  }
}

function MetaRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <span className="font-medium text-slate-600">{label}:</span> {children}
    </div>
  );
}

function sectionLabel(section: SectionName) {
  switch (section) {
    case "emporium":
      return "Emporium";
    case "pulse":
      return "Pulse";
    case "ai":
      return "AI";
    case "oddities":
      return "Oddities";
    default:
      return section;
  }
}
