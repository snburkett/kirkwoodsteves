import { NextResponse } from "next/server";
import { z } from "zod";

import { getSignatureHeaderName, verifyRunSignature } from "@/lib/auth";

const payloadSchema = z
  .object({
    runId: z.string().optional(),
    sources: z.array(z.string().min(1)).optional(),
    mode: z.enum(["feeds", "scrape"]).optional(),
  })
  .default({});

export async function POST(request: Request) {
  const signature = request.headers.get(getSignatureHeaderName());
  const rawBody = await request.text();

  try {
    if (!verifyRunSignature(signature, rawBody)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } catch (error) {
    console.error("ingest run signature failure", error);
    return NextResponse.json({ error: "Misconfigured signature" }, { status: 500 });
  }

  let parsed: unknown = {};

  if (rawBody.trim().length > 0) {
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
  }

  const result = payloadSchema.safeParse(parsed);

  if (!result.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // TODO: trigger orchestrator for background ingestion runs.
  return NextResponse.json({
    started: true,
    runId: result.data.runId ?? `manual-${Date.now()}`,
    mode: result.data.mode ?? "feeds",
  });
}
