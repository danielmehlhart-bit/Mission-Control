import { NextResponse } from "next/server";

import { appendVoiceEvent, updateVoiceSessionMute } from "@/lib/voice/session-store";
import { parseJsonBody, requireSession, serializeVoiceSession, voiceErrorResponse } from "@/lib/voice/api";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: { id: string } }) {
  try {
    const session = requireSession(context.params.id);
    const body = await parseJsonBody(request);
    if (typeof body.isMuted !== "boolean") {
      throw new Error("isMuted required");
    }

    if (session.state === "completed" || session.state === "failed" || session.state === "ending") {
      throw new Error(`Voice session ${session.id} is not in a valid state: ${session.state}`);
    }

    const nextSession = updateVoiceSessionMute({
      sessionId: session.id,
      isMuted: body.isMuted,
    });

    appendVoiceEvent({
      sessionId: session.id,
      eventType: body.isMuted ? "audio.mute_enabled" : "audio.mute_disabled",
      fromState: session.state,
      toState: session.state,
      payload: {
        isMuted: body.isMuted,
      },
    });

    return NextResponse.json({
      session: serializeVoiceSession(nextSession),
    });
  } catch (error) {
    return voiceErrorResponse(error);
  }
}
