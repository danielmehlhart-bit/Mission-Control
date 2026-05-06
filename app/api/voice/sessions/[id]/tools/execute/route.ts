import { NextResponse } from "next/server";

import { parseJsonBody, requireString, voiceErrorResponse } from "@/lib/voice/api";
import { executeVoiceToolCall } from "@/lib/voice/tools";

export const dynamic = "force-dynamic";

function parseArguments(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      throw new Error("Invalid tool arguments");
    }
  }
  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  throw new Error("Invalid tool arguments");
}

export async function POST(request: Request, context: { params: { id: string } }) {
  try {
    const body = await parseJsonBody(request);
    const toolName = requireString(body.toolName ?? body.name, "toolName");
    const callId = typeof body.callId === "string" && body.callId.trim() ? body.callId.trim() : null;
    const result = await executeVoiceToolCall({
      sessionId: context.params.id,
      toolName,
      callId,
      arguments: parseArguments(body.arguments),
    });
    const output = JSON.stringify(result);

    return NextResponse.json({
      toolName,
      callId,
      result,
      output,
    });
  } catch (error) {
    return voiceErrorResponse(error);
  }
}
