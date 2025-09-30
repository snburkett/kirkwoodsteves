import fs from "node:fs/promises";
import path from "node:path";

import type { SectionName } from "../lib/types";

interface Args {
  section?: string;
  title?: string;
  slug?: string;
  date?: string;
  tags?: string;
  price?: string;
  condition?: string;
  status?: string;
  source?: string;
  attachments?: string;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const section = validateSection(args.section);
  const title = requireArg(args.title, "title");
  const slug = requireArg(args.slug, "slug");
  const date = (args.date ?? new Date().toISOString()).split("T")[0];
  const tags = args.tags ? args.tags.split(",").map((tag) => tag.trim()).filter(Boolean) : undefined;

  const frontMatterEntries: Array<[string, unknown]> = [
    ["type", section],
    ["title", title],
    ["slug", slug],
    ["date", date],
  ];

  if (tags && tags.length > 0) {
    frontMatterEntries.push(["tags", tags]);
  }

  switch (section) {
    case "emporium": {
      const price = Number(requireArg(args.price, "price"));
      if (Number.isNaN(price)) {
        throw new Error("price must be a number");
      }
      frontMatterEntries.push(["priceUSD", price]);
      frontMatterEntries.push(["condition", requireArg(args.condition, "condition")]);
      frontMatterEntries.push(["images", []]);
      const status = args.status ?? "available";
      if (!["available", "pending", "sold"].includes(status)) {
        throw new Error("status must be one of: available, pending, sold");
      }
      frontMatterEntries.push(["status", status]);
      break;
    }
    case "pulse": {
      frontMatterEntries.push(["sourceUrl", requireArg(args.source, "source")]);
      break;
    }
    case "ai": {
      if (args.attachments) {
        frontMatterEntries.push([
          "attachments",
          args.attachments.split(",").map((item) => item.trim()).filter(Boolean),
        ]);
      }
      break;
    }
    case "oddities":
      break;
    default:
      break;
  }

  const contentRoot = path.join(process.cwd(), "content");
  const filePath = path.join(contentRoot, section, `${slug}.mdx`);

  await ensureNotExists(filePath);
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  const frontMatter = formatFrontMatter(frontMatterEntries);
  const body = `---\n${frontMatter}---\n\nTODO body.\n`;

  await fs.writeFile(filePath, body, "utf8");

  console.log(`Created ${path.relative(process.cwd(), filePath)}`);
}

function parseArgs(parts: string[]): Args {
  const result: Record<string, string> = {};

  for (let i = 0; i < parts.length; i += 1) {
    const part = parts[i];
    if (!part.startsWith("--")) {
      continue;
    }
    const [flag, maybeValue] = part.split("=", 2);
    const key = flag.slice(2);
    if (maybeValue !== undefined) {
      result[key] = maybeValue;
      continue;
    }
    const next = parts[i + 1];
    if (next && !next.startsWith("--")) {
      result[key] = next;
      i += 1;
    } else {
      result[key] = "true";
    }
  }

  return result;
}

function requireArg(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`--${name} is required`);
  }
  return value;
}

function validateSection(section?: string): SectionName {
  const sections: SectionName[] = ["emporium", "pulse", "ai", "oddities"];
  if (!section || !sections.includes(section as SectionName)) {
    throw new Error(`--section must be one of: ${sections.join(", ")}`);
  }
  return section as SectionName;
}

async function ensureNotExists(filePath: string) {
  try {
    await fs.access(filePath);
    throw new Error(`File already exists: ${filePath}`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return;
    }
    throw error;
  }
}

function formatFrontMatter(entries: Array<[string, unknown]>): string {
  return entries
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        if (value.length === 0) {
          return `${key}: []\n`;
        }
        const items = value.map((item) => `  - ${escapeString(String(item))}`).join("\n");
        return `${key}:\n${items}\n`;
      }
      if (typeof value === "number" || typeof value === "boolean") {
        return `${key}: ${value}\n`;
      }
      return `${key}: ${escapeString(String(value))}\n`;
    })
    .join("");
}

function escapeString(value: string): string {
  if (/[:#]/.test(value) || value.includes("\"")) {
    const escaped = value.replace(/"/g, '\\"');
    return `"${escaped}"`;
  }
  return value.includes(" ") ? `"${value}"` : value;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
