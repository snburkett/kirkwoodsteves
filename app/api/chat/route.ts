// Server-side proxy for the AI chat bubble.
// Required env vars:
//   OPENAI_API_KEY – OpenAI secret (server only)
// Optional request body properties:
//   model – override the default model (defaults to gpt-4o-mini)
//   tools – array of tool definitions (forwarded to OpenAI as-is)
// Local testing: set env vars, run `npm run dev`, click the robot to chat.
// Vercel deploy: add env vars in Project Settings; no additional setup needed.

import OpenAI from "openai";
import type {
  EasyInputMessage,
  Tool,
} from "openai/resources/responses/responses";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

type ChatRole = "system" | "user" | "assistant";

const DEFAULT_MODEL = "gpt-4o-mini";

function normalizeMessages(value: unknown): EasyInputMessage[] | null {
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }

  const normalized: EasyInputMessage[] = [];

  for (const entry of value) {
    if (!entry || typeof entry !== "object") {
      return null;
    }

    const role = (entry as { role?: unknown }).role;
    const content = (entry as { content?: unknown }).content;

    if (role !== "system" && role !== "user" && role !== "assistant") {
      return null;
    }

    if (typeof content !== "string" || !content.trim()) {
      return null;
    }

    normalized.push({
      role: role as ChatRole,
      content: content.slice(0, 16_000),
    });
  }

  return normalized;
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const expectedOrigin = new URL(request.url).origin;

  if (origin && origin !== expectedOrigin) {
    return new Response("Origin not allowed", { status: 403 });
  }

  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY is not configured");
    return new Response("Server misconfigured", { status: 500 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch (error) {
    console.error("Failed to parse /api/chat body", error);
    return new Response("Invalid JSON payload", { status: 400 });
  }

  const { messages, model, tools } = (body ?? {}) as {
    messages?: unknown;
    model?: unknown;
    tools?: unknown;
  };

  const normalizedMessages = normalizeMessages(messages);

  if (!normalizedMessages) {
    return new Response("Invalid 'messages'", { status: 400 });
  }

  const useModel =
    typeof model === "string" && model.trim().length > 0
      ? model.trim()
      : DEFAULT_MODEL;

  const toolDefinitions: Tool[] | undefined = Array.isArray(tools)
    ? (tools as Tool[])
    : undefined;

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  try {
    const stream = await client.responses.stream({
      model: useModel,
      input: normalizedMessages,
      ...(toolDefinitions ? { tools: toolDefinitions } : {}),
    });

    const readable = toSseReadableStream(stream);

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("OpenAI streaming request failed", error);

    if (error instanceof OpenAI.APIError) {
      const message =
        error.error?.message ||
        error.message ||
        "OpenAI API request failed";
      return new Response(message, { status: error.status ?? 500 });
    }

    return new Response("Server error", { status: 500 });
  }
}

function toSseReadableStream(stream: unknown): ReadableStream<Uint8Array> {
  if (stream && typeof (stream as { toReadableStream?: unknown }).toReadableStream === "function") {
    return (stream as { toReadableStream: () => ReadableStream<Uint8Array> }).toReadableStream();
  }

  if (!stream || typeof (stream as { [Symbol.asyncIterator]?: unknown })[Symbol.asyncIterator] !== "function") {
    throw new TypeError("OpenAI stream is not iterable");
  }

  const encoder = new TextEncoder();
  const iterator = (stream as { [Symbol.asyncIterator]: () => AsyncIterableIterator<unknown> })[Symbol.asyncIterator]();

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { value, done } = await iterator.next();
        if (done) {
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
          return;
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(value)}\n\n`));
      } catch (error) {
        controller.error(error);
      }
    },
    async cancel(reason) {
      if (typeof (stream as { abort?: (r?: unknown) => void }).abort === "function") {
        (stream as { abort: (r?: unknown) => void }).abort(reason);
      } else if (typeof iterator.return === "function") {
        await iterator.return();
      }
    },
  });
}
