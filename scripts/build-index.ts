import fs from "node:fs/promises";
import path from "node:path";

import { parseFrontMatter, listSections } from "../lib/content";
import type { SearchIndexItem, SectionName } from "../lib/types";

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const items: SearchIndexItem[] = [];

  for (const section of listSections()) {
    const sectionItems = await readSection(section);
    items.push(...sectionItems);
  }

  if (dryRun) {
    console.log(`Validated ${items.length} content item(s).`);
    return;
  }

  const indexDir = path.join(process.cwd(), "content", "_index");
  await fs.mkdir(indexDir, { recursive: true });
  const indexPath = path.join(indexDir, "all.json");
  await fs.writeFile(indexPath, JSON.stringify(items, null, 2));
  console.log(`Wrote ${items.length} item(s) to ${path.relative(process.cwd(), indexPath)}`);
}

async function readSection(section: SectionName): Promise<SearchIndexItem[]> {
  const sectionDir = path.join(process.cwd(), "content", section);
  let files: string[] = [];

  try {
    files = await fs.readdir(sectionDir);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }

  const items: SearchIndexItem[] = [];

  for (const file of files) {
    if (!file.endsWith(".mdx")) continue;

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

    items.push({
      section,
      slug: frontMatter.slug,
      title: frontMatter.title,
      date: frontMatter.date,
      tags: frontMatter.tags,
      extras: Object.keys(extras).length ? extras : undefined,
    });
  }

  return items;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
