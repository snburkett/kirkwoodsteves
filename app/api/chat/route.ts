import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  prompt: z.string().min(1).max(2000),
});

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = bodySchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  }

  // TODO: enforce per-IP rate limits before enabling real inference.

  return NextResponse.json({
    answer: "stub",
    citations: [],
    prompt: result.data.prompt,
  });
}
