import Image from "next/image";
import Link from "next/link";

import type { Post } from "@/lib/types";
import { wheelColors } from "@/app/(theme)/tokens";

interface PostCardProps {
  post: Post;
}

const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
});

export default function PostCard({ post }: PostCardProps) {
  const href = `/${post.section}/${post.slug}`;
  const hero = post.heroImage;
  const accent = sectionAccents[post.section];
  const pulseStoryCount = post.type === "pulse" ? extractPulseStoryCount(post.body) : null;
  const isPulseEmpty = post.type === "pulse" && pulseStoryCount === 0;
  const hideDetailsLink = isPulseEmpty;
  const cardClassName = isPulseEmpty
    ? "relative block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
    : "relative block rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg no-underline hover:no-underline md:min-h-[220px] md:p-4";
  const heroStyle =
    hero != null
      ? {
          backgroundColor: accent,
          borderColor: accent,
        }
      : undefined;

  const content = (
    <>
      {hero ? (
        <>
          <div className="mb-6 md:hidden">
            <div className="rounded-3xl border p-[10px]" style={heroStyle}>
              <figure className="overflow-hidden rounded-2xl bg-slate-100">
                <Image
                  src={hero.src}
                  alt={`${post.title} hero image`}
                  width={768}
                  height={1024}
                  className="mx-auto h-auto w-full max-w-full object-contain"
                  sizes="100vw"
                />
              </figure>
            </div>
          </div>
          <div className="absolute hidden md:right-full md:h-full md:top-0 md:bottom-0 md:block md:mr-12 md:w-[260px]">
            <div className="flex h-full w-full items-center rounded-3xl border p-[10px]" style={heroStyle}>
              <figure className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-2xl" style={{ backgroundColor: accent }}>
                <Image
                  src={hero.src}
                  alt={`${post.title} hero image`}
                  fill
                  sizes="260px"
                  className="object-contain"
                />
              </figure>
            </div>
          </div>
        </>
      ) : null}
      <div className="space-y-4">
        <div className="flex flex-wrap items-baseline gap-3">
          <h3 className="text-lg font-semibold text-slate-900">{post.title}</h3>
          <time className="text-sm text-slate-500" dateTime={post.date}>
            {DATE_FORMATTER.format(new Date(post.date))}
          </time>
        </div>
        <div className="space-y-2 text-sm text-slate-600">
          {renderDetails(post, pulseStoryCount)}
          {post.tags && post.tags.length > 0 ? (
            <p>
              <span className="font-medium text-slate-500">Tags:</span> {post.tags.join(", ")}
            </p>
          ) : null}
        </div>
        {hideDetailsLink ? null : <div className="text-sm font-medium text-blue-600">View details →</div>}
      </div>
    </>
  );

  if (isPulseEmpty) {
    return <div className={cardClassName}>{content}</div>;
  }

  return (
    <Link href={href} className={cardClassName}>
      {content}
    </Link>
  );
}

function renderDetails(post: Post, pulseStoryCount: number | null) {
  switch (post.type) {
    case "emporium":
      return (
        <div className="space-y-1">
          <p>
            <span className="font-medium text-slate-500">Price:</span> ${post.priceUSD.toFixed(2)} USD
          </p>
          <p>
            <span className="font-medium text-slate-500">Condition:</span> {post.condition}
          </p>
          <p>
            <span className="font-medium text-slate-500">Status:</span> {post.status}
          </p>
        </div>
      );
    case "pulse":
      return renderPulseDetails(post, pulseStoryCount);
    case "ai":
      return post.attachments && post.attachments.length > 0 ? (
        <p>
          <span className="font-medium text-slate-500">Attachments:</span> {post.attachments.length}
        </p>
      ) : (
        <p>AI lab note</p>
      );
    case "oddities":
      return <p>Filed under curiosities.</p>;
    default:
      return null;
  }
}

const sectionAccents: Record<Post["section"], string> = {
  emporium: wheelColors[0],
  pulse: wheelColors[1],
  ai: wheelColors[2],
  oddities: wheelColors[3],
};

function renderPulseDetails(post: Post, storyCount: number | null) {
  const effectiveStoryCount = storyCount ?? extractPulseStoryCount(post.body);
  let hostname: string | null = null;

  if ("sourceUrl" in post) {
    try {
      hostname = new URL(post.sourceUrl).hostname;
    } catch {
      hostname = null;
    }
  }

  if (effectiveStoryCount == null) {
    return (
      <p>
        <span className="font-medium text-slate-500">Source:</span>{" "}
        {hostname ?? "Kirkwood Pulse"}
      </p>
    );
  }

  if (effectiveStoryCount === 0) {
    return (
      <p>
        No new stories logged today{hostname ? ` • ${hostname}` : ""}.
      </p>
    );
  }

  const label = effectiveStoryCount === 1 ? "story" : "stories";
  return (
    <p>
      {effectiveStoryCount} new {label} summarized{hostname ? ` • ${hostname}` : ""}.
    </p>
  );
}

function extractPulseStoryCount(body: string): number | null {
  const match = body.match(/•\s*(\d+)\s+stories?/i);
  if (!match) return null;
  const parsed = Number.parseInt(match[1], 10);
  if (Number.isNaN(parsed)) return null;
  return parsed;
}
