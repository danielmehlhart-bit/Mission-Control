import { NextResponse } from "next/server";

import { parseJsonBody, voiceErrorResponse } from "@/lib/voice/api";
import { persistVoiceSessionMemorySummary } from "@/lib/voice/service";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: { id: string } }) {
  try {
    const body = await parseJsonBody(request);
    const result = await persistVoiceSessionMemorySummary({
      sessionId: context.params.id,
      reason: typeof body.reason === "string" ? body.reason : "voice-ended",
    });

    return NextResponse.json({
      memoryPath: result.memoryPath,
      summary: result.summary,
    });
  } catch (error) {
    return voiceErrorResponse(error);
  }
}
