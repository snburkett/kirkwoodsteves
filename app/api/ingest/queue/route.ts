import { NextResponse } from "next/server";
import { z } from "zod";

const payloadSchema = z.object({
  sources: z.array(z.string().min(1)).min(1),
  mode: z.enum(["feeds", "scrape"]).optional(),
});

export async function POST(request: Request) {
  let json: unknown;

  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = payloadSchema.safeParse(json);

  if (!result.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // TODO: queue ingestion job once workers land in the platform service.
  const jobId = `stub-${Date.now()}`;

  return NextResponse.json({
    accepted: true,
    jobId,
    mode: result.data.mode ?? "feeds",
    sources: result.data.sources,
  });
}
