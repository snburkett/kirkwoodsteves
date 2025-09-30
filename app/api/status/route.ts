import fs from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

const REPORTS_DIR = path.join(process.cwd(), "content", "_reports");

export async function GET() {
  try {
    const entries = await fs.readdir(REPORTS_DIR);
    const files = entries.filter((entry) => !entry.startsWith("."));

    if (files.length === 0) {
      return NextResponse.json({ lastRun: null });
    }

    const stats = await Promise.all(
      files.map(async (file) => {
        const fullPath = path.join(REPORTS_DIR, file);
        const stat = await fs.stat(fullPath);
        return { file, mtimeMs: stat.mtimeMs };
      }),
    );

    const latest = stats.reduce((acc, curr) => (curr.mtimeMs > acc.mtimeMs ? curr : acc));

    return NextResponse.json({
      lastRun: {
        file: latest.file,
        updatedAt: new Date(latest.mtimeMs).toISOString(),
      },
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return NextResponse.json({ lastRun: null });
    }
    console.error("status route error", error);
    return NextResponse.json({ error: "Unable to read status" }, { status: 500 });
  }
}
