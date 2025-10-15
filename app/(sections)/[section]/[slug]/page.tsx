import type { ReactNode } from "react";

import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { wheelColors } from "@/app/(theme)/tokens";
import EmporiumBuyCallout from "@/components/EmporiumBuyCallout";
import HeroLightboxTrigger from "@/components/HeroLightboxTrigger";
import MDXContent from "@/components/MDXContent";
import PostGallery from "@/components/PostGallery";
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
  return notFound();
}

export default async function PostPage({
  params,
}: {
  params: { section: string; slug: string };
}) {
  const section = assertSectionName(params.section);
  const post = await loadPost(section, params.slug);
  const sectionTitle = sectionLabel(section);
  const parentHref = `/${section}`;
  const heroImage = post.heroImage;
  const galleryImages =
    heroImage != null
      ? post.galleryImages.filter((image) => image.fileName !== heroImage.fileName)
      : post.galleryImages;
  const heroAccent = sectionAccent(section);
  const heroCardStyle = heroImage
    ? {
        backgroundColor: heroAccent,
        borderColor: heroAccent,
      }
    : undefined;

  return (
    <article className="relative space-y-8 md:space-y-10">
      <div>
        <Link
          href={parentHref}
          className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-3 py-1.5 text-sm font-semibold text-blue-700 shadow-sm backdrop-blur transition hover:bg-white hover:text-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
        >
          <span aria-hidden="true">←</span>
          <span>Back to {sectionTitle}</span>
        </Link>
      </div>
      {heroImage ? (
        <aside className="md:absolute md:right-full md:top-6 md:mr-12 md:block md:w-72 lg:w-80">
          <HeroLightboxTrigger
            fileName={heroImage.fileName}
            title={post.title}
            className="cursor-zoom-in rounded-3xl border p-[10px] transition hover:-translate-y-1 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            style={heroCardStyle}
          >
            <figure className="overflow-hidden rounded-2xl bg-slate-100">
              <div className="relative w-full">
                <Image
                  src={heroImage.src}
                  alt={`${post.title} thumbnail`}
                  width={768}
                  height={1024}
                  className="mx-auto h-auto w-full max-w-full object-contain"
                  sizes="(min-width: 1024px) 320px, (min-width: 768px) 45vw, 100vw"
                  priority={section === "emporium"}
                />
              </div>
            </figure>
          </HeroLightboxTrigger>
        </aside>
      ) : null}
      <div className="space-y-8">
        <header
          className={
            section === "emporium" || section === "ai" || section === "oddities"
              ? "space-y-3 rounded-3xl border border-white/60 bg-white/80 px-6 py-5 shadow-sm backdrop-blur md:px-8"
              : "space-y-3"
          }
        >
          {section !== "pulse" ? (
            <p className="text-sm uppercase tracking-wide text-blue-500">{sectionTitle}</p>
          ) : null}
          <h1 className="text-3xl font-semibold text-slate-900">{post.title}</h1>
          <time className="block text-sm text-slate-500" dateTime={post.date}>
            {new Date(post.date).toLocaleDateString(undefined, { dateStyle: "medium" })}
          </time>
          {section !== "pulse" ? (
            <div className="rounded-xl border border-slate-200 bg-slate-100/60 p-4 text-sm text-slate-700">
              {renderMeta(post)}
            </div>
          ) : null}
        </header>
        {section === "emporium" ? <EmporiumBuyCallout className="fixed -top-2 right-0  flex justify-end md:hidden" /> : null}
        <MDXContent source={post.body} />
        {heroImage != null || galleryImages.length > 0 ? (
          <PostGallery title={post.title} heroImage={heroImage} images={galleryImages} />
        ) : null}
      </div>
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
          {post.galleryImages.length > 0 ? <MetaRow label="Gallery">{post.galleryImages.length}</MetaRow> : null}
        </dl>
      );
    case "pulse":
      return null;
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
      return "Kirkwood Pulse";
    case "ai":
      return "AI";
    case "oddities":
      return "Oddities";
    default:
      return section;
  }
}

function sectionAccent(section: SectionName) {
  const baseColor = sectionBaseColors[section];
  return baseColor;
}

const sectionBaseColors: Record<SectionName, string> = {
  emporium: wheelColors[0],
  pulse: wheelColors[1],
  ai: wheelColors[2],
  oddities: wheelColors[3],
};
