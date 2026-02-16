import RetroVibeGauge from "@/components/RetroVibeGauge";
import type { PulseDigest, PulseStory } from "@/lib/pulse";

function formatPublished(input?: string) {
  if (!input) {
    return "Date unknown";
  }
  try {
    const date = new Date(input);
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  } catch {
    return "Date unknown";
  }
}

function sentimentBadge(sentiment: PulseStory["sentiment"]) {
  switch (sentiment) {
    case "positive":
      return { label: "Positive", className: "text-emerald-700 bg-emerald-100" };
    case "negative":
      return { label: "Concern", className: "text-rose-700 bg-rose-100" };
    default:
      return { label: "Neutral", className: "text-slate-700 bg-slate-100" };
  }
}

function priorityBadge(priority: PulseStory["priority"]) {
  switch (priority) {
    case "high":
      return { label: "High signal", className: "bg-orange-100 text-orange-700" };
    case "low":
      return { label: "Low signal", className: "bg-slate-100 text-slate-500" };
    default:
      return { label: "Medium signal", className: "bg-amber-100 text-amber-700" };
  }
}

export default function PulseDigest({ digest }: { digest: PulseDigest }) {
  const storyCount = digest.items.length;
  const hasStories = storyCount > 0;
  const summaryTitle = hasStories
    ? `${storyCount} new ${storyCount === 1 ? "story" : "stories"} today`
    : "No new stories in the last day";
  const summaryBody = hasStories
    ? digest.headline || "Fresh updates from the latest sweep."
    : "The scanner did not surface anything new this run. Check back after the next pulse.";
  const detailCopy = hasStories ? digest.overview : "";
  const sentimentScore = digest.sentiment?.score ?? digest.vibe.raw_score ?? digest.vibe.score ?? 0;
  const rationale = digest.sentiment?.rationale || digest.vibe.rationale;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(240px,300px)_1fr]">
        <div className="space-y-4">
          <RetroVibeGauge score={sentimentScore} />
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm text-slate-600 shadow-sm">
            <p className="font-semibold uppercase tracking-[0.25em] text-slate-500">Rationale</p>
            <p className="mt-2 leading-relaxed">{rationale}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
            <span className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2">
              {digest.stories_featured} stories
            </span>
            <span className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2">
              Window {digest.window_hours}h
            </span>
          </div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Daily Pulse
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">{summaryTitle}</h2>
          <p className="mt-3 text-base font-medium text-slate-700">{summaryBody}</p>
          {detailCopy ? (
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{detailCopy}</p>
          ) : null}
          {hasStories && digest.call_to_action ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              {digest.call_to_action}
            </div>
          ) : null}
        </div>
      </div>

      <section>
        <h3 className="text-lg font-semibold text-slate-900">Today&apos;s Headlines</h3>
        {hasStories ? (
          <div className="mt-4 space-y-4">
            {digest.items.map((item) => {
              const sentiment = sentimentBadge(item.sentiment);
              const priority = priorityBadge(item.priority);
              return (
                <article
                  key={item.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-xl font-semibold text-slate-900">
                      {item.link ? (
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-slate-700 hover:underline"
                        >
                          {item.title}
                        </a>
                      ) : (
                        item.title
                      )}
                    </h4>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wide ${priority.className}`}
                    >
                      {priority.label}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">
                    {item.ai_summary || item.excerpt || "No summary available for this story yet."}
                  </p>
                  {item.community_impact ? (
                    <p className="mt-2 text-sm text-slate-500">
                      <span className="font-semibold text-slate-600">Impact:</span> {item.community_impact}
                    </p>
                  ) : null}
                  <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600">
                      {item.source.name}
                    </span>
                    <span className={`rounded-full px-3 py-1 font-medium ${sentiment.className}`}>
                      {sentiment.label}
                    </span>
                    <span>{formatPublished(item.published)}</span>
                    {item.tags?.length ? (
                      <span>
                        Tags:{" "}
                        {item.tags.map((tag) => (
                          <span key={tag} className="mr-1 inline-block">
                            #{tag}
                          </span>
                        ))}
                      </span>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500">No fresh stories surfaced in the latest window.</p>
        )}
      </section>
    </div>
  );
}
