import { NextResponse } from "next/server";

import { parseJsonBody, serializeVoiceSession, voiceErrorResponse } from "@/lib/voice/api";
import { endSession } from "@/lib/voice/service";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: { id: string } }) {
  try {
    const body = await parseJsonBody(request);
    const session = await endSession({
      sessionId: context.params.id,
      reason: typeof body.reason === "string" ? body.reason : "voice-ended",
    });

    return NextResponse.json({
      session: serializeVoiceSession(session),
    });
  } catch (error) {
    return voiceErrorResponse(error);
  }
}
