import fs from "node:fs/promises";
import path from "node:path";

import { unstable_noStore as noStore } from "next/cache";
import { z } from "zod";

const PULSE_JSON_PATH = path.join(process.cwd(), "content", "pulse", "latest.json");

const vibeSchema = z.object({
  score: z.coerce.number().min(0).max(100),
  label: z.string(),
  rationale: z.string(),
  raw_score: z.coerce.number().min(-100).max(100).optional(),
});

const sentimentSchema = z.object({
  score: z.coerce.number().min(-100).max(100),
  label: z.string(),
  rationale: z.string(),
});

const storySchema = z
  .object({
    id: z.string(),
    source: z.object({
      id: z.string(),
      name: z.string(),
    }),
    title: z.string(),
    link: z.union([z.string().url(), z.literal("")]).default(""),
    published: z.string(),
    excerpt: z.string().default(""),
    tags: z.array(z.string()).default([]),
    ai_summary: z.string().default(""),
    sentiment: z.enum(["positive", "neutral", "negative"]).default("neutral"),
    sentiment_score: z.coerce.number().min(-100).max(100).default(0),
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
  generated_at: z.union([z.string(), z.null()]).nullable(),
  window_hours: z.coerce.number().default(36),
  stories_considered: z.coerce.number().default(0),
  stories_featured: z.coerce.number().default(0),
  headline: z.string().default("Kirkwood Pulse is warming up"),
  overview: z.string().default(""),
  items: z.array(storySchema).default([]),
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

export type PulseDigest = z.infer<typeof pulseDigestSchema>;
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

export async function loadPulseDigest(): Promise<PulseDigest> {
  noStore();
  try {
    const raw = await fs.readFile(PULSE_JSON_PATH, "utf8");
    const data = JSON.parse(raw);
    return pulseDigestSchema.parse(data);
  } catch (error) {
    console.warn(`Falling back to default pulse digest: ${String(error)}`);
    return FALLBACK_DIGEST;
  }
}
