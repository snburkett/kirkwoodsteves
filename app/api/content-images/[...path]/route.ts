import fs from "node:fs/promises";
import path from "node:path";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const CONTENT_ROOT = path.join(process.cwd(), "content");
const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
};

export async function GET(
  _request: NextRequest,
  { params }: { params: { path?: string[] } },
) {
  const segments = params.path ?? [];

  if (segments.length === 0) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  const decodedSegments = segments.map((segment) => decodeURIComponent(segment));
  const resolvedPath = path.join(CONTENT_ROOT, ...decodedSegments);
  const normalizedPath = path.normalize(resolvedPath);

  if (!normalizedPath.startsWith(CONTENT_ROOT)) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  const extension = path.extname(normalizedPath).toLowerCase();
  const contentType = MIME_TYPES[extension];

  if (!contentType) {
    return NextResponse.json({ error: "Unsupported Media Type" }, { status: 415 });
  }

  try {
    const data = await fs.readFile(normalizedPath);

    return new NextResponse(data, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    console.error(`Failed to read content image ${normalizedPath}:`, error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
