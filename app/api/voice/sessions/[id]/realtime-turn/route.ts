import { NextResponse } from "next/server";

import { parseJsonBody, requireString, serializeVoiceSession, voiceErrorResponse } from "@/lib/voice/api";
import { recordRealtimeTurn } from "@/lib/voice/service";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: { id: string } }) {
  try {
    const body = await parseJsonBody(request);
    const speaker = body.speaker === "user" || body.speaker === "assistant" ? body.speaker : null;
    if (!speaker) {
      throw new Error("speaker required");
    }
    const text = requireString(body.text, "text");
    const metadata = body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
      ? (body.metadata as Record<string, unknown>)
      : undefined;
    const result = await recordRealtimeTurn({
      sessionId: context.params.id,
      speaker,
      text,
      metadata,
    });

    return NextResponse.json({
      session: serializeVoiceSession(result.session),
      turn: result.turn,
    });
  } catch (error) {
    return voiceErrorResponse(error);
  }
}
