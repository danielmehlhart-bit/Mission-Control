import { NextResponse } from "next/server";

import { parseJsonBody, voiceErrorResponse } from "@/lib/voice/api";
import { getVoiceHandoffForSession, prepareVoiceHandoff, serializeVoiceHandoff } from "@/lib/voice/handoffs";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: { id: string } }) {
  try {
    const handoff = getVoiceHandoffForSession(context.params.id);
    return NextResponse.json({
      handoff: handoff ? serializeVoiceHandoff(handoff) : null,
    });
  } catch (error) {
    return voiceErrorResponse(error);
  }
}

export async function POST(request: Request, context: { params: { id: string } }) {
  try {
    const body = await parseJsonBody(request);
    const handoff = prepareVoiceHandoff({
      sessionId: context.params.id,
      memoryPath: typeof body.memoryPath === "string" && body.memoryPath.trim() ? body.memoryPath.trim() : null,
      summary: typeof body.summary === "string" && body.summary.trim() ? body.summary : null,
    });

    return NextResponse.json({
      handoff: serializeVoiceHandoff(handoff),
    }, { status: 201 });
  } catch (error) {
    return voiceErrorResponse(error);
  }
}
