import Link from "next/link";

import type { Post } from "@/lib/types";

interface PostCardProps {
  post: Post;
}

const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
});

export default function PostCard({ post }: PostCardProps) {
  const href = `/${post.section}/${post.slug}`;

  return (
    <Link
      href={href}
      className="block rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
    >
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="text-lg font-semibold text-slate-900">{post.title}</h3>
        <time className="text-sm text-slate-500" dateTime={post.date}>
          {DATE_FORMATTER.format(new Date(post.date))}
        </time>
      </div>
      <div className="mt-3 space-y-2 text-sm text-slate-600">
        {renderDetails(post)}
        {post.tags && post.tags.length > 0 ? (
          <p>
            <span className="font-medium text-slate-500">Tags:</span> {post.tags.join(", ")}
          </p>
        ) : null}
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
