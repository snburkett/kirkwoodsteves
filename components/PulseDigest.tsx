import VibeOMeter from "@/components/VibeOMeter";
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
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(240px,300px)_1fr]">
        <VibeOMeter
          vibe={digest.vibe}
          updatedAt={digest.generated_at}
          windowHours={digest.window_hours}
          storiesFeatured={digest.stories_featured}
          variant="full"
        />
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Latest Pulse
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">{digest.headline}</h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">{digest.overview}</p>
          {digest.call_to_action ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              {digest.call_to_action}
            </div>
          ) : null}
        </div>
      </div>

      <section>
        <h3 className="text-lg font-semibold text-slate-900">Stories worth a look</h3>
        <div className="mt-4 space-y-4">
          {digest.items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
              No fresh stories surfaced in the latest window. The bot will try again next run.
            </div>
          ) : (
            digest.items.map((item) => {
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
            })
          )}
        </div>
      </section>
    </div>
  );
}
