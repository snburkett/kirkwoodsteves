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
  const heroStyle =
    hero != null
      ? {
          backgroundColor: accent,
          borderColor: accent,
        }
      : undefined;

  return (
    <Link
      href={href}
      className="relative block rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg no-underline hover:no-underline md:min-h-[220px] md:p-8"
    >
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
          <div className="absolute hidden md:right-full md:top-6 md:bottom-6 md:block md:mr-16 md:w-[260px]">
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
          {renderDetails(post)}
          {post.tags && post.tags.length > 0 ? (
            <p>
              <span className="font-medium text-slate-500">Tags:</span> {post.tags.join(", ")}
            </p>
          ) : null}
        </div>
        <div className="text-sm font-medium text-blue-600">View details →</div>
      </div>
    </Link>
  );
}

function renderDetails(post: Post) {
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
      return (
        <p>
          <span className="font-medium text-slate-500">Source:</span> {new URL(post.sourceUrl).hostname}
        </p>
      );
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
