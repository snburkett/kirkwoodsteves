import fs from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";
import { z } from "zod";

import type { SearchIndexItem } from "@/lib/types";

const INDEX_PATH = path.join(process.cwd(), "content", "_index", "all.json");
const querySchema = z
  .string()
  .min(2, "Query must be at least 2 characters")
  .max(200, "Query is too long");

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawQuery = searchParams.get("q") ?? "";

  const result = querySchema.safeParse(rawQuery.trim());

  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0]?.message ?? "Invalid query" }, { status: 400 });
  }

  const query = result.data.toLowerCase();

  let entries: SearchIndexItem[] = [];

  try {
    const file = await fs.readFile(INDEX_PATH, "utf8");
    entries = JSON.parse(file) as SearchIndexItem[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error("search route error", error);
      return NextResponse.json({ error: "Unable to read index" }, { status: 500 });
    }
  }

  const results = entries
    .filter((item) =>
      item.title.toLowerCase().includes(query) || item.slug.toLowerCase().includes(query),
    )
    .slice(0, 20);

  return NextResponse.json({
    query,
    results,
  });
}
