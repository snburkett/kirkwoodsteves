import fs from "node:fs/promises";
import path from "node:path";

import matter from "gray-matter";
import { z } from "zod";

import type {
  AIFrontMatter,
  EmporiumFrontMatter,
  FrontMatter,
  OdditiesFrontMatter,
  Post,
  PulseFrontMatter,
  SectionName,
} from "./types";

const CONTENT_ROOT = path.join(process.cwd(), "content");
const SLUG_REGEX = /^[a-z0-9-]+$/;

const isoDate = z
  .union([z.string(), z.date()])
  .transform((value) => {
    const date = typeof value === "string" ? new Date(value) : value;
    if (Number.isNaN(date.getTime())) {
      throw new Error(`Invalid date value: ${value}`);
    }
    return date.toISOString();
  });

const baseFrontMatter = z.object({
  title: z.string().min(1, "title is required"),
  slug: z
    .string()
    .min(1, "slug is required")
    .regex(SLUG_REGEX, "slug must be lowercase letters, numbers or hyphen"),
  date: isoDate,
  tags: z.array(z.string().min(1)).optional(),
});

const emporiumSchema = baseFrontMatter.extend({
  type: z.literal("emporium"),
  priceUSD: z.coerce.number(),
  condition: z.string().min(1, "condition is required"),
  images: z.array(z.string()).default([]),
  status: z.enum(["available", "pending", "sold"]).default("available"),
});

const pulseSchema = baseFrontMatter.extend({
  type: z.literal("pulse"),
  sourceUrl: z.string().url("sourceUrl must be a valid URL"),
});

const aiSchema = baseFrontMatter.extend({
  type: z.literal("ai"),
  attachments: z.array(z.string()).optional(),
});

const odditiesSchema = baseFrontMatter.extend({
  type: z.literal("oddities"),
});

const frontMatterSchema = z.discriminatedUnion("type", [
  emporiumSchema,
  pulseSchema,
  aiSchema,
  odditiesSchema,
]);

type ParsedFrontMatter = z.infer<typeof frontMatterSchema>;

function resolveSection(section: SectionName): string {
  return path.join(CONTENT_ROOT, section);
}

export function listSections(): SectionName[] {
  return ["emporium", "pulse", "ai", "oddities"];
}

export function parseFrontMatter(raw: string, filePath?: string): {
  frontMatter: FrontMatter;
  body: string;
} {
  const parsed = matter(raw);
  const data = parsed.data ?? {};
  const result = frontMatterSchema.safeParse(data);

  if (!result.success) {
    const location = filePath ? ` in ${filePath}` : "";
    throw new Error(
      `Invalid front-matter${location}: ${result.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join(", ")}`,
    );
  }

  const coerced = applyDefaults(result.data);

  return {
    frontMatter: coerced,
    body: parsed.content.trim(),
  };
}

function applyDefaults(data: ParsedFrontMatter): FrontMatter {
  switch (data.type) {
    case "emporium": {
      const hydrated: EmporiumFrontMatter = {
        ...data,
        images: data.images ?? [],
        status: data.status ?? "available",
      };
      return hydrated;
    }
    case "pulse": {
      const hydrated: PulseFrontMatter = { ...data };
      return hydrated;
    }
    case "ai": {
      const hydrated: AIFrontMatter = { ...data };
      return hydrated;
    }
    case "oddities": {
      const hydrated: OdditiesFrontMatter = { ...data };
      return hydrated;
    }
    default: {
      const neverType: never = data;
      return neverType;
    }
  }
}

export async function loadSection(section: SectionName): Promise<Post[]> {
  const sectionDir = resolveSection(section);
  let entries: string[] = [];

  try {
    entries = await fs.readdir(sectionDir);
  } catch (error) {
    throw new Error(`Unable to read section directory ${section}: ${String(error)}`);
  }

  const posts: Post[] = [];

  await Promise.all(
    entries
      .filter((entry) => entry.endsWith(".mdx"))
      .map(async (entry) => {
        const slug = entry.replace(/\.mdx$/, "");
        const post = await loadPost(section, slug);
        posts.push(post);
      }),
  );

  return posts.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function loadPost(section: SectionName, slug: string): Promise<Post> {
  if (!SLUG_REGEX.test(slug)) {
    throw new Error(`Invalid slug: ${slug}`);
  }

  const filePath = path.join(resolveSection(section), `${slug}.mdx`);
  const raw = await fs.readFile(filePath, "utf8");
  const { frontMatter, body } = parseFrontMatter(raw, filePath);

  if (frontMatter.type !== section) {
    throw new Error(
      `Front-matter type "${frontMatter.type}" does not match directory "${section}" in ${filePath}`,
    );
  }

  if (frontMatter.slug !== slug) {
    throw new Error(`Front-matter slug mismatch for ${filePath}`);
  }

  return {
    ...frontMatter,
    section,
    body,
    filePath,
  };
}
