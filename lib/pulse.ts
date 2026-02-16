import fs from "node:fs/promises";
import path from "node:path";

import { unstable_noStore as noStore } from "next/cache";
import { z } from "zod";

const PULSE_JSON_PATH = path.join(process.cwd(), "content", "pulse", "latest.json");

const nullableNumber = (schema: z.ZodNumber) =>
  z.preprocess((value) => (value === null || value === "" ? undefined : value), schema);

const vibeSchema = z.object({
  score: nullableNumber(z.coerce.number().min(0).max(100)).default(55),
  label: z.string().default("Even keel"),
  rationale: z.string().default("Awaiting the first automated scan."),
  raw_score: nullableNumber(z.coerce.number().min(-100).max(100)).default(0),
});

const sentimentSchema = z.object({
  score: nullableNumber(z.coerce.number().min(-100).max(100)).default(0),
  label: z.string().default("Even keel"),
  rationale: z.string().default("Awaiting the first automated scan."),
});

const storySchema = z
  .object({
    id: z.string().default(""),
    source: z
      .object({
        id: z.string().default(""),
        name: z.string().default("Kirkwood Pulse"),
      })
      .default({ id: "", name: "Kirkwood Pulse" }),
    title: z.string().default("Untitled story"),
    link: z
      .union([z.string().url(), z.literal(""), z.null()])
      .optional()
      .default(""),
    published: z.string().optional().default(""),
    excerpt: z.string().default(""),
    tags: z.array(z.string()).default([]),
    ai_summary: z.string().default(""),
    sentiment: z.enum(["positive", "neutral", "negative"]).default("neutral"),
    sentiment_score: nullableNumber(z.coerce.number().min(-100).max(100)).default(0),
    community_impact: z.string().default(""),
    priority: z.enum(["high", "medium", "low"]).default("medium"),
    suggested_action: z.string().nullable().optional(),
  })
  .transform((story) => ({
    ...story,
    // Normalize empty links to undefined for easier consumer handling.
    link: story.link || undefined,
  }));

const pulseDigestSchema = z.object({
  generated_at: z.union([z.string(), z.null()]).nullable().default(null),
  window_hours: nullableNumber(z.coerce.number().min(1).max(168)).default(36),
  stories_considered: nullableNumber(z.coerce.number().min(0)).default(0),
  stories_featured: nullableNumber(z.coerce.number().min(0)).default(0),
  headline: z.string().default("Kirkwood Pulse is warming up"),
  overview: z.string().default(""),
  items: z.array(z.unknown()).default([]),
  vibe: vibeSchema.default({
    score: 55,
    label: "Even keel",
    rationale: "Awaiting the first automated scan.",
    raw_score: 0,
  }),
  sentiment: sentimentSchema.default({
    score: 0,
    label: "Even keel",
    rationale: "Awaiting the first automated scan.",
  }),
  call_to_action: z.string().default(""),
});

export type PulseDigest = Omit<z.infer<typeof pulseDigestSchema>, "items"> & {
  items: PulseStory[];
};
export type PulseStory = z.infer<typeof storySchema>;
export type PulseVibe = z.infer<typeof vibeSchema>;
export type PulseSentiment = z.infer<typeof sentimentSchema>;

const FALLBACK_DIGEST: PulseDigest = {
  generated_at: null,
  window_hours: 36,
  stories_considered: 0,
  stories_featured: 0,
  headline: "Kirkwood Pulse is warming up",
  overview:
    "The daily briefing system is setting up. Once the first scheduled run completes, summaries from local sources within the last 36 hours will appear here.",
  items: [],
  vibe: {
    score: 55,
    label: "Even keel",
    rationale: "Awaiting the first automated scan.",
    raw_score: 0,
  },
  sentiment: {
    score: 0,
    label: "Even keel",
    rationale: "Awaiting the first automated scan.",
  },
  call_to_action: "Check back after the next morning run for fresh civic signals.",
};

function coerceStories(items: unknown[]): PulseStory[] {
  const stories: PulseStory[] = [];
  for (const item of items) {
    const parsed = storySchema.safeParse(item);
    if (parsed.success) {
      stories.push(parsed.data);
    } else {
      console.warn(
        `Skipping invalid pulse story: ${parsed.error.issues
          .map((issue) => `${issue.path.join(".") || "story"}: ${issue.message}`)
          .join(", ")}`,
      );
    }
  }
  return stories;
}

export async function loadPulseDigest(): Promise<PulseDigest> {
  noStore();
  try {
    const raw = await fs.readFile(PULSE_JSON_PATH, "utf8");
    const data = JSON.parse(raw);
    const parsed = pulseDigestSchema.parse(data);
    const items = Array.isArray(parsed.items) ? parsed.items : [];
    const stories = coerceStories(items);
    return {
      ...parsed,
      items: stories,
      stories_featured:
        parsed.stories_featured > 0 ? parsed.stories_featured : stories.length,
    };
  } catch (error) {
    console.warn(`Falling back to default pulse digest: ${String(error)}`);
    return FALLBACK_DIGEST;
  }
}
