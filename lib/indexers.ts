import fs from "node:fs/promises";
import path from "node:path";

import { parseFrontMatter, listSections } from "./content";
import type { SearchIndexItem, SectionName } from "./types";

const CONTENT_ROOT = path.join(process.cwd(), "content");
const INDEX_ROOT = path.join(CONTENT_ROOT, "_index");

export async function buildAllIndex(): Promise<void> {
  const items: SearchIndexItem[] = [];

  for (const section of listSections()) {
    const sectionItems = await collectSection(section);
    items.push(...sectionItems);
  }

  await fs.mkdir(INDEX_ROOT, { recursive: true });
  const indexPath = path.join(INDEX_ROOT, "all.json");
  await fs.writeFile(indexPath, JSON.stringify(items, null, 2));
}

async function collectSection(section: SectionName): Promise<SearchIndexItem[]> {
  const sectionDir = path.join(CONTENT_ROOT, section);
  let files: string[] = [];

  try {
    files = await fs.readdir(sectionDir);
  } catch (error) {
    // Directory may be empty in early scaffolding.
    return [];
  }

  const entries = await Promise.all(
    files
      .filter((file) => file.endsWith(".mdx"))
      .map(async (file) => {
        const filePath = path.join(sectionDir, file);
        const raw = await fs.readFile(filePath, "utf8");
        const { frontMatter } = parseFrontMatter(raw, filePath);

        const extras: Record<string, unknown> = {};

        if (frontMatter.type === "emporium") {
          extras.priceUSD = frontMatter.priceUSD;
          extras.status = frontMatter.status;
        }

        if (frontMatter.type === "pulse") {
          extras.sourceUrl = frontMatter.sourceUrl;
        }

        return {
          section,
          slug: frontMatter.slug,
          title: frontMatter.title,
          date: frontMatter.date,
          tags: frontMatter.tags,
          extras: Object.keys(extras).length ? extras : undefined,
        } satisfies SearchIndexItem;
      }),
  );

  return entries;
}

// TODO: extend with incremental builders once ingestion jobs land.
